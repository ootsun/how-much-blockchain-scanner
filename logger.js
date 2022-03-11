import winston from 'winston';

const consoleLevel = process.env.LOG_CONSOLE_LEVEL;

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: consoleLevel,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({
                    format: 'HH:mm:ss',
                }),
                winston.format.printf(
                    (info) =>
                        `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`
                )
            ),
        }),
    ],
});

logger.stream = {
    write: function (message, encoding) {
        logger.info(message);
    },
};

function format(message) {
    let errorLine = new Error().stack.split('\n')[3];
    errorLine = errorLine.slice(errorLine.lastIndexOf('/') + 1);
    if (errorLine.endsWith(')')) {
        errorLine = errorLine.slice(0, errorLine.length - 1);
    }
    return errorLine + ' : ' + message;
}

const log = {
    debug: (message) => {
        logger.debug(format(message));
    },
    info: (message) => {
        logger.info(format(message));
    },
    warn: (message) => {
        logger.warn(format(message));
    },
    error: (message) => {
        logger.error(format(message));
    },
    stream: logger.stream
}

export default log;
