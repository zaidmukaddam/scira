// Slack API types - minimal, type-exact definitions

export interface SlackInstallation {
  team_id: string;
  team_name?: string;
  enterprise_id?: string;
  bot_user_id: string;
  bot_token: string;
  installed_by_user_id?: string;
  scopes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface SlackChannel {
  id: string;
  team_id: string;
  name?: string;
  is_private?: boolean;
  indexed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface SlackMessage {
  id: string; // ts or channel:ts composite
  team_id: string;
  channel_id: string;
  user_id?: string;
  thread_ts?: string;
  text: string;
  created_at_ts: Date;
  json?: any;
  created_at?: Date;
}

export interface SlackMessageChunk {
  id?: string;
  team_id: string;
  channel_id: string;
  message_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  created_at?: Date;
}

// Slack Web API types
export interface SlackEventWrapper {
  token?: string;
  team_id?: string;
  api_app_id?: string;
  event?: SlackEvent;
  type?: string;
  event_id?: string;
  event_time?: number;
  challenge?: string; // For URL verification
}

export interface SlackEvent {
  type: string;
  user?: string;
  text?: string;
  ts?: string;
  channel?: string;
  thread_ts?: string;
  bot_id?: string;
  subtype?: string;
}

export interface SlackCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackOAuthV2Response {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    name: string;
    id: string;
  };
  enterprise?: {
    name: string;
    id: string;
  };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  error?: string;
}

export interface SlackConversationsHistoryResponse {
  ok: boolean;
  messages?: SlackHistoryMessage[];
  has_more?: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

export interface SlackHistoryMessage {
  type: string;
  user?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  bot_id?: string;
  subtype?: string;
  attachments?: any[];
  blocks?: any[];
}

export interface SlackConversationsInfoResponse {
  ok: boolean;
  channel?: {
    id: string;
    name: string;
    is_private: boolean;
    is_archived: boolean;
    is_member: boolean;
  };
  error?: string;
}

export interface SlackChatPostMessageResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
  message?: {
    text: string;
    user: string;
    ts: string;
  };
  error?: string;
}
