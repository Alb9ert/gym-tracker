import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkoutDay extends Document {
  userId: Types.ObjectId;
  name: string;
  order: number;
  isActive: boolean;
  exercises: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const workoutDaySchema = new Schema<IWorkoutDay>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    exercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }],
  },
  { timestamps: true }
);

export const WorkoutDay = model<IWorkoutDay>('WorkoutDay', workoutDaySchema);
