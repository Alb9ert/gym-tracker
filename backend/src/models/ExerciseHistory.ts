import { Schema, model, Document, Types } from 'mongoose';

export interface IExerciseHistory extends Document {
  exerciseId: Types.ObjectId;
  userId: Types.ObjectId;
  sets: number;
  reps: string;
  weight: number | null;
  changedFields: string[];
  recordedAt: Date;
}

const exerciseHistorySchema = new Schema<IExerciseHistory>(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sets: { type: Number, required: true },
    reps: { type: String, required: true },
    weight: { type: Number, default: null },
    changedFields: [{ type: String }],
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Compound index for fast per-exercise time-series queries
exerciseHistorySchema.index({ exerciseId: 1, recordedAt: -1 });

export const ExerciseHistory = model<IExerciseHistory>('ExerciseHistory', exerciseHistorySchema);
