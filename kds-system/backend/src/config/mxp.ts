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
    const result = await p.request().query<{ test: number }>('SELECT 1 as test');
    return result.recordset[0].test === 1;
  } catch (error: unknown) {
    console.error('MXP connection failed:', error instanceof Error ? error.message : error);
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

/**
 * Probar conexión con parámetros personalizados (sin usar el pool global)
 * Útil para validar credenciales antes de guardar
 */
export async function testMxpConnectionWithParams(params: {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}): Promise<{ success: boolean; message: string; details?: string }> {
  const testConfig: sql.config = {
    server: params.host,
    port: params.port || 1433,
    user: params.user,
    password: params.password,
    database: params.database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 10000,
    requestTimeout: 10000,
  };

  let testPool: sql.ConnectionPool | null = null;

  try {
    // Intentar conectar
    testPool = await new sql.ConnectionPool(testConfig).connect();

    // Verificar que podemos ejecutar una query simple
    const result = await testPool.request().query<{ test: number }>('SELECT 1 as test');

    if (result.recordset[0]?.test === 1) {
      // Intentar obtener información adicional del servidor
      const versionResult = await testPool.request().query<{ version: string }>(
        'SELECT @@VERSION as version'
      );
      const version = versionResult.recordset[0]?.version?.split('\n')[0] || 'SQL Server';

      return {
        success: true,
        message: 'Conexion exitosa',
        details: version,
      };
    }

    return {
      success: false,
      message: 'La conexion se establecio pero no se pudo verificar',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mensajes de error más amigables
    let friendlyMessage = 'Error de conexion';
    if (errorMessage.includes('ECONNREFUSED')) {
      friendlyMessage = 'No se puede conectar al servidor. Verifique la IP y que SQL Server este en ejecucion.';
    } else if (errorMessage.includes('ETIMEOUT') || errorMessage.includes('timeout')) {
      friendlyMessage = 'Tiempo de espera agotado. Verifique la IP, puerto y que el firewall permita la conexion.';
    } else if (errorMessage.includes('Login failed')) {
      friendlyMessage = 'Credenciales incorrectas. Verifique usuario y contrasena.';
    } else if (errorMessage.includes('Cannot open database')) {
      friendlyMessage = 'No se puede acceder a la base de datos. Verifique el nombre y permisos.';
    } else if (errorMessage.includes('ENOTFOUND')) {
      friendlyMessage = 'Servidor no encontrado. Verifique el nombre del host.';
    }

    return {
      success: false,
      message: friendlyMessage,
      details: errorMessage,
    };
  } finally {
    // Siempre cerrar la conexión de prueba
    if (testPool) {
      try {
        await testPool.close();
      } catch {
        // Ignorar errores al cerrar
      }
    }
  }
}
