import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabasePublishableKey } from '../src/cards/config';

const settings = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabasePublishableKey } }).then(r => r.json());
assert.equal(settings.external.anonymous_users, true, 'Enable anonymous sign-ins before running the live test.');
const clients: SupabaseClient[] = [];
const userIds: string[] = [];
let roomId: string | undefined;
function ok(result: { error: { message: string } | null }) { assert.equal(result.error?.message, undefined); }
function nextEvent() {
  let resolve!: (event: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  const timer = setTimeout(() => reject(new Error('Realtime event did not arrive in 15 seconds')), 15000);
  return { promise, receive(event: unknown) { clearTimeout(timer); resolve(event); }, cancel() { clearTimeout(timer); } };
}
try {
  for (let i = 0; i < 3; i++) {
    const client = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    clients.push(client);
    const result = await client.auth.signInAnonymously(); ok(result);
    userIds.push(result.data.user!.id);
    await client.realtime.setAuth(result.data.session!.access_token);
  }
  const [owner, friend, stranger] = clients as [SupabaseClient, SupabaseClient, SupabaseClient];
  const invite = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
  const created = await owner.rpc('create_cards_room', { invite_token: invite }); ok(created); roomId = created.data;
  const joined = await friend.rpc('join_cards_room', { invite_token: invite }); ok(joined); assert.equal(joined.data, roomId);
  const invalid = await stranger.rpc('join_cards_room', { invite_token: '0'.repeat(64) }); assert.ok(invalid.error);
  let friendEvent: ReturnType<typeof nextEvent> | undefined;
  let outsiderEvents = 0;
  for (const [client, name] of [[friend, 'friend'], [stranger, 'stranger']] as const) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${name} subscription timeout`)), 15000);
      client.channel(`verify-${name}-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards_questions', filter: `room_id=eq.${roomId}` }, payload => {
          if (name === 'stranger') outsiderEvents++; else friendEvent?.receive(payload);
        }).subscribe(status => { console.log(`${name} subscription: ${status}`); if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); } });
    });
  }
  const questionId = crypto.randomUUID();
  friendEvent = nextEvent();
  ok(await owner.from('cards_questions').insert({ id: questionId, room_id: roomId, text: 'Verification question — disposable test room', author: 'Test owner' }));
  await friendEvent.promise;
  console.log('Received live event.');
  let read = await friend.from('cards_questions').select('id,text,saved').eq('room_id', roomId); ok(read); assert.equal(read.data!.length, 1);
  friendEvent = nextEvent();
  ok(await friend.from('cards_questions').update({ saved: true }).eq('id', questionId));
  await friendEvent.promise;
  console.log('Received live event.');
  read = await owner.from('cards_questions').select('id,text,saved').eq('id', questionId); ok(read); assert.equal(read.data![0]!.saved, true);
  const hidden = await stranger.from('cards_questions').select('*').eq('room_id', roomId); ok(hidden); assert.deepEqual(hidden.data, []);
  const denied = await stranger.from('cards_questions').insert({ room_id: roomId, text: 'unauthorized', author: 'Stranger' }); assert.ok(denied.error);
  const forged = await stranger.from('cards_members').insert({ room_id: roomId, user_id: userIds[2] }); assert.ok(forged.error);
  const tampered = await friend.from('cards_questions').update({ text: 'tampered' }).eq('id', questionId); assert.ok(tampered.error);
  // The authorized listener already received both events; allow transport time
  // for an incorrectly authorized outsider listener before asserting isolation.
  await new Promise(resolve => setTimeout(resolve, 1500));
  assert.equal(outsiderEvents, 0);
  console.log('PASS: anonymous Auth, invite join, shared REST reads/writes, live INSERT/UPDATE, outsider REST and Realtime isolation.');
} finally {
  for (const client of clients) { await client.removeAllChannels(); await client.auth.signOut(); }
  await writeFile('../cards-test-cleanup.json', JSON.stringify({ roomId, userIds }));
  console.log('Disposable test IDs saved to work/cards-test-cleanup.json for cleanup.');
}
