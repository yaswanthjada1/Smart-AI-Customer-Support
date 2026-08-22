import { query } from '../../db';
import { StorageService } from '../../services/storage/storageService';
import { DocumentExtractor } from '../../utils/extractors';
import { TextChunker } from '../../utils/chunker';
import { getEmbeddingProvider } from '../../services/ai/embeddingProvider';
import { Document, DocumentChunk, DocumentStatus } from '../../types';

export class DocumentService {
  /**
   * Uploads and initiates processing for a new document.
   */
  static async uploadAndProcessDocument(
    companyId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    waitForIndexing = false
  ): Promise<Document> {
    // 1. Save file to storage
    const stored = await StorageService.saveFile(
      companyId,
      file.originalname,
      file.buffer,
      file.mimetype
    );

    // 2. Insert document record with status = 'uploading'
    const docRes = await query<Document>(
      `INSERT INTO documents (company_id, file_name, storage_path, file_type, file_size, status)
       VALUES ($1, $2, $3, $4, $5, 'uploading')
       RETURNING id, company_id, file_name, storage_path, file_type, file_size, status, error_message, created_at, updated_at`,
      [companyId, file.originalname, stored.storagePath, file.mimetype, file.size]
    );

    const document = docRes.rows[0];

    // 3. Trigger ingestion pipeline
    const processPromise = this.processDocument(document.id, companyId, stored.storagePath, file.mimetype).catch((err) => {
      console.error(`[DocumentService] Async processing error for doc ${document.id}:`, err);
    });

    if (waitForIndexing) {
      await processPromise;
    }

    return document;
  }

  /**
   * Core Document Ingestion Pipeline:
   * Document -> Text extraction -> Cleaning -> Chunking -> Embeddings -> pgvector -> Ready
   */
  static async processDocument(
    documentId: string,
    companyId: string,
    storagePath: string,
    fileType: string
  ): Promise<void> {
    try {
      // Step 1: Update status to 'processing'
      await query(
        "UPDATE documents SET status = 'processing', updated_at = NOW() WHERE id = $1 AND company_id = $2",
        [documentId, companyId]
      );

      // Step 2: Read file buffer & Extract text
      const buffer = await StorageService.readFile(storagePath);
      const extracted = await DocumentExtractor.extract(buffer, fileType);

      if (!extracted.fullText || extracted.fullText.trim().length === 0) {
        throw new Error('No readable text could be extracted from this document.');
      }

      // Step 3: Update status to 'indexing'
      await query(
        "UPDATE documents SET status = 'indexing', updated_at = NOW() WHERE id = $1 AND company_id = $2",
        [documentId, companyId]
      );

      // Step 4: Chunk document structure-aware
      const chunks = TextChunker.chunkDocument(extracted, {
        maxChunkSize: 700,
        chunkOverlap: 100,
      });

      if (chunks.length === 0) {
        throw new Error('Document produced 0 valid text chunks.');
      }

      // Step 5: Generate Vector Embeddings
      const embeddingProvider = getEmbeddingProvider();
      const texts = chunks.map((c) => c.content);
      const embeddings = await embeddingProvider.generateEmbeddings(texts);

      // Delete existing chunks if re-indexing
      await query(
        'DELETE FROM document_chunks WHERE document_id = $1 AND company_id = $2',
        [documentId, companyId]
      );

      // Step 6: Batch insert into document_chunks with pgvector
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vectorStr = `[${embeddings[i].join(',')}]`;

        await query(
          `INSERT INTO document_chunks (company_id, document_id, content, embedding, page_number, section, metadata)
           VALUES ($1, $2, $3, $4::vector, $5, $6, $7)`,
          [
            companyId,
            documentId,
            chunk.content,
            vectorStr,
            chunk.pageNumber,
            chunk.section,
            JSON.stringify(chunk.metadata || {}),
          ]
        );
      }

      // Step 7: Update document status to 'ready'
      await query(
        "UPDATE documents SET status = 'ready', error_message = NULL, updated_at = NOW() WHERE id = $1 AND company_id = $2",
        [documentId, companyId]
      );

      console.log(`[DocumentService] Document ${documentId} indexed successfully (${chunks.length} chunks).`);
    } catch (err: any) {
      console.error(`[DocumentService] Ingestion failed for document ${documentId}:`, err);
      await query(
        "UPDATE documents SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3",
        [err.message || 'Unknown processing error', documentId, companyId]
      );
    }
  }

  /**
   * Lists all documents belonging to a specific company workspace.
   */
  static async getCompanyDocuments(companyId: string): Promise<(Document & { chunk_count: number })[]> {
    const res = await query<Document & { chunk_count: number }>(
      `SELECT d.id, d.company_id, d.file_name, d.storage_path, d.file_type, d.file_size, d.status, d.error_message, d.created_at, d.updated_at,
              COALESCE(COUNT(dc.id), 0)::int as chunk_count
       FROM documents d
       LEFT JOIN document_chunks dc ON d.id = dc.document_id
       WHERE d.company_id = $1
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [companyId]
    );
    return res.rows;
  }

  /**
   * Retrieves single document with its chunks.
   */
  static async getDocumentWithChunks(
    companyId: string,
    documentId: string
  ): Promise<{ document: Document; chunks: DocumentChunk[] } | null> {
    const docRes = await query<Document>(
      'SELECT * FROM documents WHERE id = $1 AND company_id = $2 LIMIT 1',
      [documentId, companyId]
    );

    if (docRes.rows.length === 0) return null;

    const chunksRes = await query<DocumentChunk>(
      'SELECT id, company_id, document_id, content, page_number, section, metadata, created_at FROM document_chunks WHERE document_id = $1 AND company_id = $2 ORDER BY page_number ASC, id ASC',
      [documentId, companyId]
    );

    return {
      document: docRes.rows[0],
      chunks: chunksRes.rows,
    };
  }

  /**
   * Deletes a document and its stored file and vector chunks.
   */
  static async deleteDocument(companyId: string, documentId: string): Promise<boolean> {
    const docRes = await query<Document>(
      'SELECT storage_path FROM documents WHERE id = $1 AND company_id = $2 LIMIT 1',
      [documentId, companyId]
    );

    if (docRes.rows.length === 0) return false;

    // Delete stored file
    await StorageService.deleteFile(docRes.rows[0].storage_path);

    // Delete DB record (cascades to document_chunks)
    await query('DELETE FROM documents WHERE id = $1 AND company_id = $2', [documentId, companyId]);
    return true;
  }

  /**
   * Re-indexes a document.
   */
  static async reindexDocument(companyId: string, documentId: string): Promise<Document | null> {
    const docRes = await query<Document>(
      'SELECT * FROM documents WHERE id = $1 AND company_id = $2 LIMIT 1',
      [documentId, companyId]
    );

    if (docRes.rows.length === 0) return null;

    const doc = docRes.rows[0];
    this.processDocument(doc.id, companyId, doc.storage_path, doc.file_type).catch((err) => {
      console.error(`[DocumentService] Reindex error for doc ${doc.id}:`, err);
    });

    return doc;
  }
}
