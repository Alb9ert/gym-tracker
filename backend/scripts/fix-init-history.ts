import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB');

  const ExerciseHistory = mongoose.model(
    'ExerciseHistory',
    new mongoose.Schema({
      exerciseId: mongoose.Schema.Types.ObjectId,
      changedFields: [String],
      recordedAt: Date,
    })
  );

  const Exercise = mongoose.model(
    'Exercise',
    new mongoose.Schema({ _id: mongoose.Schema.Types.ObjectId })
  );

  const exercises = await Exercise.find({}).select('_id');
  console.log(`Found ${exercises.length} exercises`);

  let fixed = 0;
  for (const ex of exercises) {
    // The initial snapshot is always the oldest history entry for an exercise
    const oldest = await ExerciseHistory
      .findOne({ exerciseId: ex._id })
      .sort({ recordedAt: 1 });

    if (oldest && oldest.changedFields.length > 0) {
      await ExerciseHistory.updateOne(
        { _id: oldest._id },
        { $set: { changedFields: [] } }
      );
      fixed++;
      console.log(`  Fixed init entry for exercise ${ex._id}`);
    }
  }

  console.log(`\nDone — fixed ${fixed} initial history entries`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
