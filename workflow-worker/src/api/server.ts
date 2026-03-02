import Fastify, { FastifyInstance } from 'fastify';
import { getWorkflowQueue, WorkflowJobData } from '../queues/workflow.queue.js';

const API_SECRET = process.env.WORKER_API_SECRET || 'kallina-worker-secret';

export async function createApiServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Queue stats endpoint
  fastify.get('/stats', async () => {
    const queue = getWorkflowQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queue: 'workflow-execution',
      waiting,
      active,
      completed,
      failed,
      delayed,
      timestamp: new Date().toISOString(),
    };
  });

  // Enqueue workflow execution job
  fastify.post<{
    Body: {
      workflowId: string;
      userId: string;
      triggerType: 'webhook' | 'call_history' | 'manual' | 'schedule';
      triggerData: Record<string, unknown>;
      triggerId?: string;
      logId?: string;
      respondMode?: 'sync' | 'async' | 'callback';
      priority?: number;
    };
  }>('/enqueue', async (request, reply) => {
    // Simple API key authentication
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { workflowId, userId, triggerType, triggerData, triggerId, logId, respondMode, priority } =
      request.body;

    if (!workflowId || !userId || !triggerType || !triggerData) {
      return reply.status(400).send({
        error: 'Missing required fields: workflowId, userId, triggerType, triggerData',
      });
    }

    const queue = getWorkflowQueue();

    const jobData: WorkflowJobData = {
      workflowId,
      userId,
      triggerType,
      triggerData,
      triggerId,
      logId,
      respondMode,
    };

    const job = await queue.add(`workflow-${workflowId}`, jobData, {
      priority: priority || 0,
      jobId: logId || undefined, // Use logId as jobId for deduplication
    });

    fastify.log.info(`[API] Enqueued job ${job.id} for workflow ${workflowId}`);

    return {
      success: true,
      jobId: job.id,
      workflowId,
      message: 'Workflow execution queued',
    };
  });

  // Get job status
  fastify.get<{
    Params: { jobId: string };
  }>('/job/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const queue = getWorkflowQueue();

    const job = await queue.getJob(jobId);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  });

  // Cancel/remove a job
  fastify.delete<{
    Params: { jobId: string };
  }>('/job/:jobId', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { jobId } = request.params;
    const queue = getWorkflowQueue();

    const job = await queue.getJob(jobId);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    await job.remove();

    return { success: true, message: `Job ${jobId} removed` };
  });

  return fastify;
}
