import 'dotenv/config';

export const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '10'),
    maxRetries: parseInt(process.env.WORKER_MAX_RETRIES || '3'),
  },
  apis: {
    groqApiKey: process.env.GROQ_API_KEY || '',
    amocrmClientId: process.env.AMOCRM_CLIENT_ID || '',
    amocrmClientSecret: process.env.AMOCRM_CLIENT_SECRET || '',
    bitrix24ClientId: process.env.BITRIX24_CLIENT_ID || '',
    bitrix24ClientSecret: process.env.BITRIX24_CLIENT_SECRET || '',
  },
};
