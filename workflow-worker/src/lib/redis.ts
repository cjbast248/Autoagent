import { config } from './config.js';

// BullMQ connection options - NOT an ioredis instance
// BullMQ creates its own connections internally
export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
}

export function getRedisConnectionOptions(): RedisConnectionOptions {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
  };
}

// For graceful shutdown - BullMQ handles its own connections
export async function closeRedisConnection(): Promise<void> {
  // BullMQ manages connections internally
  // This is a no-op but kept for API compatibility
  console.log('[Redis] Connection cleanup requested');
}
