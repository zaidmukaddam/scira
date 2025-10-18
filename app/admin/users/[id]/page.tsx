"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Profil utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">ID: {id}</div>
          <div className="text-sm">Graphiques, statistiques et historique à venir</div>
        </CardContent>
      </Card>
    </div>
  );
}
