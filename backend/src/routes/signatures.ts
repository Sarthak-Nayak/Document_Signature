import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Signature } from '../models/Signature.js';
import { DocModel } from '../models/Document.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { createAuditLog, sendError } from '../utils/audit.js';
import { embedSignatureInPdf } from '../utils/pdf.js';
import { env } from '../config/env.js';

const router = Router();

const signatureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(env.uploadDir, 'signatures'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadSignature = multer({
  storage: signatureStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId, x, y, page, width, height } = req.body;

    if (!documentId || x === undefined || y === undefined) {
      return sendError(res, 400, 'documentId, x, and y are required');
    }

    const doc = await DocModel.findOne({ _id: documentId, ownerId: req.user!.userId });
    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    const signature = await Signature.create({
      documentId,
      userId: req.user!.userId,
      x: Number(x),
      y: Number(y),
      page: Number(page) || 1,
      width: Number(width) || 150,
      height: Number(height) || 50,
      status: 'pending',
    });

    await createAuditLog(req, documentId, 'signature_position_saved', `Page ${signature.page}, x:${x}, y:${y}`);

    res.status(201).json({
      signature: {
        id: signature._id,
        documentId: signature.documentId,
        userId: signature.userId,
        x: signature.x,
        y: signature.y,
        page: signature.page,
        width: signature.width,
        height: signature.height,
        status: signature.status,
      },
    });
  } catch (error) {
    console.error('Save signature error:', error);
    sendError(res, 500, 'Failed to save signature position');
  }
});

router.post('/public', async (req: AuthRequest, res: Response) => {
  try {
    const { shareToken, signerName, signerEmail, x, y, page, width, height } = req.body;

    if (!shareToken || !signerName || x === undefined || y === undefined) {
      return sendError(res, 400, 'shareToken, signerName, x, and y are required');
    }

    const doc = await DocModel.findOne({ shareToken });
    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    if (doc.status === 'signed') {
      return sendError(res, 400, 'Document already signed');
    }

    const signature = await Signature.create({
      documentId: doc._id,
      signerName,
      signerEmail,
      x: Number(x),
      y: Number(y),
      page: Number(page) || 1,
      width: Number(width) || 150,
      height: Number(height) || 50,
      status: 'pending',
    });

    await createAuditLog(req, doc._id.toString(), 'public_signature_position_saved', `Signer: ${signerName}`);

    res.status(201).json({
      signature: {
        id: signature._id,
        documentId: signature.documentId,
        x: signature.x,
        y: signature.y,
        page: signature.page,
        status: signature.status,
      },
    });
  } catch (error) {
    sendError(res, 500, 'Failed to save signature');
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const signatures = await Signature.find({ documentId: req.params.id }).lean();
    res.json({ signatures });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch signatures');
  }
});

router.get('/document/:docId/public', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOne({ shareToken: req.params.docId });
    const docId = doc?._id || req.params.docId;
    const signatures = await Signature.find({ documentId: docId }).lean();
    res.json({ signatures });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch signatures');
  }
});

router.post('/finalize', authMiddleware, uploadSignature.single('signatureImage'), async (req: AuthRequest, res: Response) => {
  try {
    const { signatureId } = req.body;

    if (!signatureId || !req.file) {
      return sendError(res, 400, 'signatureId and signature image are required');
    }

    const signature = await Signature.findById(signatureId).populate('documentId');
    if (!signature) {
      return sendError(res, 404, 'Signature not found');
    }

    const doc = await DocModel.findOne({
      _id: signature.documentId,
      ownerId: req.user!.userId,
    });

    if (!doc) {
      return sendError(res, 404, 'Document not found or access denied');
    }

    signature.signatureImagePath = req.file.path;
    signature.status = 'signed';
    signature.signedAt = new Date();
    await signature.save();

    const signedFilename = `signed-${path.basename(doc.originalPath)}`;
    const signedPath = path.join(env.uploadDir, signedFilename);

    await embedSignatureInPdf({
      pdfPath: doc.signedPath || doc.originalPath,
      outputPath: signedPath,
      signatureImagePath: req.file.path,
      x: signature.x,
      y: signature.y,
      page: signature.page,
      width: signature.width,
      height: signature.height,
      signerName: signature.signerName,
      signedAt: signature.signedAt,
    });

    doc.signedPath = signedPath;
    doc.status = 'signed';
    await doc.save();

    await createAuditLog(req, doc._id.toString(), 'document_signed', 'Signature embedded in PDF');

    res.json({
      document: { id: doc._id, status: doc.status },
      signature: { id: signature._id, status: signature.status },
    });
  } catch (error) {
    console.error('Finalize error:', error);
    sendError(res, 500, 'Failed to finalize signature');
  }
});

router.post('/finalize/public', uploadSignature.single('signatureImage'), async (req: AuthRequest, res: Response) => {
  try {
    const { signatureId, shareToken } = req.body;

    if (!signatureId || !shareToken || !req.file) {
      return sendError(res, 400, 'signatureId, shareToken, and signature image are required');
    }

    const doc = await DocModel.findOne({ shareToken });
    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    const signature = await Signature.findOne({ _id: signatureId, documentId: doc._id });
    if (!signature) {
      return sendError(res, 404, 'Signature not found');
    }

    signature.signatureImagePath = req.file.path;
    signature.status = 'signed';
    signature.signedAt = new Date();
    await signature.save();

    const signedFilename = `signed-${path.basename(doc.originalPath)}`;
    const signedPath = path.join(env.uploadDir, signedFilename);

    await embedSignatureInPdf({
      pdfPath: doc.signedPath || doc.originalPath,
      outputPath: signedPath,
      signatureImagePath: req.file.path,
      x: signature.x,
      y: signature.y,
      page: signature.page,
      width: signature.width,
      height: signature.height,
      signerName: signature.signerName,
      signedAt: signature.signedAt,
    });

    doc.signedPath = signedPath;
    doc.status = 'signed';
    await doc.save();

    await createAuditLog(req, doc._id.toString(), 'document_signed_via_link', `Signer: ${signature.signerName}`);

    res.json({
      document: { id: doc._id, status: doc.status },
      signature: { id: signature._id, status: signature.status },
    });
  } catch (error) {
    console.error('Public finalize error:', error);
    sendError(res, 500, 'Failed to finalize signature');
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { x, y, page, width, height } = req.body;

    const signature = await Signature.findById(req.params.id);
    if (!signature) {
      return sendError(res, 404, 'Signature not found');
    }

    const doc = await DocModel.findOne({ _id: signature.documentId, ownerId: req.user!.userId });
    if (!doc) {
      return sendError(res, 403, 'Access denied');
    }

    if (x !== undefined) signature.x = Number(x);
    if (y !== undefined) signature.y = Number(y);
    if (page !== undefined) signature.page = Number(page);
    if (width !== undefined) signature.width = Number(width);
    if (height !== undefined) signature.height = Number(height);

    await signature.save();

    await createAuditLog(req, signature.documentId.toString(), 'signature_position_updated', `Page ${signature.page}, x:${signature.x}, y:${signature.y}`);

    res.json({ signature });
  } catch (error) {
    sendError(res, 500, 'Failed to update signature position');
  }
});

router.patch('/public/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { shareToken, x, y, page, width, height } = req.body;

    if (!shareToken) {
      return sendError(res, 400, 'shareToken is required');
    }

    const doc = await DocModel.findOne({ shareToken });
    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    const signature = await Signature.findOne({ _id: req.params.id, documentId: doc._id });
    if (!signature) {
      return sendError(res, 404, 'Signature not found');
    }

    if (doc.status === 'signed') {
      return sendError(res, 400, 'Document already signed');
    }

    if (x !== undefined) signature.x = Number(x);
    if (y !== undefined) signature.y = Number(y);
    if (page !== undefined) signature.page = Number(page);
    if (width !== undefined) signature.width = Number(width);
    if (height !== undefined) signature.height = Number(height);

    await signature.save();

    await createAuditLog(req, doc._id.toString(), 'public_signature_position_updated', `Signer: ${signature.signerName || 'unknown'}`);

    res.json({ signature });
  } catch (error) {
    sendError(res, 500, 'Failed to update signature position');
  }
});

export default router;
