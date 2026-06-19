import { Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { Types } from 'mongoose';
import { AuthRequest, getClientIp } from '../middleware/auth.js';

export async function createAuditLog(
  req: AuthRequest,
  documentId: string,
  action: string,
  details?: string,
  userId?: string
): Promise<void> {
  await AuditLog.create({
    documentId: new Types.ObjectId(documentId),
    userId: userId ? new Types.ObjectId(userId) : req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
    action,
    details,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });
}

export async function getAuditLogsForDocument(docId: string) {
  return AuditLog.find({ documentId: docId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

export function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ message });
}
