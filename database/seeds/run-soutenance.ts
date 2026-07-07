import { seedSoutenanceDemoDatabase } from './soutenance.js';

void seedSoutenanceDemoDatabase()
  .then(() => {
    console.info('[seed:soutenance] Demo data completed successfully.');
  })
  .catch((error) => {
    console.error('[seed:soutenance] Demo data failed.', error);
    process.exitCode = 1;
  });
