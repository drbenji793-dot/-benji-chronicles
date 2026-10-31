-- Shared part storage, preserving all existing book part IDs and manuscript rows.
alter table public.chronicles_book_parts alter column book_id drop not null;
alter table public.chronicles_book_parts add column story_number integer check(story_number between 1 and 12), add column language text check(language in ('ar','en'));
alter table public.chronicles_book_parts add constraint chronicles_part_scope check((book_id is not null and story_number is null and language is null) or (book_id is null and story_number is not null and language is not null));
create unique index chronicles_legacy_part_start on public.chronicles_book_parts(story_number,language,start_chapter) where book_id is null;
alter policy parts_create on public.chronicles_book_parts with check((book_id is not null and exists(select 1 from public.chronicles_books b where b.id=book_id)) or (book_id is null and story_number between 1 and 12 and language in ('ar','en')));
grant insert(story_number,language),update(start_chapter) on public.chronicles_book_parts to anon,authenticated;
insert into public.chronicles_book_parts(story_number,language,start_chapter,title,updated_by)
select c.story_number,c.language,min(c.chapter_number),i.source_meta->>'part_title','Benji' from public.chronicles_chapters c join public.ink_entries i on i.id=c.source_entry_id where nullif(i.source_meta->>'part_title','') is not null group by c.story_number,c.language,i.source_meta->>'part_title';
alter policy chronicles_create_adaptation on public.chronicles_chapters with check(language in ('ar','en') and updated_by in ('Benji','Ahmed','Guest') and source_entry_id is null and length(btrim(title)) between 1 and 200 and length(body)<=2000000);
alter policy chronicles_book_entries_create on public.chronicles_book_entries with check(exists(select 1 from public.chronicles_books b where b.id=book_id) and kind in ('chapter','rules') and char_length(btrim(title)) between 1 and 200 and char_length(body)<=2000000 and updated_by in ('Benji','Ahmed','Guest'));
grant update(chapter_number) on public.chronicles_chapters,public.chronicles_book_entries to anon,authenticated;
-- Empty new chapters may be renamed; clearing written text remains prohibited.
create or replace function public.chronicles_before_save() returns trigger language plpgsql set search_path='' as $$
begin
 if length(trim(new.title))=0 or (new.body is distinct from old.body and length(trim(new.body))=0) then raise exception 'Title and chapter text are required';end if;
 new.revision=old.revision+1;new.updated_at=clock_timestamp();return new;
end $$;
create or replace function public.chronicles_new_entry_before_save() returns trigger language plpgsql set search_path='' as $$
begin
 if char_length(btrim(new.title))=0 then raise exception 'Title is required';end if;
 if TG_OP='UPDATE' then
  if new.body is distinct from old.body and char_length(btrim(regexp_replace(new.body,'<[^>]*>','','g')))=0 then raise exception 'Write text before saving';end if;
  if new.writing_meta='{}'::jsonb then select coalesce((select writing_meta from public.chronicles_book_versions where entry_id=old.id and revision=old.revision),'{}'::jsonb) into new.writing_meta;end if;
  new.revision=old.revision+1;
 else new.revision=1;end if;
 new.updated_at=clock_timestamp();return new;
end $$;
-- All chapter shifts and part boundaries commit together or roll back together.
create function public.chronicles_insert_chapter(p_book uuid,p_story integer,p_language text,p_part uuid,p_after uuid,p_title text,p_writer text,p_expected_count integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer; total integer; boundary integer; partrow public.chronicles_book_parts; r record; result jsonb;
begin
 if (p_book is null and (p_story is null or p_language is null)) or (p_book is not null and (p_story is not null or p_language is not null)) then raise exception 'Invalid book scope';end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 200 or p_writer is null or p_writer not in ('Benji','Ahmed','Guest') then raise exception 'Check title and writer';end if;
 perform pg_advisory_xact_lock(hashtextextended(coalesce(p_book::text,p_story::text||':'||p_language),0));
 if p_book is not null then select count(*) into total from public.chronicles_book_entries where book_id=p_book and kind='chapter';else select count(*) into total from public.chronicles_chapters where story_number=p_story and language=p_language;end if;
 if total<>p_expected_count then raise exception 'Chapters changed on another device. Reopen before adding.';end if;
 if p_part is not null then
  select * into partrow from public.chronicles_book_parts where id=p_part and (book_id=p_book or (book_id is null and p_book is null and story_number=p_story and language=p_language)) for update;
  if not found then raise exception 'Part does not belong to this book';end if;
  select min(start_chapter) into boundary from public.chronicles_book_parts where (book_id=p_book or (book_id is null and p_book is null and story_number=p_story and language=p_language)) and start_chapter>partrow.start_chapter;
 end if;
 if p_after is not null then
  if p_book is not null then select chapter_number+1 into n from public.chronicles_book_entries where id=p_after and book_id=p_book and kind='chapter';else select chapter_number+1 into n from public.chronicles_chapters where id=p_after and story_number=p_story and language=p_language;end if;
  if n is null or (p_part is not null and (n<=partrow.start_chapter or (boundary is not null and n>boundary))) then raise exception 'Choose a chapter within the selected part';end if;
 else
  if p_book is not null then select coalesce(max(chapter_number)+1,coalesce(partrow.start_chapter,1)) into n from public.chronicles_book_entries where book_id=p_book and kind='chapter' and chapter_number>=coalesce(partrow.start_chapter,1) and (boundary is null or chapter_number<boundary);
  else select coalesce(max(chapter_number)+1,coalesce(partrow.start_chapter,1)) into n from public.chronicles_chapters where story_number=p_story and language=p_language and chapter_number>=coalesce(partrow.start_chapter,1) and (boundary is null or chapter_number<boundary);end if;
 end if;
 if n>999 then raise exception 'Chapter limit reached';end if;
 if p_book is not null then
  for r in select id from public.chronicles_book_entries where book_id=p_book and kind='chapter' and chapter_number>=n order by chapter_number desc for update loop update public.chronicles_book_entries set chapter_number=chapter_number+1,updated_by=p_writer where id=r.id;end loop;
 else
  for r in select id from public.chronicles_chapters where story_number=p_story and language=p_language and chapter_number>=n order by chapter_number desc for update loop update public.chronicles_chapters set chapter_number=chapter_number+1,updated_by=p_writer where id=r.id;end loop;
 end if;
 for r in select id from public.chronicles_book_parts where (book_id=p_book or (book_id is null and p_book is null and story_number=p_story and language=p_language)) and start_chapter>=n and id is distinct from p_part order by start_chapter desc for update loop update public.chronicles_book_parts set start_chapter=start_chapter+1,updated_by=p_writer where id=r.id;end loop;
 if p_book is not null then insert into public.chronicles_book_entries(book_id,kind,chapter_number,title,body,updated_by,writing_meta) values(p_book,'chapter',n,btrim(p_title),'',p_writer,'{"method":"Manual"}') returning to_jsonb(chronicles_book_entries.*) into result;
 else insert into public.chronicles_chapters(story_number,language,chapter_number,title,body,updated_by) values(p_story,p_language,n,btrim(p_title),'',p_writer) returning to_jsonb(chronicles_chapters.*) into result;end if;
 return result;
end $$;
revoke all on function public.chronicles_insert_chapter(uuid,integer,text,uuid,uuid,text,text,integer) from public;
grant execute on function public.chronicles_insert_chapter(uuid,integer,text,uuid,uuid,text,text,integer) to anon,authenticated;
