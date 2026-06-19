import mongoose, { Document, Schema, Types } from 'mongoose';

export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export interface ISignature extends Document {
  documentId: Types.ObjectId;
  userId?: Types.ObjectId;
  signerName?: string;
  signerEmail?: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  signatureImagePath?: string;
  status: SignatureStatus;
  signedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const signatureSchema = new Schema<ISignature>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    signerName: { type: String, trim: true },
    signerEmail: { type: String, trim: true, lowercase: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    page: { type: Number, required: true, default: 1 },
    width: { type: Number, default: 150 },
    height: { type: Number, default: 50 },
    signatureImagePath: { type: String },
    status: {
      type: String,
      enum: ['pending', 'signed', 'rejected'],
      default: 'pending',
    },
    signedAt: { type: Date },
  },
  { timestamps: true }
);

export const Signature = mongoose.model<ISignature>('Signature', signatureSchema);
