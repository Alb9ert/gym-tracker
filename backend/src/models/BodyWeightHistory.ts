import { Schema, model, Document, Types } from 'mongoose';

export interface IBodyWeightHistory extends Document {
  userId: Types.ObjectId;
  weight: number;
  recordedAt: Date;
}

const bodyWeightHistorySchema = new Schema<IBodyWeightHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weight: { type: Number, required: true, min: 1 },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

bodyWeightHistorySchema.index({ userId: 1, recordedAt: -1 });

export const BodyWeightHistory = model<IBodyWeightHistory>('BodyWeightHistory', bodyWeightHistorySchema);
