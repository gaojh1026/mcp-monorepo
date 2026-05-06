import { AppDataSource } from '../config/database';

async function revertMigration() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();

    console.log('Reverting last migration...');
    await AppDataSource.undoLastMigration();
    
    console.log('Migration reverted successfully.');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration revert failed:', error);
    process.exit(1);
  }
}

revertMigration();

