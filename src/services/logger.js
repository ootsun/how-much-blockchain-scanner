import { format } from 'logform';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const LOG_LEVEL = process.env.LOG_LEVEL
  ? process.env.LOG_LEVEL.toLowerCase()
  : 'debug';
const LOG_DIR = process.env.LOG_DIR || 'log';
const NODE_ENV = process.env.NODE_ENV
  ? process.env.NODE_ENV.toLowerCase()
  : null;

let logDir = LOG_DIR;
if (!logDir.endsWith('/')) {
  logDir += '/';
}

const logger = winston.createLogger({
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss:SSS',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
    format.printf(
      (info) => `${info.timestamp} [${info.level}] ${info.message}`,
    ),
  ),
  transports:
    NODE_ENV !== 'production'
      ? [new winston.transports.Console({ level: LOG_LEVEL })]
      : [
          new winston.transports.Console(),
          new DailyRotateFile({
            filename: logDir + 'error.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '31d',
            prepend: true,
            level: 'error',
          }),
          new DailyRotateFile({
            filename: logDir + 'combined.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '31d',
            prepend: true,
            level: LOG_LEVEL,
          }),
        ],
});

export default logger;
