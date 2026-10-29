import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabasePublishableKey } from './config';

type Card = { id: string; text: string; author: string; saved: boolean; created_at: string };
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const ROOM_KEY = 'unfinished_business_supabase_room';
const NAME_KEY = 'unfinished_business_name';
const PENDING_KEY = 'unfinished_business_pending_card';
const tokenValid = (value: string | null): value is string => /^[a-f0-9]{64}$/.test(value || '');
const storage = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* The shared link still works. */ } },
  remove(key: string) { try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ } },
};
let cards: Card[] = [], current: Card | null = null, tab = 'all';
let client: SupabaseClient, channel: RealtimeChannel | undefined;
let roomId = '', roomToken = '', creating = false, ready = false, connecting = false;
let nickname = storage.get(NAME_KEY)?.trim().slice(0, 32) || '';
let realtimeConnected = false, adding = false;
const pendingSaves = new Set<string>();
let loadVersion = 0;

function sync(label: string, state = 'connecting') {
  el('sync').textContent = label;
  el('sync').parentElement!.dataset.state = state;
}
function showError(message: string, retry = false) {
  el('error').textContent = message;
  el('error').classList.remove('hidden');
  el('retry').classList.toggle('hidden', !retry);
}
function clearError() { el('error').classList.add('hidden'); el('retry').classList.add('hidden'); }
function message(error: unknown) {
  const value = error as { message?: string; code?: string };
  if (value?.message?.includes('Anonymous sign-ins are disabled')) return 'guest access is not enabled yet. please try again later.';
  if (value?.message?.includes('invalid room invitation')) return 'that room invitation is not valid. ask your friend for the full link.';
  if (value?.message?.includes('room limit')) return 'this deck has reached its 500-question limit.';
  if (value?.message?.includes('rate limit')) return 'a little too fast — wait a moment and try again.';
  return 'couldn’t reach your deck. check your connection and try again; your question stays here.';
}
function setLink() {
  const url = new URL(location.href);
  url.search = '';
  url.hash = new URLSearchParams({ room: roomToken }).toString();
  history.replaceState({}, '', url);
}
function prepareRoom() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const supplied = hash.get('room') ?? new URLSearchParams(location.search).get('room');
  if (supplied !== null && !tokenValid(supplied)) throw new Error('invalid room invitation');
  if (supplied) { roomToken = supplied; creating = false; }
  else {
    const remembered = storage.get(ROOM_KEY);
    if (tokenValid(remembered)) { roomToken = remembered; creating = false; }
    else {
      roomToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
      creating = true;
    }
  }
}
function render() {
  const kept = cards.filter(c => c.saved);
  el('counts').textContent = `${cards.length} question${cards.length === 1 ? '' : 's'} · ${kept.length} kept`;
  const visible = (tab === 'saved' ? kept : cards).slice().reverse();
  const list = el('list');
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    empty.textContent = !ready ? (connecting ? 'connecting to your deck…' : 'connect to your deck to see your questions.') : tab === 'saved' ? 'nothing set aside yet. save a card you want to revisit.' : 'the deck is empty. start by adding a question below.';
    list.append(empty);
  }
  for (const card of visible) {
    const box = document.createElement('div'); box.className = 'item';
    const content = document.createElement('div');
    const text = document.createElement('p'); text.textContent = card.text;
    const author = document.createElement('small'); author.textContent = `from ${card.author}${card.saved ? ' · ☆ kept' : ''}`;
    content.append(text, author);
    const button = document.createElement('button'); button.className = 'mini';
    button.textContent = card.saved ? 'unkeep' : '☆ keep';
    button.disabled = !ready || pendingSaves.has(card.id);
    button.setAttribute('aria-label', `${card.saved ? 'unkeep' : 'keep'} ${card.text}`);
    button.onclick = () => void toggleSaved(card);
    box.append(content, button); list.append(box);
  }
  current = cards.find(c => c.id === current?.id) || null;
  el('cardTag').textContent = current ? `the living deck · no. ${String(cards.findIndex(c => c.id === current!.id) + 1).padStart(2, '0')}` : 'the living deck · no. —';
  el('cardText').textContent = current?.text || (cards.length ? 'draw a card. see where it takes you.' : 'your next conversation is waiting.');
  el('cardAuthor').textContent = current ? `from ${current.author}` : 'made by both of you';
  el('cardStatus').textContent = current?.saved ? '★ saved for later' : '✦ take your time';
  el('save').textContent = current?.saved ? '★ kept for later' : '☆ keep for later';
  el<HTMLButtonElement>('save').disabled = !ready || !current || pendingSaves.has(current.id);
  el<HTMLButtonElement>('copy').disabled = !current;
  el<HTMLButtonElement>('draw').disabled = !cards.length;
  el<HTMLButtonElement>('share').disabled = !ready;
  el<HTMLButtonElement>('addButton').disabled = !ready || adding;
}
async function loadCards() {
  const version = ++loadVersion;
  const { data, error } = await client.from('cards_questions').select('id,text,author,saved,created_at').eq('room_id', roomId).order('created_at').order('id').limit(500);
  if (error) throw error;
  if (version !== loadVersion) return;
  cards = data as Card[]; render();
}
async function refresh() {
  if (!ready) return;
  try { await loadCards(); if (realtimeConnected) sync('live sync', 'live'); }
  catch { sync('reconnecting', 'offline'); showError('couldn’t refresh the deck. your saved questions are safe.', true); }
}
async function connect() {
  if (connecting) return;
  connecting = true; ready = false; realtimeConnected = false; clearError(); render(); sync('connecting');
  try {
    if (!supabaseUrl || !supabasePublishableKey) throw new Error('missing configuration');
    if (!roomToken) prepareRoom();
    client ||= createClient(supabaseUrl, supabasePublishableKey, { auth: { storageKey: 'unfinished-business-auth', detectSessionInUrl: false } });
    if (channel) { await client.removeChannel(channel); channel = undefined; }
    const { data: session, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session.session) {
      const { error } = await client.auth.signInAnonymously();
      if (error) throw error;
    }
    // Finish binding the guest identity before subscribing; the SDK's auth
    // notification updates realtime asynchronously on initial sign-in.
    const { data: activeAuth, error: activeAuthError } = await client.auth.getSession();
    if (activeAuthError || !activeAuth.session) throw activeAuthError || new Error('missing session');
    await client.realtime.setAuth(activeAuth.session.access_token);
    const { data, error } = await client.rpc(creating ? 'create_cards_room' : 'join_cards_room', { invite_token: roomToken });
    if (error) throw error;
    roomId = data as string; creating = false;
    storage.set(ROOM_KEY, roomToken); setLink();
    await loadCards(); ready = true; render(); sync('connecting live sync');
    channel = client.channel(`cards:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards_questions', filter: `room_id=eq.${roomId}` }, () => void refresh())
      .subscribe(status => {
        realtimeConnected = status === 'SUBSCRIBED';
        if (realtimeConnected) { clearError(); sync('live sync', 'live'); void refresh(); }
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          sync('reconnecting', 'offline');
          showError('live updates paused. reconnecting — your questions are saved.', true);
        }
      });
  } catch (error) { sync('offline', 'offline'); showError(message(error), true); }
  finally { connecting = false; render(); }
}
async function toggleSaved(card: Card) {
  if (!ready || pendingSaves.has(card.id)) return;
  pendingSaves.add(card.id); render();
  try {
    const { data, error } = await client.from('cards_questions').update({ saved: !card.saved }).eq('id', card.id).eq('room_id', roomId).select('id').single();
    if (error || !data) throw error || new Error('not updated');
    await loadCards(); clearError();
  } catch (error) { showError(message(error)); }
  finally { pendingSaves.delete(card.id); render(); }
}
el<HTMLFormElement>('addForm').onsubmit = async event => {
  event.preventDefault();
  if (!ready || adding) return;
  const field = el<HTMLTextAreaElement>('newQuestion');
  const text = field.value.trim();
  if (!text) { field.setCustomValidity('write a question first.'); field.reportValidity(); return; }
  adding = true; render();
  // Reuse the same ID after a lost acknowledgement so retrying cannot duplicate a question.
  let id = crypto.randomUUID() as string;
  try {
    const previous = JSON.parse(storage.get(PENDING_KEY) || 'null');
    if (previous?.roomId === roomId && previous?.text === text && previous?.author === nickname) id = previous.id;
  } catch { /* Ignore a damaged draft. */ }
  storage.set(PENDING_KEY, JSON.stringify({ id, roomId, text, author: nickname }));
  try {
    const { error } = await client.from('cards_questions').insert({ id, room_id: roomId, text, author: nickname });
    if (error) {
      if (error.code !== '23505') throw error;
      const { data, error: readError } = await client.from('cards_questions').select('id,text,author').eq('id', id).eq('room_id', roomId).single();
      if (readError || data?.text !== text || data?.author !== nickname) throw error;
    }
    storage.remove(PENDING_KEY); if (field.value.trim() === text) field.value = '';
    await loadCards(); clearError();
  } catch (error) { showError(message(error)); }
  finally { adding = false; render(); }
};
el<HTMLTextAreaElement>('newQuestion').oninput = () => el<HTMLTextAreaElement>('newQuestion').setCustomValidity('');
el<HTMLFormElement>('nameForm').onsubmit = event => {
  event.preventDefault(); nickname = el<HTMLInputElement>('nameInput').value.trim().slice(0, 32);
  if (!nickname) return;
  storage.set(NAME_KEY, nickname); el('welcome').classList.add('hidden'); document.querySelector('main')!.inert = false; el('draw').focus(); void connect();
};
el('draw').onclick = () => {
  const others = cards.filter(c => c.id !== current?.id);
  const pool = others.length ? others : cards;
  current = pool[Math.floor(Math.random() * pool.length)] || null; render();
};
el('save').onclick = () => { if (current) void toggleSaved(current); };
el('retry').onclick = () => void connect();
el('copy').onclick = async () => {
  if (!current) return;
  try { await navigator.clipboard.writeText(current.text); el('copy').textContent = 'copied ✓'; setTimeout(() => el('copy').textContent = 'copy question', 1500); }
  catch { showError('copy unavailable. you can select the card text instead.'); }
};
el('share').onclick = async () => {
  const url = `${location.origin}/cards#${new URLSearchParams({ room: roomToken })}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'unfinished business', text: 'come add to our living question deck', url }); return; }
    catch (error) { if ((error as Error).name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); el('share').textContent = 'link copied ✓'; setTimeout(() => el('share').textContent = 'share this room ↗', 1500); }
  catch { window.prompt('copy this room link:', url); }
};
document.querySelectorAll<HTMLButtonElement>('.tab').forEach(button => button.onclick = () => {
  tab = button.dataset.tab!;
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  render();
});
window.addEventListener('online', () => { if (nickname) void connect(); });
window.addEventListener('offline', () => { realtimeConnected = false; sync('offline', 'offline'); });
window.addEventListener('hashchange', () => location.reload());
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
render();
if (nickname) void connect();
else { document.querySelector('main')!.inert = true; el('welcome').classList.remove('hidden'); el('nameInput').focus(); }
