import { Schema, model, Document, Types } from 'mongoose';

export interface IGymVisit extends Document {
  userId: Types.ObjectId;
  workoutDayId: Types.ObjectId | null;
  workoutDayName: string | null;
  visitedAt: Date;
}

const gymVisitSchema = new Schema<IGymVisit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workoutDayId: { type: Schema.Types.ObjectId, ref: 'WorkoutDay', default: null },
    workoutDayName: { type: String, default: null },
    visitedAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

gymVisitSchema.index({ userId: 1, visitedAt: -1 });

export const GymVisit = model<IGymVisit>('GymVisit', gymVisitSchema);
