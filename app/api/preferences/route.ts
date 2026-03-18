import { getUser } from '@/lib/auth-utils';
import { upsertUserPreferences } from '@/lib/db/queries';
import { clearUserPreferencesCache, getCachedUserPreferencesByUserId } from '@/lib/user-data-server';

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getCachedUserPreferencesByUserId(user.id);

    return Response.json(preferences);
  } catch (error) {
    console.error('Failed to fetch user preferences:', error);
    return Response.json({ error: 'Failed to fetch user preferences' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const preferences = body?.preferences;

    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      return Response.json({ error: 'Invalid preferences payload' }, { status: 400 });
    }

    const result = await upsertUserPreferences({
      userId: user.id,
      preferences,
    });

    clearUserPreferencesCache(user.id);

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    return Response.json({ error: 'Failed to save user preferences' }, { status: 500 });
  }
}
