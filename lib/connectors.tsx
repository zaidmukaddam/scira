import { JSX, SVGProps } from 'react';
import Supermemory from 'supermemory';

function getClient() {
  return new Supermemory({
    apiKey: process.env.SUPERMEMORY_API_KEY!,
  });
}

export type ConnectorProvider = 'google-drive' | 'notion' | 'onedrive';

export interface ConnectorConfig {
  name: string;
  description: string;
  icon: string;
  documentLimit: number;
  syncTag: string;
}

const GoogleDrive = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78" width="1em" height="1em" {...props}>
    <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" />
    <path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z" />
    <path
      fill="#ea4335"
      d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"
    />
    <path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" />
    <path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
    <path
      fill="#ffba00"
      d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"
    />
  </svg>
);

const Notion = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    preserveAspectRatio="xMidYMid"
    viewBox="0 0 256 268"
    {...props}
  >
    <path
      fill="#FFF"
      d="M16.092 11.538 164.09.608c18.179-1.56 22.85-.508 34.28 7.801l47.243 33.282C253.406 47.414 256 48.975 256 55.207v182.527c0 11.439-4.155 18.205-18.696 19.24L65.44 267.378c-10.913.517-16.11-1.043-21.825-8.327L8.826 213.814C2.586 205.487 0 199.254 0 191.97V29.726c0-9.352 4.155-17.153 16.092-18.188Z"
    />
    <path d="M164.09.608 16.092 11.538C4.155 12.573 0 20.374 0 29.726v162.245c0 7.284 2.585 13.516 8.826 21.843l34.789 45.237c5.715 7.284 10.912 8.844 21.825 8.327l171.864-10.404c14.532-1.035 18.696-7.801 18.696-19.24V55.207c0-5.911-2.336-7.614-9.21-12.66l-1.185-.856L198.37 8.409C186.94.1 182.27-.952 164.09.608ZM69.327 52.22c-14.033.945-17.216 1.159-25.186-5.323L23.876 30.778c-2.06-2.086-1.026-4.69 4.163-5.207l142.274-10.395c11.947-1.043 18.17 3.12 22.842 6.758l24.401 17.68c1.043.525 3.638 3.637.517 3.637L71.146 52.095l-1.819.125Zm-16.36 183.954V81.222c0-6.767 2.077-9.887 8.3-10.413L230.02 60.93c5.724-.517 8.31 3.12 8.31 9.879v153.917c0 6.767-1.044 12.49-10.387 13.008l-161.487 9.361c-9.343.517-13.489-2.594-13.489-10.921ZM212.377 89.53c1.034 4.681 0 9.362-4.681 9.897l-7.783 1.542v114.404c-6.758 3.637-12.981 5.715-18.18 5.715-8.308 0-10.386-2.604-16.609-10.396l-50.898-80.079v77.476l16.1 3.646s0 9.362-12.989 9.362l-35.814 2.077c-1.043-2.086 0-7.284 3.63-8.318l9.351-2.595V109.823l-12.98-1.052c-1.044-4.68 1.55-11.439 8.826-11.965l38.426-2.585 52.958 81.113v-71.76l-13.498-1.552c-1.043-5.733 3.111-9.896 8.3-10.404l35.84-2.087Z" />
  </svg>
);

const OneDrive = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    preserveAspectRatio="xMidYMid"
    {...props}
  >
    <path fill="#F1511B" d="M121.666 121.666H0V0h121.666z" />
    <path fill="#80CC28" d="M256 121.666H134.335V0H256z" />
    <path fill="#00ADEF" d="M121.663 256.002H0V134.336h121.663z" />
    <path fill="#FBBC09" d="M256 256.002H134.335V134.336H256z" />
  </svg>
);

// Icon components mapping
export const CONNECTOR_ICONS: Record<string, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  'google-drive': GoogleDrive,
  notion: Notion,
  onedrive: OneDrive,
};

export const CONNECTOR_CONFIGS: Record<ConnectorProvider, ConnectorConfig> = {
  'google-drive': {
    name: 'Google Drive',
    description: 'Search through documents, spreadsheets, and presentations from Google Drive',
    icon: 'google-drive',
    documentLimit: 3000,
    syncTag: 'gdrive-sync',
  },
  notion: {
    name: 'Notion',
    description: 'Search through pages and databases from your Notion workspace',
    icon: 'notion',
    documentLimit: 2000,
    syncTag: 'notion-workspace',
  },
  onedrive: {
    name: 'OneDrive',
    description: 'Search through documents and files from Microsoft OneDrive (Coming Soon)',
    icon: 'onedrive',
    documentLimit: 3000,
    syncTag: 'onedrive-sync',
  },
};

function getBaseUrl() {
  if (process.env.NODE_ENV === 'development') {
    return process.env.NGROK_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
  } else if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_VERCEL_URL !== 'https://scira.ai') {
    return process.env.NEXT_PUBLIC_VERCEL_URL;
  }
  return 'https://scira.ai';
}

export async function createConnection(provider: ConnectorProvider, userId: string) {
  console.log(`🔗 Creating connection for ${provider}, userId: ${userId}`);

  // OneDrive is coming soon, prevent connections
  if (provider === 'onedrive') {
    throw new Error('OneDrive connector is coming soon');
  }

  const client = getClient();
  const config = CONNECTOR_CONFIGS[provider];
  const baseUrl = getBaseUrl();

  console.log(`📡 Using base URL: ${baseUrl}`);
  console.log(`🏷️ Container tags: [${userId}, ${config.syncTag}]`);

  const connection = await client.connections.create(provider, {
    redirectUrl: `${baseUrl}/connectors/${provider}/callback`,
    containerTags: [userId, config.syncTag],
    documentLimit: config.documentLimit,
    metadata: {
      source: provider,
      userId,
    },
  });

  console.log(`✅ ${config.name} connection created successfully`);
  console.log(`⏰ Auth expires in:`, connection.expiresIn);
  console.log(`🔗 Auth link:`, connection.authLink);

  return connection.authLink;
}

// Legacy function for backward compatibility
export async function createGoogleDriveConnection(userId: string) {
  return createConnection('google-drive', userId);
}

// Get connection details for a specific provider
export async function getConnection(provider: ConnectorProvider, userId: string) {
  console.log(`🔍 Getting connection for ${provider}, userId: ${userId}`);
  try {
    const client = getClient();
    const config = CONNECTOR_CONFIGS[provider];
    console.log(`🏷️ Searching with container tags: [${userId}, ${config.syncTag}]`);

    const connection = await client.connections.getByTags(provider, {
      containerTags: [userId, config.syncTag],
    });

    if (!connection) {
      console.log(`❌ No connection found for ${provider}`);
      return null;
    }

    console.log(`✅ Found connection for ${provider}:`, {
      id: connection.id,
      email: connection.email,
      createdAt: connection.createdAt,
      expiresAt: connection.expiresAt,
    });
    return connection;
  } catch (error) {
    console.error(`❌ Error getting ${CONNECTOR_CONFIGS[provider].name} connection:`, error);
    return null;
  }
}

// List all connections for a user
export async function listUserConnections(userId: string) {
  try {
    console.log('listing user connections', userId);
    const client = getClient();

    // Get all providers and their sync tags
    const providers = Object.keys(CONNECTOR_CONFIGS) as ConnectorProvider[];

    // Search for connections for each provider separately
    const connectionPromises = providers.map(async (provider) => {
      try {
        const config = CONNECTOR_CONFIGS[provider];
        const connections = await client.connections.list({
          containerTags: [userId, config.syncTag],
        });
        return connections || [];
      } catch (error) {
        console.error(`Error fetching connections for ${provider}:`, error);
        return [];
      }
    });

    const allConnections = await Promise.all(connectionPromises);
    const flatConnections = allConnections.flat();

    console.log('connections list', flatConnections);
    if (!flatConnections || flatConnections.length === 0) {
      return [];
    }

    return flatConnections.map((conn) => ({
      ...conn,
      config: CONNECTOR_CONFIGS[conn.provider as ConnectorProvider] || {
        name: conn.provider,
        description: `Connected ${conn.provider} account`,
        icon: '🔗',
        documentLimit: conn.documentLimit,
        syncTag: `${conn.provider}-sync`,
      },
    }));
  } catch (error) {
    console.error('Error listing user connections:', error);
    return [];
  }
}

// Delete connection by ID
export async function deleteConnection(connectionId: string) {
  console.log(`🗑️ Deleting connection with ID: ${connectionId}`);
  try {
    const client = getClient();
    const result = await client.connections.deleteByID(connectionId);
    console.log(`✅ Successfully deleted connection:`, result.id);
    return result;
  } catch (error) {
    console.error(`❌ Error deleting connection ${connectionId}:`, error);
    return null;
  }
}

// Trigger manual sync for a specific provider
export async function manualSync(provider: ConnectorProvider, userId: string) {
  console.log(`🔄 Starting manual sync for ${provider}, userId: ${userId}`);
  try {
    const client = getClient();
    const config = CONNECTOR_CONFIGS[provider];
    console.log(`🏷️ Syncing with container tags: [${userId}, ${config.syncTag}]`);

    const result = await client.connections.import(provider, {
      containerTags: [userId],
    });

    console.log(`✅ Manual sync initiated successfully for ${config.name}`);
    console.log(`📊 Sync result:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error triggering manual sync for ${CONNECTOR_CONFIGS[provider].name}:`, error);
    return null;
  }
}

// Get sync status for a provider
export async function getSyncStatus(provider: ConnectorProvider, userId: string) {
  console.log(`📊 Getting sync status for ${provider}, userId: ${userId}`);
  try {
    const client = getClient();
    const config = CONNECTOR_CONFIGS[provider];
    console.log(`🏷️ Status check with container tags: [${userId}, ${config.syncTag}]`);

    // Get connection details using the direct API call
    const connection = await client.connections.getByTags(provider, {
      containerTags: [userId, config.syncTag],
    });

    if (!connection) {
      console.log(`❌ No connection found for ${provider} status check`);
      return null;
    }

    console.log('connection', connection);

    console.log(`✅ Connection found for ${provider}, extracting document count from metadata...`);

    let actualDocumentCount = 0;

    // Different providers use different methods for document count
    if (provider === 'google-drive') {
      // Google Drive uses pageToken in metadata to indicate synced documents
      const pageToken = connection.metadata?.pageToken;
      actualDocumentCount = typeof pageToken === 'number' ? pageToken : 0;
      console.log('Google Drive pageToken count:', actualDocumentCount);
    } else {
      // Other providers (Notion, OneDrive) use listDocuments API
      try {
        const documentCount = await client.connections.listDocuments(provider, {
          containerTags: [userId, config.syncTag],
        });

        console.log('documentCount for', provider, ':', documentCount);

        // Handle different response formats from listDocuments
        if (Array.isArray(documentCount)) {
          actualDocumentCount = documentCount.length;
        } else if (typeof documentCount === 'object' && documentCount !== null) {
          // If it's an object with a count property or similar
          actualDocumentCount = (documentCount as any).count || (documentCount as any).length || 0;
        } else if (typeof documentCount === 'number') {
          actualDocumentCount = documentCount;
        }
      } catch (error) {
        console.error(`Error getting document count for ${provider}:`, error);
        actualDocumentCount = 0;
      }
    }

    const status = {
      isConnected: true,
      documentCount: actualDocumentCount,
      lastSync: connection.createdAt,
      email: connection.email,
      status: 'active',
    };

    console.log(`📈 Sync status for ${provider}:`, status);
    return status;
  } catch (error) {
    console.error(`❌ Error getting sync status for ${CONNECTOR_CONFIGS[provider].name}:`, error);
    return null;
  }
}

// Legacy functions for backward compatibility
export async function getGoogleDriveConnection(userId: string) {
  return getConnection('google-drive', userId);
}

export async function listGoogleDriveConnections(userId: string) {
  const connections = await listUserConnections(userId);
  return connections.filter((conn) => conn.provider === 'google-drive');
}

export async function deleteGoogleDriveConnection(connectionId: string) {
  return deleteConnection(connectionId);
}

export async function manualSyncGoogleDrive(userId: string) {
  return manualSync('google-drive', userId);
}
