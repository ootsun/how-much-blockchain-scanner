import mongoose from 'mongoose';
import log from './logger.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

export const connectDb = async () => {
  log.info('Initializing database connection...');
  try {
    await mongoose.connect(MONGODB_URI);
    log.info('Initializing database connection done.');
  } catch (e) {
    log.error('Failed to initialize the database connection :');
    log.error(e);
    log.warn('Exiting program');
    process.exit(0);
  }
};

export const disconnectDb = async () => {
  log.info('Closing database connection...');
  try {
    await mongoose.disconnect();
    log.info('Closing database connection done.');
  } catch (e) {
    log.error('Failed to close the database connection :');
    log.error(e);
    log.warn('Exiting program');
    process.exit(0);
  }
};
