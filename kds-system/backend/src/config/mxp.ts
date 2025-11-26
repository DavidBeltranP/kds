import sql from 'mssql';
import { env } from './env';

// Configuración de conexión a MAXPOINT (SQL Server)
const mxpConfig: sql.config = {
  server: env.MXP_HOST,
  port: env.MXP_PORT,
  user: env.MXP_USER,
  password: env.MXP_PASSWORD,
  database: env.MXP_DATABASE,
  options: {
    encrypt: false, // Para redes locales
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

// Pool de conexiones
let pool: sql.ConnectionPool | null = null;

// Obtener pool de conexiones
export async function getMxpPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool(mxpConfig).connect();
    console.log('[MXP] Connected to MAXPOINT database');
  }
  return pool;
}

// Verificar conexión
export async function checkMxpConnection(): Promise<boolean> {
  try {
    const p = await getMxpPool();
    const result = await p.request().query('SELECT 1 as test');
    return result.recordset[0].test === 1;
  } catch (error) {
    console.error('MXP connection failed:', error);
    return false;
  }
}

// Cerrar conexión
export async function disconnectMxp(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// Ejecutar query
export async function queryMxp<T>(
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const p = await getMxpPool();
  const request = p.request();

  // Agregar parámetros
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }

  const result = await request.query<T>(query);
  return result.recordset;
}
