// IMPORTANT: Force IPv4 for all DNS lookups (required for whitelist access)
// This must be at the top before any other imports that might make HTTP requests
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { createWorkflowWorker } from './processors/workflow.processor.js';
import { getWorkflowQueue, createQueueEvents, QUEUE_NAMES } from './queues/workflow.queue.js';
import { closeRedisConnection } from './lib/redis.js';
import { config } from './lib/config.js';
import { createApiServer } from './api/server.js';

const API_PORT = parseInt(process.env.API_PORT || '3001');

console.log('='.repeat(50));
console.log('Kallina Workflow Worker');
console.log('='.repeat(50));
console.log(`DNS Order: ipv4first (forced for whitelist compatibility)`);
console.log(`Redis: ${config.redis.host}:${config.redis.port}`);
console.log(`Concurrency: ${config.worker.concurrency}`);
console.log(`API Port: ${API_PORT}`);
console.log(`Supabase URL: ${config.supabase.url.substring(0, 30)}...`);
console.log('='.repeat(50));

// Validate configuration
if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create and start API server
const apiServer = await createApiServer();
await apiServer.listen({ port: API_PORT, host: '0.0.0.0' });
console.log(`[API] Server listening on port ${API_PORT}`);

// Create worker
const workflowWorker = createWorkflowWorker();

// Create queue events for monitoring
const queueEvents = createQueueEvents(QUEUE_NAMES.WORKFLOW_EXECUTION);

queueEvents.on('waiting', ({ jobId }) => {
  console.log(`[Queue] Job ${jobId} is waiting`);
});

queueEvents.on('active', ({ jobId }) => {
  console.log(`[Queue] Job ${jobId} is now active`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`[Queue] Job ${jobId} progress:`, data);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[Queue] Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue] Job ${jobId} failed:`, failedReason);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);

  try {
    // Close API server
    await apiServer.close();
    console.log('[Shutdown] API server closed');

    // Close worker (waits for current jobs to complete)
    await workflowWorker.close();
    console.log('[Shutdown] Worker closed');

    // Close queue events
    await queueEvents.close();
    console.log('[Shutdown] Queue events closed');

    // Close Redis connection
    await closeRedisConnection();
    console.log('[Shutdown] Redis connection closed');

    console.log('[Shutdown] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Log queue stats periodically
async function logStats() {
  try {
    const queue = getWorkflowQueue();
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    console.log(
      `[Stats] Waiting: ${waiting} | Active: ${active} | Completed: ${completed} | Failed: ${failed}`
    );
  } catch (error) {
    console.error('[Stats] Error getting stats:', error);
  }
}

// Log stats every 30 seconds
setInterval(logStats, 30000);

console.log('[Worker] Started and ready to process jobs');
console.log('[Worker] Waiting for workflow execution jobs...');
