import mongoose, { Document, Schema, Types } from 'mongoose';

export type DocumentStatus = 'pending' | 'signed' | 'rejected';

export interface IDocument extends Document {
  title: string;
  filename: string;
  originalPath: string;
  signedPath?: string;
  ownerId: Types.ObjectId;
  status: DocumentStatus;
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, trim: true },
    filename: { type: String, required: true },
    originalPath: { type: String, required: true },
    signedPath: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'signed', 'rejected'],
      default: 'pending',
    },
    shareToken: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export const DocModel = mongoose.model<IDocument>('Document', documentSchema);
