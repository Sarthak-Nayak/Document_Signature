import { Router, Response } from 'express';
import { DocModel } from '../models/Document.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getAuditLogsForDocument, sendError } from '../utils/audit.js';

const router = Router();

router.get('/:docId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocModel.findOne({
      _id: req.params.docId,
      ownerId: req.user!.userId,
    });

    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }

    const logs = await getAuditLogsForDocument(req.params.docId);
    res.json({ auditLogs: logs });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch audit logs');
  }
});

export default router;
