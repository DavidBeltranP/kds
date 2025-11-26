import { config } from 'dotenv';
import { z } from 'zod';

// Cargar variables de entorno
config();

// Schema de validación
const envSchema = z.object({
  // Base de datos
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Servidor
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // MAXPOINT
  MXP_HOST: z.string().default(''),
  MXP_USER: z.string().default(''),
  MXP_PASSWORD: z.string().default(''),
  MXP_DATABASE: z.string().default(''),
  MXP_PORT: z.string().default('1433').transform(Number),

  // Polling
  POLLING_INTERVAL: z.string().default('2000').transform(Number),
  ORDER_LIFETIME_HOURS: z.string().default('4').transform(Number),

  // WebSocket
  HEARTBEAT_INTERVAL: z.string().default('5000').transform(Number),
  HEARTBEAT_TIMEOUT: z.string().default('10000').transform(Number),

  // Logs
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_RETENTION_DAYS: z.string().default('5').transform(Number),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:8080,http://localhost:80'),

  // Admin
  ADMIN_EMAIL: z.string().email().default('admin@kds.local'),
  ADMIN_PASSWORD: z.string().min(6).default('admin123'),
});

// Parsear y validar
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Tipos exportados
export type Env = z.infer<typeof envSchema>;
