export interface User {
  id: string;
  name: string;
  email: string;
}

export interface DocumentItem {
  _id: string;
  title: string;
  filename: string;
  status: 'pending' | 'signed' | 'rejected';
  shareToken?: string;
  signedPath?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SignatureItem {
  _id: string;
  documentId: string;
  userId?: string;
  signerName?: string;
  signerEmail?: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: string;
}

export interface AuditLogItem {
  _id: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  userId?: { name: string; email: string };
}
