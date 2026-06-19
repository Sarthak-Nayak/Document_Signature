import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { env } from '../config/env.js';

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(env.uploadDir, { recursive: true });
  await fs.mkdir(path.join(env.uploadDir, 'signatures'), { recursive: true });
}

interface EmbedSignatureOptions {
  pdfPath: string;
  outputPath: string;
  signatureImagePath: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  signerName?: string;
  signedAt?: Date;
}

export async function embedSignatureInPdf(options: EmbedSignatureOptions): Promise<void> {
  const pdfBytes = await fs.readFile(options.pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const pageIndex = Math.max(0, options.page - 1);

  if (pageIndex >= pages.length) {
    throw new Error(`Page ${options.page} does not exist in document`);
  }

  const page = pages[pageIndex];
  const { height: pageHeight } = page.getSize();

  const imageBytes = await fs.readFile(options.signatureImagePath);
  const isPng = options.signatureImagePath.toLowerCase().endsWith('.png');
  const image = isPng
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const pdfY = pageHeight - options.y - options.height;

  page.drawImage(image, {
    x: options.x,
    y: pdfY,
    width: options.width,
    height: options.height,
  });

  if (options.signerName) {
    const dateStr = (options.signedAt || new Date()).toISOString();
    page.drawText(`Signed by ${options.signerName} on ${dateStr}`, {
      x: options.x,
      y: pdfY - 12,
      size: 8,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const signedPdfBytes = await pdfDoc.save();
  await fs.writeFile(options.outputPath, signedPdfBytes);
}
