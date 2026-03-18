import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  json,
  varchar,
  integer,
  uuid,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { generateId } from 'ai';
import { InferSelectModel } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const chat = pgTable(
  'chat',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuidv7()),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    title: text('title').notNull().default('New Chat'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    visibility: varchar('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
  },
  (table) => [
    index('chat_userId_idx').on(table.userId),
    index('chat_userId_createdAt_idx').on(table.userId, table.createdAt),
    index('chat_userId_isPinned_updatedAt_idx').on(table.userId, table.isPinned, table.updatedAt),
  ],
);

export const message = pgTable(
  'message',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateId()),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // user, assistant, or tool
    parts: json('parts').notNull(), // Store parts as JSON in the database
    attachments: json('attachments').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    totalTokens: integer('total_tokens'),
    completionTime: real('completion_time'),
  },
  (table) => [
    index('message_chatId_idx').on(table.chatId),
    index('message_chatId_createdAt_idx').on(table.chatId, table.createdAt),
  ],
);

export const stream = pgTable(
  'stream',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [index('stream_chatId_idx').on(table.chatId)],
);

// Subscription table for Polar webhook data
export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    createdAt: timestamp('createdAt').notNull(),
    modifiedAt: timestamp('modifiedAt'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    recurringInterval: text('recurringInterval').notNull(),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('currentPeriodStart').notNull(),
    currentPeriodEnd: timestamp('currentPeriodEnd').notNull(),
    cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').notNull().default(false),
    canceledAt: timestamp('canceledAt'),
    startedAt: timestamp('startedAt').notNull(),
    endsAt: timestamp('endsAt'),
    endedAt: timestamp('endedAt'),
    customerId: text('customerId').notNull(),
    productId: text('productId').notNull(),
    discountId: text('discountId'),
    checkoutId: text('checkoutId').notNull(),
    customerCancellationReason: text('customerCancellationReason'),
    customerCancellationComment: text('customerCancellationComment'),
    metadata: text('metadata'), // JSON string
    customFieldData: text('customFieldData'), // JSON string
    userId: text('userId').references(() => user.id),
  },
  (table) => [
    index('subscription_userId_idx').on(table.userId),
    index('subscription_userId_status_idx').on(table.userId, table.status),
  ],
);

// Extreme search usage tracking table
export const extremeSearchUsage = pgTable(
  'extreme_search_usage',
  {
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
  },
  (table) => [
    index('extremeSearchUsage_userId_idx').on(table.userId),
    index('extremeSearchUsage_userId_date_idx').on(table.userId, table.date),
    // Unique constraint for atomic upserts (one record per user per month)
    uniqueIndex('extremeSearchUsage_userId_date_unique').on(table.userId, table.date),
  ],
);

// Message usage tracking table
export const messageUsage = pgTable(
  'message_usage',
  {
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
  },
  (table) => [
    index('messageUsage_userId_idx').on(table.userId),
    index('messageUsage_userId_date_idx').on(table.userId, table.date),
    // Unique constraint for atomic upserts (one record per user per day)
    uniqueIndex('messageUsage_userId_date_unique').on(table.userId, table.date),
  ],
);

// Custom instructions table
export const customInstructions = pgTable(
  'custom_instructions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('customInstructions_userId_idx').on(table.userId)],
);

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
      'scira-extreme-search-model'?:
        | 'scira-ext-1'
        | 'scira-ext-2'
        | 'scira-ext-4'
        | 'scira-ext-5'
        | 'scira-ext-6'
        | 'scira-ext-7'
        | 'scira-ext-8';
      'scira-group-order'?: string[];
      'scira-model-order-global'?: string[];
      'scira-blur-personal-info'?: boolean;
      'scira-custom-instructions-enabled'?: boolean;
      'scira-scroll-to-latest-on-open'?: boolean;
      'scira-location-metadata-enabled'?: boolean;
      'scira-auto-router-enabled'?: boolean;
      'scira-auto-router-config'?: {
        routes: Array<{
          name: string;
          description: string;
          model: string;
        }>;
      };
      'scira-preferred-models'?: string[];
      'scira-visible-modes'?: string[];
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
export const dodosubscription = pgTable(
  'dodosubscription',
  {
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
  },
  (table) => [
    index('dodosubscription_userId_idx').on(table.userId),
    index('dodosubscription_userId_status_idx').on(table.userId, table.status),
    index('dodosubscription_customerId_idx').on(table.customerId),
  ],
);

// Lookout table for scheduled searches
export const lookout = pgTable(
  'lookout',
  {
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
    searchMode: text('search_mode').notNull().default('extreme'), // Search mode: 'extreme', 'web', 'academic', 'youtube', 'reddit', 'github', 'stocks', 'crypto', 'code', 'x', 'chat'
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
  },
  (table) => [
    index('lookout_userId_idx').on(table.userId),
    index('lookout_userId_status_idx').on(table.userId, table.status),
  ],
);

export const userMcpServer = pgTable(
  'user_mcp_server',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    transportType: varchar('transport_type', { enum: ['http', 'sse'] })
      .notNull()
      .default('http'),
    url: text('url').notNull(),
    authType: varchar('auth_type', { enum: ['none', 'bearer', 'header', 'oauth'] })
      .notNull()
      .default('none'),
    encryptedCredentials: text('encrypted_credentials'),
    oauthIssuerUrl: text('oauth_issuer_url'),
    oauthAuthorizationUrl: text('oauth_authorization_url'),
    oauthTokenUrl: text('oauth_token_url'),
    oauthScopes: text('oauth_scopes'),
    oauthClientId: text('oauth_client_id'),
    oauthClientSecretEncrypted: text('oauth_client_secret_encrypted'),
    oauthAccessTokenEncrypted: text('oauth_access_token_encrypted'),
    oauthRefreshTokenEncrypted: text('oauth_refresh_token_encrypted'),
    oauthAccessTokenExpiresAt: timestamp('oauth_access_token_expires_at'),
    oauthConnectedAt: timestamp('oauth_connected_at'),
    oauthError: text('oauth_error'),
    isEnabled: boolean('is_enabled').notNull().default(true),
    disabledTools: json('disabled_tools').$type<string[]>().default([]),
    lastTestedAt: timestamp('last_tested_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('userMcpServer_userId_idx').on(table.userId),
    index('userMcpServer_userId_enabled_idx').on(table.userId, table.isEnabled),
  ],
);

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
  mcpServers: many(userMcpServer),
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

export const userMcpServerRelations = relations(userMcpServer, ({ one }) => ({
  user: one(user, {
    fields: [userMcpServer.userId],
    references: [user.id],
  }),
}));

export const buildSession = pgTable(
  'build_session',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    boxId: text('box_id'),
    runtime: text('runtime').notNull().default('node'),
    status: text('status').notNull().default('active'), // 'active', 'completed', 'error', 'deleted'
    snapshotId: text('snapshot_id'),
    totalCostUsd: real('total_cost_usd'),
    totalComputeMs: integer('total_compute_ms'),
    totalInputTokens: integer('total_input_tokens'),
    totalOutputTokens: integer('total_output_tokens'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('build_session_chatId_idx').on(table.chatId),
    index('build_session_userId_idx').on(table.userId),
    index('build_session_userId_status_idx').on(table.userId, table.status),
  ],
);

export const buildSessionRelations = relations(buildSession, ({ one }) => ({
  chat: one(chat, {
    fields: [buildSession.chatId],
    references: [chat.id],
  }),
  user: one(user, {
    fields: [buildSession.userId],
    references: [user.id],
  }),
}));

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
export type UserMcpServer = InferSelectModel<typeof userMcpServer>;
export type BuildSession = InferSelectModel<typeof buildSession>;
