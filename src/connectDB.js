import mongoose from 'mongoose';
import log from './logger.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

export async function connectDb() {
  log.info('Initializing database connection...');
  try {
    await mongoose.connect(MONGODB_URI);
    log.info('Initializing database connection done.');
    return true;
  } catch (e) {
    log.error('Failed to initialize the database connection :');
    log.error(e);
    return false;
  }
}
