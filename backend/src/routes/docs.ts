import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { DocModel } from '../models/Document.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { createAuditLog, sendError } from '../utils/audit.js';
import { env } from '../config/env.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'PDF file is required');
    }

    const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, '');

    const doc = await DocModel.create({
      title,
      filename: req.file.originalname,
      originalPath: req.file.path,
      ownerId: req.user!.userId,
      status: 'pending',
      shareToken: uuidv4(),
    });

    await createAuditLog(req, doc._id.toString(), 'document_uploaded', `Uploaded: ${title}`);

    res.status(201).json({
      document: {
        id: doc._id,
        title: doc.title,
        filename: doc.filename,
        status: doc.status,
        shareToken: doc.shareToken,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    sendError(res, 500, 'Upload failed');
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const docs = await DocModel.find({ ownerId: req.user!.userId })
      .sort({ createdAt: -1 })
      .select('-originalPath -signedPath')
      .lean();

    res.json({ documents: docs });
  } catch (error) {
    console.error('List docs error:', error);
    sendError(res, 500, 'Failed to fetch documents');
  }
});

router.get('/share/:token', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOne({ shareToken: req.params.token })
      .select('title filename status createdAt shareToken')
      .lean();

    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    res.json({ document: doc });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch document');
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOne({
      _id: req.params.id,
      ownerId: req.user!.userId,
    }).lean();

    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    res.json({
      document: {
        id: doc._id,
        title: doc.title,
        filename: doc.filename,
        status: doc.status,
        shareToken: doc.shareToken,
        signedPath: doc.signedPath ? true : false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch document');
  }
});

router.get('/share/:token/file', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOne({ shareToken: req.params.token });

    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    await createAuditLog(req, doc._id.toString(), 'document_viewed_via_link', 'Public link access');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.sendFile(path.resolve(doc.originalPath));
  } catch (error) {
    sendError(res, 500, 'Failed to serve document');
  }
});

router.get('/:id/file', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOne({
      _id: req.params.id,
      ownerId: req.user!.userId,
    });

    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    const filePath = doc.signedPath || doc.originalPath;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    sendError(res, 500, 'Failed to serve document');
  }
});

router.patch('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.userId },
      { status: 'rejected' },
      { new: true }
    );

    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    await createAuditLog(req, doc._id.toString(), 'document_rejected');

    res.json({ document: { id: doc._id, status: doc.status } });
  } catch (error) {
    sendError(res, 500, 'Failed to reject document');
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user!.userId,
    });

    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    await fs.unlink(doc.originalPath).catch(() => {});
    if (doc.signedPath) {
      await fs.unlink(doc.signedPath).catch(() => {});
    }

    res.json({ message: 'Document deleted' });
  } catch (error) {
    sendError(res, 500, 'Failed to delete document');
  }
});

export default router;
