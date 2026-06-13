import { connectDB } from './config/db';
import { env } from './config/env';
import app from './app';
import { migrateToExercisesArray } from './services/exercise.service';

async function main() {
  await connectDB();
  await migrateToExercisesArray();
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main();
