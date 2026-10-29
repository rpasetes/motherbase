-- The private schema must never be added to Supabase's exposed API schemas.
create schema cards_private;
revoke all on schema cards_private from public, anon, authenticated;
grant usage on schema cards_private to authenticated;

create table cards_private.rooms (
  id uuid primary key default gen_random_uuid(),
  invite_hash bytea not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index cards_rooms_creator_idx on cards_private.rooms(created_by);
alter table cards_private.rooms enable row level security;
revoke all on cards_private.rooms from public, anon, authenticated;

create table public.cards_members (
  room_id uuid not null references cards_private.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, room_id)
);
create index cards_members_room_idx on public.cards_members(room_id);
alter table public.cards_members enable row level security;
revoke all on public.cards_members from public, anon, authenticated;
grant select on public.cards_members to authenticated;
create policy cards_members_self on public.cards_members for select to authenticated
  using (user_id = (select auth.uid()));

create table public.cards_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references cards_private.rooms(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 500),
  author text not null check (char_length(btrim(author)) between 1 and 32),
  saved boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index cards_questions_room_time_idx on public.cards_questions(room_id, created_at, id);
create index cards_questions_creator_idx on public.cards_questions(created_by);
alter table public.cards_questions enable row level security;
revoke all on public.cards_questions from public, anon, authenticated;
grant select on public.cards_questions to authenticated;
grant insert (id, room_id, text, author) on public.cards_questions to authenticated;
grant update (saved) on public.cards_questions to authenticated;
create policy cards_questions_read on public.cards_questions for select to authenticated
  using (room_id in (select room_id from public.cards_members where user_id = (select auth.uid())));
create policy cards_questions_add on public.cards_questions for insert to authenticated
  with check (created_by = (select auth.uid()) and saved = false
    and room_id in (select room_id from public.cards_members where user_id = (select auth.uid())));
create policy cards_questions_keep on public.cards_questions for update to authenticated
  using (room_id in (select room_id from public.cards_members where user_id = (select auth.uid())))
  with check (room_id in (select room_id from public.cards_members where user_id = (select auth.uid())));

-- Privilege is narrowly confined to invite redemption. Callers cannot insert
-- memberships directly or read invitation hashes. Only the digest is stored.
create function cards_private.enter_room(invite_token text, make_new boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result uuid;
  owner_id uuid;
  hashed bytea;
begin
  if caller is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if invite_token is null or invite_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid room invitation' using errcode = '22023';
  end if;
  hashed := pg_catalog.sha256(pg_catalog.convert_to(invite_token, 'UTF8'));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 0));
  select id, created_by into result, owner_id from cards_private.rooms where invite_hash = hashed;
  if make_new then
    if result is not null and owner_id <> caller then
      raise exception 'invalid room invitation' using errcode = '42501';
    end if;
    if result is null then
      if (select count(*) from cards_private.rooms where created_by = caller) >= 20 then
        raise exception 'room creation rate limit reached' using errcode = '54000';
      end if;
      insert into cards_private.rooms(invite_hash, created_by) values (hashed, caller) returning id into result;
    end if;
  elsif result is null then
    raise exception 'invalid room invitation' using errcode = '22023';
  end if;
  insert into public.cards_members(room_id, user_id) values (result, caller) on conflict do nothing;
  return result;
end;
$$;
revoke all on function cards_private.enter_room(text, boolean) from public, anon, authenticated;
grant execute on function cards_private.enter_room(text, boolean) to authenticated;

create function public.create_cards_room(invite_token text)
returns uuid language sql security invoker set search_path = '' as $$
  select cards_private.enter_room(invite_token, true);
$$;
create function public.join_cards_room(invite_token text)
returns uuid language sql security invoker set search_path = '' as $$
  select cards_private.enter_room(invite_token, false);
$$;
revoke all on function public.create_cards_room(text) from public, anon, authenticated;
revoke all on function public.join_cards_room(text) from public, anon, authenticated;
grant execute on function public.create_cards_room(text) to authenticated;
grant execute on function public.join_cards_room(text) to authenticated;

-- Bound collection size and writes; serialize inserts per room to enforce the
-- limits even when multiple clients add at the same time. RLS still applies.
create function cards_private.limit_questions()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.room_id::text, 1));
  if (select count(*) from public.cards_questions where room_id = new.room_id) >= 500 then
    raise exception 'room limit reached' using errcode = '54000';
  end if;
  if (select count(*) from public.cards_questions where room_id = new.room_id
      and created_by = auth.uid() and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'question rate limit reached' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function cards_private.limit_questions() from public, anon, authenticated;
create trigger cards_question_limits before insert on public.cards_questions
  for each row execute function cards_private.limit_questions();

alter publication supabase_realtime add table public.cards_questions;
