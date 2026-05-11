import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected');

  const ExerciseHistory = mongoose.model('ExerciseHistory', new mongoose.Schema({
    exerciseId: mongoose.Schema.Types.ObjectId,
    changedFields: [String],
    recordedAt: Date,
  }));

  const Exercise = mongoose.model('Exercise', new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
  }));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const exercises = await Exercise.find({}).select('_id');
  console.log(`Found ${exercises.length} exercises`);

  let moved = 0;
  for (const ex of exercises) {
    const oldest = await ExerciseHistory
      .findOne({ exerciseId: ex._id })
      .sort({ recordedAt: 1 });

    if (!oldest) continue;

    // Preserve the original time-of-day, just shift the date back one day
    const original = new Date(oldest.recordedAt);
    const backdated = new Date(yesterday);
    backdated.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds());

    await ExerciseHistory.updateOne({ _id: oldest._id }, { $set: { recordedAt: backdated } });
    console.log(`  Exercise ${ex._id}: init moved to ${backdated.toISOString()}`);
    moved++;
  }

  console.log(`\nDone — moved ${moved} init entries to yesterday`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
