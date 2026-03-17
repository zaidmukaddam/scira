'use server';

import {
  createConnection,
  listUserConnections,
  deleteConnection,
  manualSync,
  getSyncStatus,
  type ConnectorProvider,
} from '@/lib/connectors';
import { getComprehensiveUserData } from '@/lib/user-data-server';

export async function createConnectorAction(provider: ConnectorProvider) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) return { success: false, error: 'Authentication required' };

    const authLink = await createConnection(provider, user.id);
    return { success: true, authLink };
  } catch (error) {
    console.error('Error creating connector:', error);
    return { success: false, error: 'Failed to create connector' };
  }
}

export async function listUserConnectorsAction() {
  try {
    const user = await getComprehensiveUserData();
    if (!user) return { success: false, error: 'Authentication required', connections: [] };

    const connections = await listUserConnections(user.id);
    return { success: true, connections };
  } catch (error) {
    console.error('Error listing connectors:', error);
    return { success: false, error: 'Failed to list connectors', connections: [] };
  }
}

export async function deleteConnectorAction(connectionId: string) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) return { success: false, error: 'Authentication required' };

    const result = await deleteConnection(connectionId);
    return result ? { success: true } : { success: false, error: 'Failed to delete connector' };
  } catch (error) {
    console.error('Error deleting connector:', error);
    return { success: false, error: 'Failed to delete connector' };
  }
}

export async function manualSyncConnectorAction(provider: ConnectorProvider) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) return { success: false, error: 'Authentication required' };

    const result = await manualSync(provider, user.id);
    return result ? { success: true } : { success: false, error: 'Failed to start sync' };
  } catch (error) {
    console.error('Error syncing connector:', error);
    return { success: false, error: 'Failed to start sync' };
  }
}

export async function getConnectorSyncStatusAction(provider: ConnectorProvider) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) return { success: false, error: 'Authentication required', status: null };

    const status = await getSyncStatus(provider, user.id);
    return { success: true, status };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return { success: false, error: 'Failed to get sync status', status: null };
  }
}
