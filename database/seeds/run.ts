import { seedDatabase } from './index.js';

void seedDatabase()
  .then(() => {
    console.info('[seed] Database seeding completed successfully.');
  })
  .catch((error) => {
    console.error('[seed] Database seeding failed.', error);
    process.exitCode = 1;
  });
