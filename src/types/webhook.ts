
export interface WebhookCallResult {
  clean_conversations?: {
    status?: string;
    call_info?: {
      language?: string;
      phone_numbers?: {
        user?: string;
      };
    };
    dialog?: Array<{
      speaker?: string;
      message?: string;
    }>;
    summary?: string;
    ''?: {
      cost_info?: {
        total_cost?: number;
      };
    };
    timestamps?: string;
  };
}

export interface WebhookResponse {
  completed?: boolean;
  calls?: WebhookCallResult[];
  batch_id?: string;
  response?: {
    body?: WebhookCallResult[];
    headers?: any;
    statusCode?: number;
  };
}
