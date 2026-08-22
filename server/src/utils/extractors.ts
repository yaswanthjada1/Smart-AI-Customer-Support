import pdf from 'pdf-parse';
import mammoth from 'mammoth';

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
   * Extracts structured text from PDF buffer preserving page numbers.
   */
  static async extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
    const pages: ExtractedPage[] = [];

    // Custom pager render callback in pdf-parse to track page numbers
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

    // If custom pagerender didn't populate (fallback), split by form feeds or use full text
    if (pages.length === 0) {
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

    return {
      pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: data.text }],
      fullText: data.text,
      metadata: {
        numpages: data.numpages,
        info: data.info,
      },
    };
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
