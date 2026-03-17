'use server';

import { getUser } from '@/lib/auth-utils';
import {
  getCustomInstructionsByUserId,
  createCustomInstructions,
  updateCustomInstructions,
  deleteCustomInstructions,
  upsertUserPreferences,
} from '@/lib/db/queries';
import { getCachedUserPreferencesByUserId, clearUserPreferencesCache } from '@/lib/user-data-server';

export async function getCustomInstructions(providedUser?: any) {
  try {
    const user = providedUser || (await getUser());
    if (!user) return null;

    return await getCustomInstructionsByUserId({ userId: user.id });
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}

export async function saveCustomInstructions(content: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'User not found' };
    if (!content.trim()) return { success: false, error: 'Content cannot be empty' };

    const existingInstructions = await getCustomInstructionsByUserId({ userId: user.id });

    const result = existingInstructions
      ? await updateCustomInstructions({ userId: user.id, content: content.trim() })
      : await createCustomInstructions({ userId: user.id, content: content.trim() });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving custom instructions:', error);
    return { success: false, error: 'Failed to save custom instructions' };
  }
}

export async function deleteCustomInstructionsAction() {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'User not found' };

    const result = await deleteCustomInstructions({ userId: user.id });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting custom instructions:', error);
    return { success: false, error: 'Failed to delete custom instructions' };
  }
}

export async function getUserPreferences(providedUser?: any) {
  try {
    const user = providedUser || (await getUser());
    if (!user) return null;

    return await getCachedUserPreferencesByUserId(user.id);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

export async function saveUserPreferences(
  preferences: Partial<{
    'scira-search-provider'?: 'exa' | 'parallel' | 'tavily' | 'firecrawl';
    'scira-extreme-search-provider'?: 'exa' | 'parallel';
    'scira-group-order'?: string[];
    'scira-model-order-global'?: string[];
    'scira-blur-personal-info'?: boolean;
    'scira-custom-instructions-enabled'?: boolean;
    'scira-location-metadata-enabled'?: boolean;
  }>,
) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'User not found' };

    const result = await upsertUserPreferences({ userId: user.id, preferences });
    clearUserPreferencesCache(user.id);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return { success: false, error: 'Failed to save user preferences' };
  }
}

export async function syncUserPreferences() {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'User not found' };

    return { success: true };
  } catch (error) {
    console.error('Error syncing user preferences:', error);
    return { success: false, error: 'Failed to sync user preferences' };
  }
}
