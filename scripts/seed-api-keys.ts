import { db } from '@/lib/db';
import { geminiApiKeys } from '@/lib/db/schema';
import { encrypt } from '@/lib/encryption';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function seedApiKeys() {
  console.log('🌱 Starting API keys seed...\n');

  try {
    // Check if keys already exist
    const existingKeys = await db.select().from(geminiApiKeys);

    if (existingKeys.length > 0) {
      console.log(`⚠️  Already have ${existingKeys.length} keys in the database`);
      return;
    }

    // Get API keys from environment
    const apiKeys = [];
    for (let i = 1; i <= 5; i++) {
      const keyEnv = `GEMINI_API_KEY_${i}`;
      const key = process.env[keyEnv];
      if (key) {
        apiKeys.push(key);
      }
    }

    if (apiKeys.length === 0) {
      console.warn('❌ No GEMINI_API_KEY_* environment variables found');
      console.warn('Please set GEMINI_API_KEY_1 through GEMINI_API_KEY_5 in your .env.local');
      return;
    }

    console.log(`Found ${apiKeys.length} API keys to seed\n`);

    // Insert keys
    for (let i = 0; i < apiKeys.length; i++) {
      const encryptedKey = encrypt(apiKeys[i]);

      await db.insert(geminiApiKeys).values({
        id: `key-${i + 1}`,
        key: encryptedKey,
        displayName: `API Key ${i + 1}`,
        priority: i + 1,
        enabled: true,
        isActive: i === 0, // Make first key active
        isPrimary: i === 0, // Make first key primary
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Created API Key ${i + 1} (priority: ${i + 1}, active: ${i === 0})`);
    }

    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedApiKeys();
