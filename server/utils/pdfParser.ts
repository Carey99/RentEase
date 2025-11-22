import { PdfReader } from 'pdfreader';
import fs from 'fs/promises';

/**
 * Extract text from a PDF file
 * Uses pdfreader for reliable text extraction
 */
export async function extractTextFromPDF(
  filePath: string,
  password?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const rows: { [key: number]: { [key: number]: string } } = {};
    let currentPage = 0;

    new PdfReader({ password }).parseFileItems(filePath, (err, item) => {
      if (err) {
        if (err.message?.includes('password') || err.message?.includes('encrypted')) {
          reject(new Error('PDF is password-protected. Please provide the correct password.'));
        } else {
          reject(new Error(`Failed to extract text from PDF: ${err.message}`));
        }
        return;
      }

      if (!item) {
        // End of file, compile text
        const text = Object.keys(rows)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(rowNum => {
            const row = rows[parseInt(rowNum)];
            return Object.keys(row)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(x => row[parseInt(x)])
              .join(' ');
          })
          .join('\n');
        resolve(text);
        return;
      }

      if (item.page) {
        // New page
        currentPage = item.page - 1;
        return;
      }

      if (item.text) {
        // Text item
        const y = Math.floor(item.y * 100); // Row position
        const x = Math.floor(item.x * 100); // Column position

        if (!rows[y]) {
          rows[y] = {};
        }
        rows[y][x] = item.text;
      }
    });
  });
}

/**
 * Check if a PDF is password-protected
 */
export async function isPDFPasswordProtected(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    new PdfReader().parseFileItems(filePath, (err) => {
      if (err) {
        if (err.message?.includes('password') || err.message?.includes('encrypted')) {
          resolve(true);
        } else {
          resolve(false);
        }
        return;
      }
      resolve(false);
    });
  });
}

/**
 * Validate that file is a PDF
 */
export function validatePDFFile(filename: string, mimetype: string): boolean {
  const isPDF = mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
  return isPDF;
}

/**
 * Get basic PDF metadata
 */
export async function getPDFMetadata(filePath: string) {
  return new Promise<{ pages: number }>((resolve, reject) => {
    let pageCount = 0;

    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) {
        reject(err);
        return;
      }

      if (!item) {
        // End of file
        resolve({ pages: pageCount });
        return;
      }

      if (item.page && item.page > pageCount) {
        pageCount = item.page;
      }
    });
  });
}
