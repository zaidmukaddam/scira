'use server';

import { geolocation } from '@vercel/functions';
import { headers } from 'next/headers';
import { getComprehensiveUserData, getLightweightUserAuth } from '@/lib/user-data-server';
import { getChatWithUserById } from '@/lib/db/queries';

export async function getCurrentUser() {
  return await getComprehensiveUserData();
}

export async function getLightweightUser() {
  return await getLightweightUserAuth();
}

export async function getChatMeta(chatId: string) {
  if (!chatId) return null;

  try {
    const lightUserPromise = getLightweightUserAuth().catch(() => null);
    const chatPromise = getChatWithUserById({ id: chatId });
    const [lightUser, chat] = await Promise.all([lightUserPromise, chatPromise]);

    if (!chat) return null;

    const isOwner = lightUser?.userId ? chat.userId === lightUser.userId : false;

    return {
      id: chat.id,
      title: chat.title,
      visibility: chat.visibility as 'public' | 'private',
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      user: {
        id: chat.userId,
        name: chat.userName,
        email: chat.userEmail,
        image: chat.userImage,
      },
      isOwner,
    } as const;
  } catch (error) {
    console.error('Error in getChatMeta:', error);
    return null;
  }
}

export async function getUserCountryCode() {
  try {
    const headersList = await headers();
    const locationData = geolocation({ headers: headersList });
    return locationData.country || null;
  } catch (error) {
    console.error('Error getting geolocation:', error);
    return null;
  }
}

export async function getUserLocation() {
  try {
    const headersList = await headers();
    const locationData = geolocation({ headers: headersList });

    return {
      country: locationData.country || '',
      countryCode: locationData.country || '',
      city: locationData.city || '',
      region: locationData.region || '',
      isIndia: locationData.country === 'IN',
      loading: false,
    };
  } catch (error) {
    console.error('Failed to get location from Vercel:', error);
    return {
      country: 'Unknown',
      countryCode: '',
      city: '',
      region: '',
      isIndia: false,
      loading: false,
    };
  }
}
