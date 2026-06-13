import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const WorkoutDay = mongoose.model('WorkoutDay', new mongoose.Schema({
  name: String,
  userId: mongoose.Schema.Types.ObjectId,
  order: Number,
}));

const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  workoutDayId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  sets: Number,
  reps: String,
  weight: { type: Number, default: null },
  note: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  goalWeight: { type: Boolean, default: false },
  goalReps: { type: Boolean, default: false },
  order: Number,
}));

async function main() {
  await mongoose.connect(MONGODB_URI!);

  const days = await WorkoutDay.find({}).sort({ order: 1 }).lean();
  const exercises = await Exercise.find({}).sort({ order: 1 }).lean();

  const byDay = new Map<string, typeof exercises>();
  for (const ex of exercises) {
    const key = String(ex.workoutDayId);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ex);
  }

  const lines: string[] = [];
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  lines.push(`Workout Programme — exported ${now}`);
  lines.push('='.repeat(50));

  for (const day of days) {
    lines.push('');
    lines.push(`▸ ${day.name}`);
    lines.push('-'.repeat(30));

    const dayExercises = byDay.get(String(day._id)) ?? [];
    const active = dayExercises.filter((e) => e.isActive !== false);
    const paused = dayExercises.filter((e) => e.isActive === false);

    if (!active.length && !paused.length) {
      lines.push('  (no exercises)');
      continue;
    }

    for (const ex of active) {
      const weight = ex.weight != null ? `${ex.weight} kg` : 'Bodyweight';
      const goals = [
        ex.goalWeight ? '↑ kg' : '',
        ex.goalReps  ? '↑ reps' : '',
      ].filter(Boolean).join(' ');
      const goalStr = goals ? `  [${goals}]` : '';
      lines.push(`  ${ex.name}`);
      lines.push(`    ${ex.sets} sets × ${ex.reps} reps @ ${weight}${goalStr}`);
      if (ex.note) lines.push(`    Note: ${ex.note}`);
    }

    if (paused.length) {
      lines.push('');
      lines.push('  Paused:');
      for (const ex of paused) {
        const weight = ex.weight != null ? `${ex.weight} kg` : 'Bodyweight';
        lines.push(`    ${ex.name} — ${ex.sets}×${ex.reps} @ ${weight}`);
      }
    }
  }

  lines.push('');
  lines.push('='.repeat(50));

  const output = lines.join('\n');
  console.log(output);

  const outPath = path.join(__dirname, '../programme-export.txt');
  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`\nSaved to: ${outPath}`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
