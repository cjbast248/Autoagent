import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/redis.js';

// Queue names
export const QUEUE_NAMES = {
  WORKFLOW_EXECUTION: 'workflow-execution',
  NODE_EXECUTION: 'node-execution',
} as const;

// Job data interfaces
export interface WorkflowJobData {
  workflowId: string;
  triggerId?: string;
  triggerType: 'webhook' | 'call_history' | 'manual' | 'schedule';
  triggerData: Record<string, unknown>;
  userId: string;
  logId?: string; // For webhook response tracking
  respondMode?: 'sync' | 'async' | 'callback';
}

export interface NodeJobData {
  workflowExecutionId: string;
  workflowId: string;
  userId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  nodeConfig: Record<string, unknown>;
  inputData: unknown;
  nodeIndex: number;
  totalNodes: number;
  logId?: string;
}

// Job result interfaces
export interface WorkflowJobResult {
  success: boolean;
  workflowId: string;
  executionId: string;
  nodesExecuted: number;
  results: Array<{
    nodeId: string;
    nodeLabel: string;
    status: 'success' | 'error';
    result?: unknown;
    error?: string;
    durationMs: number;
  }>;
  totalDurationMs: number;
}

export interface NodeJobResult {
  success: boolean;
  nodeId: string;
  output: unknown;
  durationMs: number;
  error?: string;
}

// Create queues
let workflowQueue: Queue<WorkflowJobData, WorkflowJobResult> | null = null;
let nodeQueue: Queue<NodeJobData, NodeJobResult> | null = null;

export function getWorkflowQueue(): Queue<WorkflowJobData, WorkflowJobResult> {
  if (!workflowQueue) {
    workflowQueue = new Queue(QUEUE_NAMES.WORKFLOW_EXECUTION, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep more failed jobs for debugging
          age: 7 * 24 * 3600, // Keep for 7 days
        },
      },
    });
  }
  return workflowQueue;
}

export function getNodeQueue(): Queue<NodeJobData, NodeJobResult> {
  if (!nodeQueue) {
    nodeQueue = new Queue(QUEUE_NAMES.NODE_EXECUTION, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
        removeOnComplete: {
          count: 5000,
          age: 12 * 3600,
        },
        removeOnFail: {
          count: 10000,
          age: 48 * 3600,
        },
      },
    });
  }
  return nodeQueue;
}

// Queue events for monitoring
export function createQueueEvents(queueName: string): QueueEvents {
  return new QueueEvents(queueName, {
    connection: getRedisConnectionOptions(),
  });
}
