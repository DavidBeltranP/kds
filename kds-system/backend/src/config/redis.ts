import Redis from 'ioredis';
import { env } from './env';

// Cliente principal
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Cliente para Pub/Sub (subscriber)
export const redisSub = new Redis(env.REDIS_URL);

// Cliente para Pub/Sub (publisher)
export const redisPub = new Redis(env.REDIS_URL);

// Eventos de conexión
redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (error) => {
  console.error('[Redis] Error:', error.message);
});

// Verificar conexión
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}

// Cerrar conexiones
export async function disconnectRedis(): Promise<void> {
  await Promise.all([
    redis.quit(),
    redisSub.quit(),
    redisPub.quit(),
  ]);
}

// Keys helpers
export const REDIS_KEYS = {
  // Pantallas activas
  screenAlive: (screenId: string) => `screen:${screenId}:alive`,
  screenStatus: (screenId: string) => `screen:${screenId}:status`,

  // Balanceo
  balancerIndex: (queueId: string) => `balancer:queue:${queueId}:index`,

  // Órdenes
  screenOrders: (screenId: string) => `screen:${screenId}:orders`,
  orderData: (orderId: string) => `order:${orderId}:data`,

  // Configuración (cache)
  configCache: (screenId: string) => `config:screen:${screenId}`,
  generalConfig: () => `config:general`,

  // Pub/Sub channels
  configUpdated: () => `pubsub:config:updated`,
  ordersUpdated: () => `pubsub:orders:updated`,
  screenStatusChanged: () => `pubsub:screen:status`,
};
