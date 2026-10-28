-- Run against the dedicated Supabase project. Every fixture is rolled back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  friend_id uuid := gen_random_uuid();
  stranger_id uuid := gen_random_uuid();
  room uuid;
  card uuid := gen_random_uuid();
  token text := encode(sha256(gen_random_uuid()::text::bytea), 'hex');
  n integer;
begin
  insert into auth.users(id, is_anonymous) values (owner_id, true), (friend_id, true), (stranger_id, true);
  perform set_config('request.jwt.claims', json_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select public.create_cards_room(token) into room;
  if public.create_cards_room(token) <> room then raise exception 'create retry was not idempotent'; end if;
  insert into public.cards_questions(id,room_id,text,author) values (card,room,'What should we return to?','Owner');
  if (select count(*) from public.cards_questions) <> 1 then raise exception 'owner read failed'; end if;
  begin
    update public.cards_questions set text='tampered' where id=card;
    raise exception 'text mutation was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.cards_questions set room_id=gen_random_uuid() where id=card;
    raise exception 'room reassignment was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cards_questions(room_id,text,author,created_by) values (room,'spoof','Owner',friend_id);
    raise exception 'author identity spoofing was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cards_questions(room_id,text,author) values (room,repeat(' ',501)||'x','Owner');
    raise exception 'oversized question was allowed';
  exception when check_violation then null; end;
  begin
    insert into public.cards_questions(room_id,text,author) values (room,'  ','Owner');
    raise exception 'empty question was allowed';
  exception when check_violation then null; end;
  begin
    delete from public.cards_questions where id=card;
    raise exception 'deletion was allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform * from cards_private.rooms;
    raise exception 'invitation hashes were exposed';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claims', json_build_object('sub',stranger_id,'role','authenticated')::text,true);
  if (select count(*) from public.cards_questions) <> 0 then raise exception 'stranger read leaked'; end if;
  update public.cards_questions set saved=true where id=card;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'stranger update succeeded'; end if;
  begin
    insert into public.cards_questions(room_id,text,author) values (room,'intruder','Stranger');
    raise exception 'stranger insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cards_members(room_id,user_id) values (room,stranger_id);
    raise exception 'membership forgery succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.join_cards_room(repeat('0',64));
    raise exception 'unknown invitation accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.join_cards_room('short');
    raise exception 'malformed invitation accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.create_cards_room(token);
    raise exception 'stranger create hijacked room';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claims', json_build_object('sub',friend_id,'role','authenticated')::text,true);
  if public.join_cards_room(token) <> room then raise exception 'friend join failed'; end if;
  if public.join_cards_room(token) <> room then raise exception 'join retry failed'; end if;
  if (select count(*) from public.cards_questions) <> 1 then raise exception 'friend read failed'; end if;
  update public.cards_questions set saved=true where id=card;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'friend keep failed'; end if;
  insert into public.cards_questions(room_id,text,author) values (room,'A second question','Friend');
  if (select count(*) from public.cards_members) <> 1 then raise exception 'other memberships leaked'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub',owner_id,'role','authenticated')::text,true);
  if not (select saved from public.cards_questions where id=card) then raise exception 'keep was not shared'; end if;
  if (select count(*) from public.cards_questions) <> 2 then raise exception 'friend question missing'; end if;
  execute 'reset role';
  execute 'set local role anon';
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform * from public.cards_questions;
    raise exception 'unauthenticated read allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.join_cards_room(token);
    raise exception 'unauthenticated join allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('cards_test.result','PASS: create/join/retry, shared read/add/keep, outsider isolation, mutation restrictions, validation, invite privacy, unauthenticated denial',true);
end;
$$;
select current_setting('cards_test.result') as result;
rollback;
