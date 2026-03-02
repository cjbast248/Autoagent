import { Job, Worker } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/redis.js';
import { getSupabase } from '../lib/supabase.js';
import { config } from '../lib/config.js';
import { buildExecutionOrder } from '../lib/utils.js';
import { executeNode, NodeDefinition } from './nodes/index.js';
import {
  QUEUE_NAMES,
  WorkflowJobData,
  WorkflowJobResult,
} from '../queues/workflow.queue.js';

interface NodeResult {
  nodeId: string;
  nodeLabel: string;
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  durationMs: number;
  splitExecution?: boolean;
  itemsProcessed?: number;
  successCount?: number;
  errorCount?: number;
}

async function processWorkflowJob(job: Job<WorkflowJobData>): Promise<WorkflowJobResult> {
  const startTime = Date.now();
  const { workflowId, userId, triggerData, triggerType, logId } = job.data;

  console.log(`[Workflow] Starting execution: ${workflowId}`);
  console.log(`[Workflow] Trigger type: ${triggerType}, User: ${userId}`);

  const supabase = getSupabase();
  const results: NodeResult[] = [];

  try {
    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        status: 'running',
        source: triggerType,
        trigger_data: triggerData,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (execError) {
      console.error('[Workflow] Failed to create execution record:', execError);
    }

    const executionId = execution?.id || `temp-${Date.now()}`;

    // Update job progress
    await job.updateProgress({ status: 'loading_workflow', executionId });

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    console.log(`[Workflow] Loaded: ${workflow.name}`);

    // Parse nodes and connections
    interface RawNode {
      id: string;
      type?: string;
      icon?: string;
      label?: string;
      config?: unknown;
    }
    const rawNodes: RawNode[] =
      typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes;
    const nodes: NodeDefinition[] = rawNodes.map((n) => ({
      ...n,
      config: (n.config || {}) as Record<string, unknown>,
    }));
    const connections: Array<{ from: string; to: string }> =
      typeof workflow.connections === 'string' ? JSON.parse(workflow.connections) : workflow.connections;

    if (!nodes || nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    // Build execution order
    const rawExecutionOrder = buildExecutionOrder(nodes, connections, triggerType);
    const executionOrder: NodeDefinition[] = rawExecutionOrder.map((n) => ({
      ...n,
      config: (n.config || {}) as Record<string, unknown>,
    }));
    console.log(`[Workflow] Execution order: ${executionOrder.map((n) => n.label).join(' -> ')}`);

    await job.updateProgress({
      status: 'executing',
      executionId,
      totalNodes: executionOrder.length,
      currentNode: 0,
    });

    // Execute each node
    let currentData: unknown = triggerData;
    let splitMode = false;
    let splitItems: Array<Record<string, unknown>> = [];

    // Track webhook response from "Respond to Webhook" node
    let capturedWebhookResponse: {
      response: unknown;
      responseType: string;
      statusCode: number;
      headers: Record<string, string>;
    } | null = null;

    // Note: nodePosition will be set in the loop below for each node
    const baseContext = {
      userId,
      supabase,
      workflowId,
    };

    for (let i = 0; i < executionOrder.length; i++) {
      const node = executionOrder[i];
      const nodeStartTime = Date.now();

      console.log(`[Workflow] Executing node ${i + 1}/${executionOrder.length}: ${node.label}`);

      await job.updateProgress({
        status: 'executing',
        executionId,
        totalNodes: executionOrder.length,
        currentNode: i + 1,
        currentNodeLabel: node.label,
      });

      try {
        // If in split mode, execute for each item
        if (splitMode && splitItems.length > 0) {
          console.log(`[Workflow] Split mode: Executing ${node.label} for ${splitItems.length} items`);

          const itemResults: Array<{
            index: number;
            status: 'success' | 'error';
            result?: unknown;
            error?: string;
          }> = [];
          let successCount = 0;
          let errorCount = 0;

          // Execute items in batches for better performance
          const BATCH_SIZE = 5;
          for (let batchStart = 0; batchStart < splitItems.length; batchStart += BATCH_SIZE) {
            const batch = splitItems.slice(batchStart, batchStart + BATCH_SIZE);

            const batchPromises = batch.map(async (itemData, batchIdx) => {
              const itemIdx = batchStart + batchIdx;
              const itemPreview =
                (itemData.item as Record<string, unknown>)?.title ||
                (itemData as Record<string, unknown>).title ||
                `Item ${itemIdx + 1}`;

              console.log(`[Workflow] Processing item ${itemIdx + 1}/${splitItems.length}: "${itemPreview}"`);

              try {
                const itemResult = await executeNode(node, itemData, { ...baseContext, nodePosition: i });
                return {
                  index: itemIdx,
                  status: 'success' as const,
                  result: itemResult,
                };
              } catch (itemError) {
                console.error(`[Workflow] Item ${itemIdx + 1} failed:`, (itemError as Error).message);
                return {
                  index: itemIdx,
                  status: 'error' as const,
                  error: (itemError as Error).message,
                };
              }
            });

            const batchResults = await Promise.all(batchPromises);

            for (const br of batchResults) {
              itemResults.push(br);
              if (br.status === 'success') {
                successCount++;
              } else {
                errorCount++;
              }
            }

            // Update progress after each batch
            await job.updateProgress({
              status: 'executing',
              executionId,
              totalNodes: executionOrder.length,
              currentNode: i + 1,
              currentNodeLabel: node.label,
              splitProgress: {
                processed: batchStart + batch.length,
                total: splitItems.length,
                successCount,
                errorCount,
              },
            });
          }

          results.push({
            nodeId: node.id,
            nodeLabel: node.label || 'Unknown',
            status: errorCount === splitItems.length ? 'error' : 'success',
            splitExecution: true,
            itemsProcessed: splitItems.length,
            successCount,
            errorCount,
            durationMs: Date.now() - nodeStartTime,
          });

          console.log(
            `[Workflow] Node ${node.label} completed: ${successCount} success, ${errorCount} errors`
          );
        } else {
          // Normal single execution
          const result = await executeNode(node, currentData, { ...baseContext, nodePosition: i });

          // Check if this is a Split Out node
          if (
            result &&
            typeof result === 'object' &&
            '_splitItems' in result &&
            Array.isArray((result as Record<string, unknown>)._splitItems)
          ) {
            console.log(
              `[Workflow] Split Out detected: ${((result as Record<string, unknown>)._splitItems as unknown[]).length} items`
            );
            splitMode = true;
            splitItems = (result as Record<string, unknown>)._splitItems as Array<Record<string, unknown>>;

            results.push({
              nodeId: node.id,
              nodeLabel: node.label || 'Unknown',
              status: 'success',
              result: { splitOut: true, itemCount: splitItems.length },
              durationMs: Date.now() - nodeStartTime,
            });
          } else {
            // Check if this is a "Respond to Webhook" node output
            if (
              result &&
              typeof result === 'object' &&
              '_webhookResponse' in result
            ) {
              const resObj = result as Record<string, unknown>;
              console.log(`[Workflow] ✅ Captured webhook response from node: ${node.label}`);
              capturedWebhookResponse = {
                response: resObj._webhookResponse,
                responseType: (resObj._webhookResponseType as string) || 'json',
                statusCode: (resObj._webhookStatusCode as number) || 200,
                headers: (resObj._webhookHeaders as Record<string, string>) || {},
              };
            }

            results.push({
              nodeId: node.id,
              nodeLabel: node.label || 'Unknown',
              status: 'success',
              result,
              durationMs: Date.now() - nodeStartTime,
            });
            currentData = result || currentData;
          }

          console.log(`[Workflow] Node ${node.label} completed in ${Date.now() - nodeStartTime}ms`);
        }
      } catch (nodeError) {
        console.error(`[Workflow] Node ${node.label} failed:`, nodeError);
        results.push({
          nodeId: node.id,
          nodeLabel: node.label || 'Unknown',
          status: 'error',
          error: (nodeError as Error).message,
          durationMs: Date.now() - nodeStartTime,
        });
        // Stop execution on error
        break;
      }
    }

    // Calculate summary
    const totalSuccess = results.reduce(
      (sum, r) => sum + (r.successCount || (r.status === 'success' ? 1 : 0)),
      0
    );
    const totalErrors = results.reduce(
      (sum, r) => sum + (r.errorCount || (r.status === 'error' ? 1 : 0)),
      0
    );
    const totalDurationMs = Date.now() - startTime;

    // Update execution record
    if (execution?.id) {
      await supabase
        .from('workflow_executions')
        .update({
          status: totalErrors === 0 ? 'success' : 'error',
          completed_at: new Date().toISOString(),
          duration_ms: totalDurationMs,
          nodes_executed: results,
        })
        .eq('id', execution.id);
    }

    // Update workflow last_run
    await supabase
      .from('workflows')
      .update({ last_run: new Date().toISOString() })
      .eq('id', workflowId);

    // If this was triggered by webhook with logId, update the log
    if (logId) {
      // Build response body with proper webhookResponse for sync/webhook_node modes
      const responseBody: Record<string, unknown> = {
        success: totalErrors === 0 || totalSuccess > 0,
        pending: false,
        results,
        summary: { totalSuccess, totalErrors },
      };

      // If a "Respond to Webhook" node captured a response, use it
      if (capturedWebhookResponse) {
        console.log(`[Workflow] Using captured webhook response for log update`);
        responseBody.webhookResponse = capturedWebhookResponse.response;
        responseBody.webhookResponseType = capturedWebhookResponse.responseType;
        responseBody.webhookStatusCode = capturedWebhookResponse.statusCode;
        responseBody.webhookHeaders = capturedWebhookResponse.headers;
      } else {
        // For last_node mode: return the actual last node's output
        // This is what the user expects when using "when last node finishes"
        console.log(`[Workflow] No Respond to Webhook node - using last node output`);
        responseBody.webhookResponse = currentData;
      }

      const logStatusCode = capturedWebhookResponse?.statusCode || (totalErrors === 0 ? 200 : 500);

      await supabase
        .from('workflow_trigger_logs')
        .update({
          response_status: logStatusCode,
          response_body: responseBody,
          execution_time_ms: totalDurationMs,
        })
        .eq('id', logId);
    }

    console.log(`[Workflow] Execution completed in ${totalDurationMs}ms`);
    console.log(`[Workflow] Summary: ${totalSuccess} success, ${totalErrors} errors`);

    return {
      success: totalErrors === 0 || totalSuccess > 0,
      workflowId,
      executionId,
      nodesExecuted: results.length,
      results,
      totalDurationMs,
    };
  } catch (error) {
    console.error('[Workflow] Execution failed:', error);

    // Update log if exists
    if (logId) {
      await supabase
        .from('workflow_trigger_logs')
        .update({
          response_status: 500,
          response_body: {
            success: false,
            pending: false,
            error: (error as Error).message,
          },
          execution_time_ms: Date.now() - startTime,
        })
        .eq('id', logId);
    }

    throw error;
  }
}

export function createWorkflowWorker(): Worker<WorkflowJobData, WorkflowJobResult> {
  const worker = new Worker<WorkflowJobData, WorkflowJobResult>(
    QUEUE_NAMES.WORKFLOW_EXECUTION,
    processWorkflowJob,
    {
      connection: getRedisConnectionOptions(),
      concurrency: config.worker.concurrency,
      limiter: {
        max: 100,
        duration: 1000, // Max 100 jobs per second
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(
      `[Worker] Job ${job.id} completed: ${result.nodesExecuted} nodes, ${result.totalDurationMs}ms`
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  return worker;
}
