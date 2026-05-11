import { Schema, model, Document, Types } from 'mongoose';

export interface IExercise extends Document {
  workoutDayId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    workoutDayId: { type: Schema.Types.ObjectId, ref: 'WorkoutDay', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sets: { type: Number, required: true, default: 3, min: 1 },
    reps: { type: String, required: true, default: '10' },
    weight: { type: Number, default: null, min: 0 },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const Exercise = model<IExercise>('Exercise', exerciseSchema);
