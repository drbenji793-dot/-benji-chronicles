-- Add the requested Guest 2 author label. Preserve every other check, policy and function guard.
ALTER TABLE public.chronicles_book_parts DROP CONSTRAINT chronicles_book_parts_updated_by_check;
ALTER TABLE public.chronicles_book_parts ADD CONSTRAINT chronicles_book_parts_updated_by_check CHECK ((updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text])));
ALTER TABLE public.chronicles_dsl_branches DROP CONSTRAINT chronicles_dsl_branches_updated_by_check;
ALTER TABLE public.chronicles_dsl_branches ADD CONSTRAINT chronicles_dsl_branches_updated_by_check CHECK ((updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text, 'GPT'::text])));
ALTER TABLE public.chronicles_dsl_projects DROP CONSTRAINT chronicles_dsl_projects_updated_by_check;
ALTER TABLE public.chronicles_dsl_projects ADD CONSTRAINT chronicles_dsl_projects_updated_by_check CHECK ((updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text, 'GPT'::text])));
ALTER TABLE public.chronicles_story_resources DROP CONSTRAINT chronicles_story_resources_updated_by_check;
ALTER TABLE public.chronicles_story_resources ADD CONSTRAINT chronicles_story_resources_updated_by_check CHECK ((updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text])));
ALTER POLICY chronicles_book_entries_create ON public.chronicles_book_entries WITH CHECK (((EXISTS ( SELECT 1
   FROM chronicles_books b
  WHERE (b.id = chronicles_book_entries.book_id))) AND (kind = ANY (ARRAY['chapter'::text, 'rules'::text])) AND ((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 200)) AND (char_length(body) <= 2000000) AND (updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text]))));
ALTER POLICY chronicles_book_notes_resolve ON public.chronicles_book_notes WITH CHECK (((resolved_by IS NULL) OR (resolved_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text]))));
ALTER POLICY chronicles_create_adaptation ON public.chronicles_chapters WITH CHECK (((language = ANY (ARRAY['ar'::text, 'en'::text])) AND (updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text])) AND (source_entry_id IS NULL) AND ((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 200)) AND (length(body) <= 2000000)));
ALTER POLICY resource_insert ON public.chronicles_story_resources WITH CHECK ((updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text])));
ALTER POLICY resource_update ON public.chronicles_story_resources WITH CHECK ((updated_by = ANY (ARRAY['Benji'::text, 'Ahmed'::text, 'Guest'::text, 'Guest 2'::text])));
CREATE OR REPLACE FUNCTION public.chronicles_insert_chapter(p_book uuid, p_story integer, p_language text, p_part uuid, p_after uuid, p_title text, p_writer text, p_expected_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n integer; total integer; boundary integer; partrow public.chronicles_book_parts; r record; result jsonb;
begin
 if (p_book is null and (p_story is null or p_language is null)) or (p_book is not null and (p_story is not null or p_language is not null)) then raise exception 'Invalid book scope';end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 200 or p_writer is null or p_writer not in ('Benji','Ahmed','Guest','Guest 2') then raise exception 'Check title and writer';end if;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.chronicles_new_adaptation_chapter(p_story integer, p_title text, p_writer text)
 RETURNS chronicles_chapters
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c public.chronicles_chapters; n integer;
begin
 if p_writer not in('Benji','Ahmed','Guest','Guest 2') or length(trim(p_title))=0 then raise exception 'Choose a writer and chapter title';end if;
 perform pg_advisory_xact_lock(6726,p_story);
 select coalesce(max(chapter_number),0)+1 into n from public.chronicles_chapters where story_number=p_story and language='en';
 insert into public.chronicles_chapters(story_number,language,chapter_number,title,body,updated_by) values(p_story,'en',n,p_title,'',p_writer) returning * into c;return c;
end $function$
;
CREATE OR REPLACE FUNCTION public.chronicles_save_resource(p_story integer, p_kind text, p_body text, p_revision integer, p_writer text, p_language text DEFAULT 'ar'::text)
 RETURNS chronicles_story_resources
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.chronicles_story_resources;
begin
 if p_writer not in('Benji','Ahmed','Guest','Guest 2') or length(p_body)>2000000 then raise exception 'Invalid story notes';end if;
 perform pg_advisory_xact_lock(6725,p_story);
 select * into r from public.chronicles_story_resources where story_number=p_story and kind=p_kind and language=p_language for update;
 if coalesce(r.revision,0)<>p_revision then raise exception 'CONFLICT: notes changed. Reload and compare your saved draft.';end if;
 insert into public.chronicles_story_resources(story_number,language,kind,body,revision,updated_by) values(p_story,p_language,p_kind,p_body,1,p_writer)
 on conflict(story_number,language,kind) do update set body=excluded.body,revision=public.chronicles_story_resources.revision+1,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into r;
 insert into public.chronicles_resource_versions(story_number,language,kind,revision,body,saved_by,saved_at) values(r.story_number,r.language,r.kind,r.revision,r.body,r.updated_by,r.updated_at);
 return r;
end $function$
;

