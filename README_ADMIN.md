Admin Dashboard V1 “Lite”

1) Installation des variables d’environnement (.env)

Pusher (temps réel):
- PUSHER_APP_ID=...
- PUSHER_KEY=...
- PUSHER_SECRET=...
- PUSHER_CLUSTER=eu (ou autre)
- PUSHER_USE_TLS=true
- NEXT_PUBLIC_PUSHER_KEY=...
- NEXT_PUBLIC_PUSHER_CLUSTER=...

2) Migrations Drizzle

Un fichier SQL a été ajouté:
- drizzle/migrations/0008_admin_dashboard.sql

Il étend la table user (role, status, last_seen, ip_address, geo) et crée la table event avec ses index. Appliquez la migration via drizzle-kit ou votre outil habituel.

3) Seed initial (admin)

Un script TypeScript est fourni:
- scripts/seed-admin.ts

Il crée l’admin local sam/sam (users + user avec role=admin). Exécutez-le après avoir configuré DATABASE_URL.

4) Sécurité / requireAdmin

Toutes les routes /admin/* et /api/admin/* vérifient le rôle admin côté serveur. Le middleware redirige vers /sign-in si la session est absente. Ne déployez pas les routes Pusher en Edge: runtime Node.

5) Consentement géolocalisation

Le champ user.geo (jsonb) est prévu pour stocker des données de géolocalisation si et seulement si le consentement explicite de l’utilisateur est stocké (préférence ou champ dédié). Par défaut, seule l’IP est affichée. Intégrez un flux de consentement avant d’enrichir geo.

6) Canaux Pusher utilisés
- private-admin-users: mutations utilisateurs (created/updated)
- private-admin-events: nouveaux événements système/journaux
- presence-online: heartbeat de présence (admin)

7) Calcul des métriques
- Coût: 5$ / 1000 tokens via message.totalTokens (fallback input+output)
- Fenêtre: 24h pour metrics, 60s pour “en ligne”

8) UI
Les composants Orcish sont intégrés sous components/admin/orcish/* pour éviter les conflits. Le thème peut être changé via le sélecteur en haut.
