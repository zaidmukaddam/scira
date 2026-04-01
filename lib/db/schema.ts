import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, json, varchar, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { generateId } from 'ai';
import { InferSelectModel } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  countryCode: varchar('country_code', { length: 10 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  latitude: text('latitude'),
  longitude: text('longitude'),
  timezone: varchar('timezone', { length: 50 }),
  utcOffset: varchar('utc_offset', { length: 10 }),
  locationUpdatedAt: timestamp('location_updated_at', { withTimezone: true }),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const chat = pgTable('chat', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => uuidv7()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  title: text('title').notNull().default('New Chat'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export const message = pgTable('message', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  chatId: text('chat_id')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // model/token columns require a DB migration — run drizzle/migrations/create_missing_tables.sql
  // to add: model text, input_tokens int, output_tokens int, total_tokens int, completion_time real
});

export const stream = pgTable('stream', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  chatId: text('chat_id')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Subscription table for Polar webhook data
export const subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  modifiedAt: timestamp('modified_at', { withTimezone: true }),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull(),
  recurringInterval: text('recurring_interval').notNull(),
  status: text('status').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  customerId: text('customer_id').notNull(),
  productId: text('product_id').notNull(),
  discountId: text('discount_id'),
  checkoutId: text('checkout_id').notNull(),
  customerCancellationReason: text('customer_cancellation_reason'),
  customerCancellationComment: text('customer_cancellation_comment'),
  metadata: text('metadata'),
  customFieldData: text('custom_field_data'),
  userId: text('user_id').references(() => user.id),
});

// Extreme search usage tracking table
export const extremeSearchUsage = pgTable('extreme_search_usage', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  searchCount: integer('search_count').notNull().default(0),
  date: timestamp('date').notNull().defaultNow(),
  resetAt: timestamp('reset_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Message usage tracking table
export const messageUsage = pgTable('message_usage', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  messageCount: integer('message_count').notNull().default(0),
  date: timestamp('date').notNull().defaultNow(),
  resetAt: timestamp('reset_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Custom instructions table
export const customInstructions = pgTable('custom_instructions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User preferences table
export const userPreferences = pgTable('user_preferences', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  preferences: json('preferences')
    .$type<{
      'scira-search-provider'?: 'exa' | 'parallel' | 'tavily' | 'firecrawl';
      'scira-extreme-search-provider'?: 'exa' | 'parallel';
      'scira-group-order'?: string[];
      'scira-model-order-global'?: string[];
      'scira-blur-personal-info'?: boolean;
      'scira-custom-instructions-enabled'?: boolean;
      'scira-location-metadata-enabled'?: boolean;
    }>()
    .notNull()
    .default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Payment table for Dodo Payments webhook data
export const payment = pgTable('payment', {
  id: text('id').primaryKey(), // payment_id from webhook
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
  brandId: text('brand_id'),
  businessId: text('business_id'),
  cardIssuingCountry: text('card_issuing_country'),
  cardLastFour: text('card_last_four'),
  cardNetwork: text('card_network'),
  cardType: text('card_type'),
  currency: text('currency').notNull(),
  digitalProductsDelivered: boolean('digital_products_delivered').default(false),
  discountId: text('discount_id'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  paymentLink: text('payment_link'),
  paymentMethod: text('payment_method'),
  paymentMethodType: text('payment_method_type'),
  settlementAmount: integer('settlement_amount'),
  settlementCurrency: text('settlement_currency'),
  settlementTax: integer('settlement_tax'),
  status: text('status'),
  subscriptionId: text('subscription_id'),
  tax: integer('tax'),
  totalAmount: integer('total_amount').notNull(),
  // JSON fields for complex objects
  billing: json('billing'), // Billing address object
  customer: json('customer'), // Customer data object
  disputes: json('disputes'), // Disputes array
  metadata: json('metadata'), // Metadata object
  productCart: json('product_cart'), // Product cart array
  refunds: json('refunds'), // Refunds array
  // Foreign key to user
  userId: text('user_id').references(() => user.id),
});

// Dodo Subscription table for Dodo Payments subscription webhook data
export const dodosubscription = pgTable('dodosubscription', {
  id: text('id').primaryKey(), // subscription_id from webhook
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
  status: text('status').notNull(), // active, on_hold, cancelled, expired, failed
  productId: text('product_id').notNull(),
  customerId: text('customer_id').notNull(),
  businessId: text('business_id'),
  brandId: text('brand_id'),
  currency: text('currency').notNull(),
  amount: integer('amount').notNull(),
  interval: text('interval'), // monthly, yearly, etc.
  intervalCount: integer('interval_count'),
  trialPeriodDays: integer('trial_period_days'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelledAt: timestamp('cancelled_at'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  endedAt: timestamp('ended_at'),
  discountId: text('discount_id'),
  // JSON fields for complex objects
  customer: json('customer'), // Customer data object
  metadata: json('metadata'), // Metadata object
  productCart: json('product_cart'), // Product cart array
  // Foreign key to user
  userId: text('user_id').references(() => user.id),
});

// Lookout table for scheduled searches
export const lookout = pgTable('lookout', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  frequency: text('frequency').notNull(), // 'once', 'daily', 'weekly', 'monthly', 'yearly'
  cronSchedule: text('cron_schedule').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  nextRunAt: timestamp('next_run_at').notNull(),
  qstashScheduleId: text('qstash_schedule_id'),
  status: text('status').notNull().default('active'), // 'active', 'paused', 'archived', 'running'
  lastRunAt: timestamp('last_run_at'),
  lastRunChatId: text('last_run_chat_id'),
  // Store all run history as JSON
  runHistory: json('run_history')
    .$type<
      Array<{
        runAt: string; // ISO date string
        chatId: string;
        status: 'success' | 'error' | 'timeout';
        error?: string;
        duration?: number; // milliseconds
        tokensUsed?: number;
        searchesPerformed?: number;
      }>
    >()
    .default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  chats: many(chat),
  extremeSearchUsages: many(extremeSearchUsage),
  messageUsages: many(messageUsage),
  customInstructions: many(customInstructions),
  userPreferences: many(userPreferences),
  payments: many(payment),
  dodoSubscriptions: many(dodosubscription),
  lookouts: many(lookout),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  messages: many(message),
  streams: many(stream),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
}));

export const streamRelations = relations(stream, ({ one }) => ({
  chat: one(chat, {
    fields: [stream.chatId],
    references: [chat.id],
  }),
}));

export const lookoutRelations = relations(lookout, ({ one }) => ({
  user: one(user, {
    fields: [lookout.userId],
    references: [user.id],
  }),
}));

// ─── File Storage & RAG ─────────────────────────────────────────────────────

export const userFile = pgTable(
  'user_file',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    originalName: text('original_name').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    filePath: text('file_path').notNull(),
    fileUrl: text('file_url').notNull(),
    chatId: text('chat_id').references(() => chat.id, { onDelete: 'set null' }),
    messageId: text('message_id').references(() => message.id, { onDelete: 'set null' }),
    ragStatus: varchar('rag_status', {
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
    }).default('pending'),
    ragProcessedAt: timestamp('rag_processed_at'),
    ragError: text('rag_error'),
    chunkCount: integer('chunk_count').default(0),
    extractedText: text('extracted_text'),
    extractedTextLength: integer('extracted_text_length'),
    metadata: json('metadata').$type<{
      width?: number;
      height?: number;
      pageCount?: number;
      language?: string;
      [key: string]: any;
    }>(),
    source: varchar('source', {
      enum: ['chat', 'upload_page', 'api'],
    }).default('chat'),
    uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
    lastAccessedAt: timestamp('last_accessed_at'),
  },
  (table) => ({
    userIdIdx: { name: 'user_file_user_id_idx', columns: [table.userId] },
    uploadedAtIdx: { name: 'user_file_uploaded_at_idx', columns: [table.uploadedAt] },
    ragStatusIdx: { name: 'user_file_rag_status_idx', columns: [table.ragStatus] },
    chatIdIdx: { name: 'user_file_chat_id_idx', columns: [table.chatId] },
  }),
);

export const fileChunk = pgTable(
  'file_chunk',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    fileId: text('file_id')
      .notNull()
      .references(() => userFile.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    contentLength: integer('content_length').notNull(),
    embedding: json('embedding').$type<number[]>(),
    metadata: json('metadata').$type<{
      startChar?: number;
      endChar?: number;
      pageNumber?: number;
      section?: string;
      [key: string]: any;
    }>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    fileIdIdx: { name: 'file_chunk_file_id_idx', columns: [table.fileId] },
    userIdIdx: { name: 'file_chunk_user_id_idx', columns: [table.userId] },
    chunkIndexIdx: { name: 'file_chunk_chunk_index_idx', columns: [table.fileId, table.chunkIndex] },
  }),
);

// ─── Feedback System ────────────────────────────────────────────────────────

export const feedbackCategories = pgTable('feedback_categories', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  description: text('description'),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userFeedback = pgTable('user_feedback', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => feedbackCategories.id, { onDelete: 'set null' }),

  type: text('type').notNull(), // 'bug', 'feature', 'improvement', 'other'
  title: text('title').notNull(),
  description: text('description').notNull(),

  pageUrl: text('page_url').notNull(),
  userAgent: text('user_agent'),
  browserInfo: json('browser_info'),
  viewportSize: json('viewport_size'),

  previousPage: text('previous_page'),
  sessionDuration: integer('session_duration'),
  actionContext: json('action_context'),

  screenshotUrl: text('screenshot_url'),
  attachments: json('attachments').default([]),

  status: text('status').notNull().default('new'),
  priority: text('priority').default('medium'),

  adminNotes: text('admin_notes'),
  resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const feedbackUpdates = pgTable('feedback_updates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  feedbackId: text('feedback_id')
    .notNull()
    .references(() => userFeedback.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  updateType: text('update_type').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  comment: text('comment'),

  isInternal: boolean('is_internal').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const feedbackEmailQueue = pgTable('feedback_email_queue', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  feedbackId: text('feedback_id')
    .notNull()
    .references(() => userFeedback.id, { onDelete: 'cascade' }),
  recipientEmail: text('recipient_email').notNull(),
  emailType: text('email_type').notNull(),

  subject: text('subject').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text').notNull(),

  status: text('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── API Keys ────────────────────────────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix'),
  name: text('name').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  rateLimitRpm: integer('rate_limit_rpm').default(60).notNull(),
  rateLimitTpd: integer('rate_limit_tpd').default(10000000).notNull(),
  allowedModels: text('allowed_models')
    .array()
    .default(['llama-3.3', 'llama-4', 'deepseek-v3', 'deepseek-v3.1', 'deepseek-r1', 'gpt-oss-120b', 'magpie'])
    .notNull(),
  allowedTools: text('allowed_tools')
    .array()
    .default([
      'web_search', 'academic_search', 'youtube_search', 'reddit_search', 'x_search', 'extreme_search', 'trove_search',
      'code_interpreter', 'rag_search',
      'stock_price', 'stock_chart', 'stock_chart_simple', 'currency_converter', 'coin_data', 'coin_ohlc', 'coin_data_by_contract',
      'get_weather_data', 'find_place_on_map', 'nearby_places_search', 'flight_tracker', 'flight_live_tracker', 'travel_advisor',
      'movie_or_tv_search', 'trending_movies', 'trending_tv',
      'datetime', 'text_translate', 'mermaid_diagram', 'memory_manager', 'retrieve', 'greeting',
    ])
    .notNull(),
  metadata: json('metadata').default({}).notNull(),
});

export const apiUsage = pgTable('api_usage', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  apiKeyId: text('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  toolCalls: text('tool_calls').array(),
  responseTimeMs: integer('response_time_ms'),
  statusCode: integer('status_code').notNull(),
  error: text('error'),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;
export type Chat = InferSelectModel<typeof chat>;
export type Message = InferSelectModel<typeof message>;
export type Stream = InferSelectModel<typeof stream>;
export type Subscription = InferSelectModel<typeof subscription>;
export type Payment = InferSelectModel<typeof payment>;
export type DodoSubscription = InferSelectModel<typeof dodosubscription>;
export type ExtremeSearchUsage = InferSelectModel<typeof extremeSearchUsage>;
export type MessageUsage = InferSelectModel<typeof messageUsage>;
export type CustomInstructions = InferSelectModel<typeof customInstructions>;
export type UserPreferences = InferSelectModel<typeof userPreferences>;
export type Lookout = InferSelectModel<typeof lookout>;
export type FeedbackCategory = InferSelectModel<typeof feedbackCategories>;
export type UserFeedback = InferSelectModel<typeof userFeedback>;
export type FeedbackUpdate = InferSelectModel<typeof feedbackUpdates>;
export type FeedbackEmailQueue = InferSelectModel<typeof feedbackEmailQueue>;
export type ApiKey = InferSelectModel<typeof apiKeys>;
export type ApiUsage = InferSelectModel<typeof apiUsage>;
export type UserFile = InferSelectModel<typeof userFile>;
export type FileChunk = InferSelectModel<typeof fileChunk>;

// ─── Terms Acceptance ────────────────────────────────────────────────────────

export const userTermsAcceptance = pgTable(
  'user_terms_acceptance',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `terms_${generateId()}`),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    termsVersion: varchar('terms_version', { length: 20 }).notNull().default('1.0'),
    acceptedAt: timestamp('accepted_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_terms_unique_idx').on(table.userId, table.termsVersion)],
);

export type UserTermsAcceptance = InferSelectModel<typeof userTermsAcceptance>;
