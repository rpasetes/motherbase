begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  room uuid;
  token text := encode(sha256(gen_random_uuid()::text::bytea),'hex');
begin
  insert into auth.users(id,is_anonymous) values(owner_id,true);
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select public.create_cards_room(token) into room;
  insert into public.cards_questions(room_id,text,author) select room,'Question '||i,'Tester' from generate_series(1,30) i;
  begin
    insert into public.cards_questions(room_id,text,author) values(room,'Too fast','Tester');
    raise exception 'write rate limit failed';
  exception when program_limit_exceeded then null; end;
  execute 'reset role';
  update public.cards_questions set created_at=now()-interval '1 hour' where room_id=room;
  insert into public.cards_questions(room_id,text,author,created_by,created_at)
    select room,'Older '||i,'Tester',owner_id,now()-interval '1 hour' from generate_series(1,470) i;
  execute 'set local role authenticated';
  begin
    insert into public.cards_questions(room_id,text,author) values(room,'Too many','Tester');
    raise exception 'collection size limit failed';
  exception when program_limit_exceeded then null; end;
  execute 'reset role';
  perform set_config('cards_test.result','PASS: 30 questions/minute and 500 questions/room enforced',true);
end;
$$;
select current_setting('cards_test.result') as result;
rollback;
