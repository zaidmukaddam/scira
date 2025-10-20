import { db } from '@/lib/db';
import { user, message, chat, event } from '@/lib/db/schema';
import { gte, desc } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        🔍 Vérification des Données dans la DB        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    // 1. Compter les utilisateurs
    const allUsers = await db.select().from(user);
    console.log(`👥 Total utilisateurs : ${allUsers.length}`);
    
    if (allUsers.length > 0) {
      console.log('\nPremiers utilisateurs :');
      allUsers.slice(0, 5).forEach((u: any) => {
        console.log(`  - ${u.name} (${u.id}) - Role: ${u.role}, Status: ${u.status}`);
      });
    }

    // 2. Compter les chats
    const allChats = await db.select().from(chat);
    console.log(`\n💬 Total chats : ${allChats.length}`);

    // 3. Compter les messages
    const allMessages = await db.select().from(message);
    console.log(`📨 Total messages : ${allMessages.length}`);

    // 4. Compter les messages des dernières 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = await db
      .select()
      .from(message)
      .where(gte(message.createdAt, since24h))
      .orderBy(desc(message.createdAt));
    
    console.log(`📊 Messages dernières 24h : ${recentMessages.length}`);
    
    if (recentMessages.length > 0) {
      console.log('\nExemples de messages récents :');
      recentMessages.slice(0, 3).forEach((m: any) => {
        console.log(`  - ${m.role} (${m.model || 'N/A'}) - ${m.createdAt.toISOString()}`);
      });
    }

    // 5. Compter les événements
    const allEvents = await db.select().from(event);
    console.log(`\n🔔 Total événements : ${allEvents.length}`);

    // 6. Vérifier les admins
    const admins = allUsers.filter((u: any) => u.role === 'admin');
    console.log(`\n👑 Admins trouvés : ${admins.length}`);
    admins.forEach((u: any) => {
      console.log(`  - ${u.name} (${u.id}) - Status: ${u.status}`);
    });

    console.log('\n✅ Vérification terminée avec succès !');
    console.log('\n💡 Si le dashboard est vide :');
    console.log('   1. Vérifiez que vous êtes bien connecté avec un compte admin');
    console.log('   2. Regardez la console navigateur (F12) pour voir les erreurs API');
    console.log('   3. Vérifiez que LOCAL_AUTH_SECRET est défini dans .env.local');
    console.log('   4. Testez : curl http://localhost:3000/api/admin/users (avec cookies)');

  } catch (error) {
    console.error('\n❌ Erreur lors de la vérification :', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('\n❌ Erreur fatale:', e);
    process.exit(1);
  });
