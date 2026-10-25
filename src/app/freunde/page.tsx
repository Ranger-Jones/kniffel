import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { listFriends } from '@/server/social-service';
import { FriendsClient } from './friends-client';

export const metadata: Metadata = { title: 'Freunde' };

export default async function FriendsPage() {
  const user = await requireUser();
  const lists = await listFriends(createAdminClient(), user.id);
  return <FriendsClient me={user.id} lists={lists} />;
}
