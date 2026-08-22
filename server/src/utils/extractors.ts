import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import zlib from 'zlib';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  pages: ExtractedPage[];
  fullText: string;
  metadata?: Record<string, any>;
}

export class DocumentExtractor {
  /**
   * Resilient fallback to extract raw text streams from PDF when XRef table is damaged ("bad XRef entry").
   */
  private static extractPdfFromRawStreams(buffer: Buffer): string {
    const textSegments: string[] = [];
    const content = buffer.toString('binary');

    // 1. Locate all stream...endstream blocks
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(content)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let decompressed: Buffer | null = null;

      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch {
          // If uncompressed stream
          decompressed = rawStream;
        }
      }

      if (decompressed) {
        const streamText = decompressed.toString('latin1');

        // Extract BT ... ET (Begin Text ... End Text blocks)
        const btRegex = /BT[\s\S]*?ET/g;
        let btMatch: RegExpExecArray | null;
        while ((btMatch = btRegex.exec(streamText)) !== null) {
          const block = btMatch[0];

          // Text strings: (String) Tj, (String) ', (String) "
          const strRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")/g;
          let strMatch: RegExpExecArray | null;
          while ((strMatch = strRegex.exec(block)) !== null) {
            const clean = strMatch[1].replace(/\\([()\\])/g, '$1');
            if (clean.trim()) textSegments.push(clean);
          }

          // Array strings: [(Str1) 12 (Str2)] TJ
          const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
          let arrMatch: RegExpExecArray | null;
          while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
            const inner = arrMatch[1];
            const innerStrRegex = /\(((?:[^()\\]|\\.)*)\)/g;
            let inMatch: RegExpExecArray | null;
            let line = '';
            while ((inMatch = innerStrRegex.exec(inner)) !== null) {
              line += inMatch[1].replace(/\\([()\\])/g, '$1');
            }
            if (line.trim()) textSegments.push(line);
          }
        }
      }
    }

    // 2. Direct string literals fallback if stream decompressed little text
    if (textSegments.join(' ').trim().length < 50) {
      const directRegex = /\(([A-Za-z0-9 ,.?!':;\-\n\r]{4,})\)/g;
      let dMatch: RegExpExecArray | null;
      while ((dMatch = directRegex.exec(content)) !== null) {
        textSegments.push(dMatch[1]);
      }
    }

    return textSegments.join('\n').trim();
  }

  /**
   * Extracts structured text from PDF buffer preserving page numbers and handling corrupt XRefs.
   */
  static async extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
    // Check if buffer is plain text rather than binary PDF
    const header = buffer.slice(0, 8).toString('latin1');
    if (!header.startsWith('%PDF-')) {
      const plain = buffer.toString('utf8').trim();
      return {
        pages: [{ pageNumber: 1, text: plain }],
        fullText: plain,
      };
    }

    const pages: ExtractedPage[] = [];

    // Attempt 1: Standard pdf-parse with custom page render
    try {
      const renderPage = (pageData: any) => {
        const renderOptions = {
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        };

        return pageData.getTextContent(renderOptions).then((textContent: any) => {
          let lastY, text = '';
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }

          pages.push({
            pageNumber: pageData.pageIndex + 1,
            text: text.trim(),
          });

          return text;
        });
      };

      const data = await pdf(buffer, {
        pagerender: renderPage,
      });

      if (pages.length === 0 && data.text.trim()) {
        const rawPages = data.text.split(/\f/);
        rawPages.forEach((txt, idx) => {
          if (txt.trim()) {
            pages.push({
              pageNumber: idx + 1,
              text: txt.trim(),
            });
          }
        });
      }

      if (data.text && data.text.trim().length > 0) {
        return {
          pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: data.text }],
          fullText: data.text,
          metadata: {
            numpages: data.numpages,
            info: data.info,
          },
        };
      }
    } catch (err: any) {
      console.warn(`[DocumentExtractor] Standard PDF parsing encountered an issue (${err.message}). Attempting resilient fallback...`);
    }

    // Attempt 2: Basic pdf-parse without custom hooks
    try {
      const basicData = await pdf(buffer);
      if (basicData.text && basicData.text.trim().length > 0) {
        const rawPages = basicData.text.split(/\f/);
        const fbPages: ExtractedPage[] = [];
        rawPages.forEach((txt, idx) => {
          if (txt.trim()) {
            fbPages.push({
              pageNumber: idx + 1,
              text: txt.trim(),
            });
          }
        });

        return {
          pages: fbPages.length > 0 ? fbPages : [{ pageNumber: 1, text: basicData.text }],
          fullText: basicData.text,
          metadata: {
            numpages: basicData.numpages,
          },
        };
      }
    } catch (err: any) {
      console.warn(`[DocumentExtractor] Basic pdf-parse failed (${err.message}). Using raw stream extraction for corrupt XRef...`);
    }

    // Attempt 3: Raw PDF stream decompression & text extraction (handles "bad XRef entry" / corrupt trailers)
    const streamExtractedText = this.extractPdfFromRawStreams(buffer);
    if (streamExtractedText && streamExtractedText.trim().length > 0) {
      console.log(`[DocumentExtractor] Successfully recovered ${streamExtractedText.length} chars from malformed PDF via stream extraction.`);
      return {
        pages: [{ pageNumber: 1, text: streamExtractedText }],
        fullText: streamExtractedText,
        metadata: {
          recoveredFromRawStream: true,
        },
      };
    }

    throw new Error('Failed to extract readable text from PDF: Corrupted structure or no text content found.');
  }

  /**
   * Extracts text from Microsoft Word DOCX buffer.
   */
  static async extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    return {
      pages: [{ pageNumber: 1, text }],
      fullText: text,
      metadata: {
        messages: result.messages,
      },
    };
  }

  /**
   * Extracts plain text or Markdown.
   */
  static async extractText(buffer: Buffer): Promise<ExtractedDocument> {
    const text = buffer.toString('utf8').trim();
    return {
      pages: [{ pageNumber: 1, text }],
      fullText: text,
    };
  }

  /**
   * Universal extractor dispatcher based on file type / extension.
   */
  static async extract(buffer: Buffer, fileType: string): Promise<ExtractedDocument> {
    const lower = fileType.toLowerCase();

    if (lower.includes('pdf') || lower.endsWith('.pdf')) {
      return this.extractPdf(buffer);
    } else if (lower.includes('word') || lower.includes('docx') || lower.endsWith('.docx')) {
      return this.extractDocx(buffer);
    } else {
      return this.extractText(buffer);
    }
  }
}
