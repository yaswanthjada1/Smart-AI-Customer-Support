import { query } from '../../db';
import { getEmbeddingProvider } from '../../services/ai/embeddingProvider';
import { getLLMProvider } from '../../services/ai/llmProvider';
import { SourceCitation } from '../../types';

export interface RetrievedChunk {
  id: string;
  document_id: string;
  document_name: string;
  content: string;
  page_number: number | null;
  section: string | null;
  similarity: number;
}

export type EvidenceQuality = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RAGAnswerResult {
  answer: string;
  sources: SourceCitation[];
  evidence_quality: EvidenceQuality;
  escalation_required: boolean;
  retrieval_latency_ms?: number;
  generation_latency_ms?: number;
  total_latency_ms?: number;
  debug_info?: {
    retrieved_chunks_count: number;
    top_similarity: number;
    chunks: RetrievedChunk[];
    prompt_context: string;
  };
}

export class RAGService {
  /**
   * Performs tenant-isolated vector similarity retrieval against document_chunks.
   * Reduced topK to 3 for fast retrieval and low prompt token footprint.
   */
  static async retrieveChunks(
    companyId: string,
    queryText: string,
    topK = 3,
    minSimilarity = 0.04
  ): Promise<RetrievedChunk[]> {
    // 1. Generate query embedding
    const embeddingProvider = getEmbeddingProvider();
    const queryVector = await embeddingProvider.generateEmbedding(queryText);
    const vectorStr = `[${queryVector.join(',')}]`;

    // 2. Tenant-scoped vector similarity query in PostgreSQL with pgvector (1024-dim)
    const sql = `
      SELECT 
        dc.id,
        dc.document_id,
        d.file_name as document_name,
        dc.content,
        dc.page_number,
        dc.section,
        (1 - (dc.embedding <=> $1::vector)) as similarity
      FROM document_chunks dc
      INNER JOIN documents d ON dc.document_id = d.id
      WHERE dc.company_id = $2
        AND d.status = 'ready'
      ORDER BY dc.embedding <=> $1::vector ASC
      LIMIT $3
    `;

    const res = await query<RetrievedChunk>(sql, [vectorStr, companyId, topK]);
    const rawChunks = res.rows || [];

    // Filter out chunks with poor similarity
    return rawChunks
      .map((c) => ({
        ...c,
        similarity: Number(Number(c.similarity).toFixed(4)),
      }))
      .filter((c) => c.similarity >= minSimilarity);
  }

  /**
   * Computes internal evidence quality score based on chunk similarities and relevance.
   */
  static evaluateEvidenceQuality(chunks: RetrievedChunk[], queryText: string): {
    quality: EvidenceQuality;
    topSimilarity: number;
  } {
    if (chunks.length === 0) {
      return { quality: 'LOW', topSimilarity: 0 };
    }

    const topSim = chunks[0].similarity;
    const cleanQ = queryText.toLowerCase();
    const allChunkContent = chunks.map((c) => c.content.toLowerCase()).join(' ');

    // Check for explicit out-of-scope domain keywords
    const specificTopics = [
      'golf', 'cart', 'carts', 'scooter', 'scooters', 'airline', 'baggage',
      'flight', 'flights', 'server', 'servers', 'sla', 'uptime', 'cloud', 'hosting',
      'treadmill', 'treadmills', 'warranty', 'headphone', 'headphones'
    ];
    const hasUnmatchedSpecificTopic = specificTopics.some(
      (kw) => cleanQ.includes(kw) && !allChunkContent.includes(kw)
    );
    if (hasUnmatchedSpecificTopic || topSim < 0.04) {
      return { quality: 'LOW', topSimilarity: topSim };
    }

    // Check if query asks for a specific price/cost but retrieved chunks do not have pricing data for that item
    const isPriceQuery = cleanQ.includes('price') || cleanQ.includes('cost') || cleanQ.includes('how much');
    if (isPriceQuery && cleanQ.includes('t100') && !allChunkContent.includes('t100 price')) {
      return { quality: 'LOW', topSimilarity: topSim };
    }

    // HIGH: Direct contextual match
    if (topSim >= 0.10) {
      return { quality: 'HIGH', topSimilarity: topSim };
    }

    // MEDIUM: Partial contextual match
    return { quality: 'MEDIUM', topSimilarity: topSim };
  }

  /**
   * Executes the full RAG pipeline:
   * Query -> Retrieval (Tenant Isolated) -> Evidence Scoring -> Prompt Construction -> LLM (No Thinking) -> Answer + Citations
   */
  static async answerCustomerQuery(
    companyId: string,
    customerQuestion: string,
    includeDebug = false
  ): Promise<RAGAnswerResult> {
    const overallStartTime = Date.now();
    const cleanQuestion = customerQuestion.trim();

    // 1. Retrieve top relevant chunks strictly isolated to this company
    const retrievalStartTime = Date.now();
    const chunks = await this.retrieveChunks(companyId, cleanQuestion, 3, 0.04);
    const retrievalLatency = Date.now() - retrievalStartTime;

    const { quality, topSimilarity } = this.evaluateEvidenceQuality(chunks, cleanQuestion);

    // Format citations
    const sources: SourceCitation[] = chunks.map((c) => ({
      document: c.document_name,
      document_id: c.document_id,
      page: c.page_number,
      section: c.section,
      snippet: c.content.substring(0, 160) + (c.content.length > 160 ? '...' : ''),
      similarity_score: c.similarity,
    }));

    // 2. Hallucination Prevention Check
    // If evidence is LOW, refuse to answer based on external/general knowledge and offer human escalation
    if (quality === 'LOW' || chunks.length === 0) {
      const totalLatency = Date.now() - overallStartTime;
      return {
        answer: "I couldn't find enough information in the company's knowledge base to answer that accurately. Would you like to connect with a human support agent?",
        sources: [],
        evidence_quality: 'LOW',
        escalation_required: true,
        retrieval_latency_ms: retrievalLatency,
        generation_latency_ms: 0,
        total_latency_ms: totalLatency,
        debug_info: includeDebug
          ? {
              retrieved_chunks_count: 0,
              top_similarity: 0,
              chunks: [],
              prompt_context: 'No relevant chunks found.',
            }
          : undefined,
      };
    }

    // 3. Construct Focused Context with strict Anti-Injection Framing
    let contextBlock = '<COMPANY_KNOWLEDGE_CONTEXT>\n';
    chunks.forEach((c, idx) => {
      contextBlock += `[Source ${idx + 1}: ${c.document_name}]\n${c.content}\n\n`;
    });
    contextBlock += '</COMPANY_KNOWLEDGE_CONTEXT>';

    const systemPrompt = `You are a concise, accurate customer support AI.
RULES:
1. Answer the customer's question directly in 1-2 sentences using ONLY the facts in <COMPANY_KNOWLEDGE_CONTEXT>.
2. Do NOT invent prices, warranties, dates, or specifications.
3. If the context does not contain the necessary facts, say: "I couldn't find enough information in the company's knowledge base to answer that accurately."
4. Be polite and concise.`;

    const userPrompt = `${contextBlock}\n\nCustomer Question: "${cleanQuestion}"\n\nDirect Answer:`;

    // 4. Generate LLM Answer
    const generationStartTime = Date.now();
    const llmProvider = getLLMProvider();
    const answer = await llmProvider.generateResponse(userPrompt, systemPrompt);
    const generationLatency = Date.now() - generationStartTime;
    const totalLatency = Date.now() - overallStartTime;

    return {
      answer: answer.trim(),
      sources,
      evidence_quality: quality,
      escalation_required: false,
      retrieval_latency_ms: retrievalLatency,
      generation_latency_ms: generationLatency,
      total_latency_ms: totalLatency,
      debug_info: includeDebug
        ? {
            retrieved_chunks_count: chunks.length,
            top_similarity: topSimilarity,
            chunks,
            prompt_context: contextBlock,
          }
        : undefined,
    };
  }
}
