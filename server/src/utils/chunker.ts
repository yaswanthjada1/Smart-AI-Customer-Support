import { ExtractedDocument } from './extractors';

export interface ProcessedChunk {
  content: string;
  pageNumber: number | null;
  section: string | null;
  metadata: Record<string, any>;
}

export interface ChunkOptions {
  maxChunkSize?: number; // Target chunk size in characters (~150-200 words)
  chunkOverlap?: number; // Overlap in characters (~20-30 words)
}

export class TextChunker {
  /**
   * Splits an extracted document into structured, semantic chunks.
   */
  static chunkDocument(
    doc: ExtractedDocument,
    options: ChunkOptions = {}
  ): ProcessedChunk[] {
    const maxChunkSize = options.maxChunkSize || 750;
    const chunkOverlap = options.chunkOverlap || 120;
    const chunks: ProcessedChunk[] = [];

    for (const page of doc.pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      // Detect sections based on headings (e.g., # Heading, 1. Section, Section Name:)
      const lines = pageText.split('\n');
      let currentSection: string | null = null;
      let currentBlock = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Heading detection
        const isHeader =
          line.startsWith('#') ||
          /^[0-9]+(\.[0-9]+)*\s+[A-Z]/.test(line) ||
          (/^[A-Z][A-Za-z0-9\s]{3,40}:$/.test(line) && line.length < 50);

        if (isHeader) {
          currentSection = line.replace(/^[#\s]+/, '').replace(/:$/, '').trim();
        }

        // If appending this line exceeds maxChunkSize, flush current chunk
        if (currentBlock.length + line.length > maxChunkSize && currentBlock.length > 0) {
          chunks.push({
            content: currentBlock.trim(),
            pageNumber: page.pageNumber,
            section: currentSection,
            metadata: {
              charLength: currentBlock.trim().length,
            },
          });

          // Retain overlap from end of previous block
          const overlap = currentBlock.slice(-chunkOverlap);
          currentBlock = overlap + ' ' + line;
        } else {
          currentBlock += (currentBlock ? '\n' : '') + line;
        }
      }

      // Flush remaining block for this page
      if (currentBlock.trim().length > 0) {
        chunks.push({
          content: currentBlock.trim(),
          pageNumber: page.pageNumber,
          section: currentSection,
          metadata: {
            charLength: currentBlock.trim().length,
          },
        });
      }
    }

    return chunks;
  }
}
