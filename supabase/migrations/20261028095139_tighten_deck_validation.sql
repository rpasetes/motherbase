alter table public.cards_questions drop constraint cards_questions_text_check;
alter table public.cards_questions add constraint cards_questions_text_check
  check (char_length(text) <= 500 and char_length(btrim(text)) > 0);
alter table public.cards_questions drop constraint cards_questions_author_check;
alter table public.cards_questions add constraint cards_questions_author_check
  check (char_length(author) <= 32 and char_length(btrim(author)) > 0);
create policy cards_rooms_no_direct_access on cards_private.rooms
  for all to authenticated using (false) with check (false);
