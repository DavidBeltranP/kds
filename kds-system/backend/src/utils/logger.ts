import winston from 'winston';
import path from 'path';
import { env } from '../config/env';

// Formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Crear logger
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: customFormat,
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),

    // Archivo de errores
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Archivo general
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Archivo diario
    new winston.transports.File({
      filename: path.join('logs', `log ${new Date().toISOString().split('T')[0]}.txt`),
      maxsize: 10485760, // 10MB
    }),
  ],
});

// Helper para logs de componentes específicos
export function createComponentLogger(component: string) {
  return {
    info: (message: string, meta?: object) =>
      logger.info(`[${component}] ${message}`, meta),
    warn: (message: string, meta?: object) =>
      logger.warn(`[${component}] ${message}`, meta),
    error: (message: string, meta?: object) =>
      logger.error(`[${component}] ${message}`, meta),
    debug: (message: string, meta?: object) =>
      logger.debug(`[${component}] ${message}`, meta),
  };
}

// Loggers específicos
export const mxpLogger = createComponentLogger('MXP');
export const balancerLogger = createComponentLogger('BALANCER');
export const screenLogger = createComponentLogger('SCREEN');
export const orderLogger = createComponentLogger('ORDER');
export const wsLogger = createComponentLogger('WEBSOCKET');
export const printerLogger = createComponentLogger('PRINTER');
