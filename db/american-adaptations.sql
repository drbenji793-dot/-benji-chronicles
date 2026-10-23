-- Separate adaptation identity and resources. Existing manuscripts remain unchanged.
create table public.chronicles_adaptations(story_number integer primary key check(story_number between 1 and 12),id uuid not null unique default gen_random_uuid(),title text not null default '',setting text not null default '',revision integer not null default 1,updated_at timestamptz not null default now());
alter table public.chronicles_adaptations enable row level security;
create policy adaptation_read on public.chronicles_adaptations for select to anon,authenticated using(true);
create policy adaptation_update on public.chronicles_adaptations for update to anon,authenticated using(true) with check(length(title)<=200 and length(setting)<=2000);
grant select,update on public.chronicles_adaptations to anon,authenticated;
insert into public.chronicles_adaptations(story_number,title,setting) select n,case when n=12 then 'A Fracture in Time' else '' end,case when n=12 then 'New York, 1968' else '' end from generate_series(1,12) n;
alter table public.chronicles_chapters drop constraint chronicles_chapters_chapter_number_check;
alter table public.chronicles_chapters add constraint chronicles_chapters_chapter_number_check check(chapter_number>=1);
create policy chronicles_create_adaptation on public.chronicles_chapters for insert to anon,authenticated with check(language='en' and updated_by in('Benji','Ahmed','Guest') and source_entry_id is null);
grant insert on public.chronicles_chapters to anon,authenticated;
alter table public.chronicles_story_resources add column language text not null default 'ar' check(language in('ar','en'));
alter table public.chronicles_resource_versions add column language text not null default 'ar' check(language in('ar','en'));
alter table public.chronicles_resource_versions drop constraint chronicles_resource_versions_story_number_kind_fkey;
alter table public.chronicles_story_resources drop constraint chronicles_story_resources_pkey;
alter table public.chronicles_resource_versions drop constraint chronicles_resource_versions_pkey;
alter table public.chronicles_story_resources add primary key(story_number,language,kind);
alter table public.chronicles_resource_versions add primary key(story_number,language,kind,revision);
alter table public.chronicles_resource_versions add foreign key(story_number,language,kind) references public.chronicles_story_resources(story_number,language,kind);
alter policy resource_history_insert on public.chronicles_resource_versions with check(exists(select 1 from public.chronicles_story_resources r where r.story_number=chronicles_resource_versions.story_number and r.language=chronicles_resource_versions.language and r.kind=chronicles_resource_versions.kind and r.revision=chronicles_resource_versions.revision and r.body=chronicles_resource_versions.body));
alter table public.chronicles_workflow add column original_snapshot text;
create function public.chronicles_original_snapshot(p_story integer) returns text language sql stable security invoker set search_path='' as $$ select md5(coalesce(string_agg(id::text||':'||revision::text,',' order by id),'')) from public.chronicles_chapters where story_number=p_story and language='ar' $$;
revoke all on function public.chronicles_original_snapshot(integer) from public;
grant execute on function public.chronicles_original_snapshot(integer) to anon,authenticated;
drop function public.chronicles_save_resource(integer,text,text,integer,text);
create or replace function public.chronicles_save_resource(p_story integer,p_kind text,p_body text,p_revision integer,p_writer text,p_language text default 'ar') returns public.chronicles_story_resources language plpgsql security invoker set search_path='' as $$
declare r public.chronicles_story_resources;
begin
 if p_writer not in('Benji','Ahmed','Guest') or length(p_body)>2000000 then raise exception 'Invalid story notes';end if;
 perform pg_advisory_xact_lock(6725,p_story);
 select * into r from public.chronicles_story_resources where story_number=p_story and kind=p_kind and language=p_language for update;
 if coalesce(r.revision,0)<>p_revision then raise exception 'CONFLICT: notes changed. Reload and compare your saved draft.';end if;
 insert into public.chronicles_story_resources(story_number,language,kind,body,revision,updated_by) values(p_story,p_language,p_kind,p_body,1,p_writer)
 on conflict(story_number,language,kind) do update set body=excluded.body,revision=public.chronicles_story_resources.revision+1,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into r;
 insert into public.chronicles_resource_versions(story_number,language,kind,revision,body,saved_by,saved_at) values(r.story_number,r.language,r.kind,r.revision,r.body,r.updated_by,r.updated_at);
 return r;
end $$;
revoke all on function public.chronicles_save_resource(integer,text,text,integer,text,text) from public;
grant execute on function public.chronicles_save_resource(integer,text,text,integer,text,text) to anon,authenticated;

create function public.chronicles_new_adaptation_chapter(p_story integer,p_title text,p_writer text) returns public.chronicles_chapters language plpgsql security invoker set search_path='' as $$
declare c public.chronicles_chapters; n integer;
begin
 if p_writer not in('Benji','Ahmed','Guest') or length(trim(p_title))=0 then raise exception 'Choose a writer and chapter title';end if;
 perform pg_advisory_xact_lock(6726,p_story);
 select coalesce(max(chapter_number),0)+1 into n from public.chronicles_chapters where story_number=p_story and language='en';
 insert into public.chronicles_chapters(story_number,language,chapter_number,title,body,updated_by) values(p_story,'en',n,p_title,'',p_writer) returning * into c;return c;
end $$;
revoke all on function public.chronicles_new_adaptation_chapter(integer,text,text) from public;
grant execute on function public.chronicles_new_adaptation_chapter(integer,text,text) to anon,authenticated;
CREATE OR REPLACE FUNCTION public.chronicles_approve(p_id uuid, p_kind text, p_revision integer, p_writer text)
 RETURNS chronicles_workflow
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c record; a integer; result public.chronicles_workflow;
begin
 if p_writer <> 'Benji' then raise exception 'Choose a writer';end if;
 if p_kind='main' then
 select * into c from public.chronicles_chapters where id=p_id for share;
 if not found then raise exception 'Chapter missing';end if;
 
 elsif p_kind='extra' then select * into c from public.chronicles_book_entries where id=p_id for share;
 if not found then raise exception 'Chapter missing';end if;
 else raise exception 'Invalid source';end if;
 if c.revision<>p_revision then raise exception 'CONFLICT: chapter changed. Review latest revision.';end if;
 if length(trim(c.body))=0 then raise exception 'An empty chapter cannot be approved';end if;
 insert into public.chronicles_workflow(source_id,source_kind,approved_revision,approved_title,approved_body,approved_by,arabic_revision,original_snapshot)
 values(p_id,p_kind,c.revision,c.title,c.body,p_writer,a,case when p_kind='main' and c.language='en' then public.chronicles_original_snapshot(c.story_number) else null end)
 on conflict(source_id) do update set approved_revision=excluded.approved_revision,approved_title=excluded.approved_title,approved_body=excluded.approved_body,approved_by=excluded.approved_by,approved_at=clock_timestamp(),arabic_revision=excluded.arabic_revision,original_snapshot=excluded.original_snapshot returning * into result;
 return result;
end $function$

;
CREATE OR REPLACE FUNCTION public.chronicles_transfer(p_items jsonb, p_writer text, p_supplements jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item jsonb;c record;w public.chronicles_workflow;target public.ink_entries;book public.ink_books;extra public.chronicles_books;bid uuid;wid uuid;target_id uuid;key text;result jsonb:='[]';meta jsonb;sup jsonb;aid integer;
begin
 if p_writer <> 'Benji' or jsonb_array_length(p_items) <> 1 or jsonb_array_length(p_supplements) <> 0 then raise exception 'Benji can transfer one approved chapter at a time';end if;
 for item in select value from jsonb_array_elements(p_items) loop
 select * into w from public.chronicles_workflow where source_id=(item->>'id')::uuid for update;
 if not found then raise exception 'Approve the chapter first';end if;
 if w.source_kind='main' then
 select ch.*,null::uuid as book_id,'chapter'::text as kind into c from public.chronicles_chapters ch where id=w.source_id for share;key:=case when c.story_number=12 then 'main' else 'story:'||c.story_number end;target_id:=coalesce(c.source_entry_id,w.ink_entry_id);
 if c.language='en' and w.original_snapshot is distinct from public.chronicles_original_snapshot(c.story_number) then raise exception 'Original updated. Review and approve this adaptation again.';end if;
 else select e.*, 'ar'::text as language into c from public.chronicles_book_entries e where id=w.source_id for share;key:=c.book_id::text;target_id:=w.ink_entry_id;end if;
 if exists(select 1 from public.chronicles_book_controls where book_key=key and deleted_at is not null) then raise exception 'Restore the book before transferring';end if;
 if c.revision<>w.approved_revision or c.revision<>(item->>'revision')::integer then raise exception 'CONFLICT: chapter changed after approval';end if;
 if w.source_kind='main' then
 select * into target from public.ink_entries where id=target_id for update;
 if not found then
 if c.language<>'en' then raise exception 'Original Ink chapter not found';end if;
 select * into book from public.ink_books where source_version='MF_COLLECTION_V1';bid:=book.id;wid:=book.workspace_id;
 if bid is null then raise exception 'Ink collection missing';end if;
 perform pg_advisory_xact_lock(6727,1);
 select * into target from public.ink_entries where book_id=bid and kind='chapter' and language='en' and (source_meta->>'story_number')::integer=c.story_number and (source_meta->>'local_chapter')::integer=c.chapter_number for update;
 if found then raise exception 'An English chapter already exists in Ink at this position. Link and review it before transferring.';end if;
 else bid:=target.book_id;wid:=target.workspace_id;end if;
 else
 insert into public.chronicles_book_controls(book_key) values(key) on conflict do nothing;
 select ink_book_id into bid from public.chronicles_book_controls where book_key=key for update;
 if bid is null then
 select * into extra from public.chronicles_books where id=c.book_id;
 select * into book from public.ink_create_book(coalesce((select title from public.chronicles_book_controls where book_key=key),extra.title),'',extra.description,p_writer,'shared','ar');
 bid:=book.id;update public.chronicles_book_controls set ink_book_id=bid where book_key=key;
 end if;
 select workspace_id into wid from public.ink_books where id=bid;
 select * into target from public.ink_entries where id=target_id for update;
 end if;
 meta:=jsonb_build_object('chronicles_source_id',w.source_id,'chronicles_kind',w.source_kind,'chronicles_revision',c.revision,'chronicles_writer',p_writer,'chronicles_updated_at',clock_timestamp(),'chronicles_url',case when w.source_kind='main' then 'https://benji-chronicles.vercel.app/#story='||c.story_number||'&lang='||c.language||'&chapter='||c.chapter_number else 'https://benji-chronicles.vercel.app/#book='||c.book_id||case when c.kind='rules' then '&rules=1' else '&chapter='||c.chapter_number end end);
 if w.source_kind='main' and c.language='en' then meta:=meta||jsonb_build_object('collection','missing_files','story_number',c.story_number,'local_chapter',c.chapter_number,'adaptation_id',(select id from public.chronicles_adaptations where story_number=c.story_number),'story_title',(select title from public.chronicles_adaptations where story_number=c.story_number));end if;
 if target.id is not null then
 if target.revision is distinct from (item->>'expected_ink_revision')::integer then raise exception 'CONFLICT: Ink changed. Compare again before updating.';end if;
 perform set_config('ink.expected_revision',target.revision::text,true);
 perform set_config('ink.revision_note','Approved Chronicles revision '||c.revision||' by '||p_writer,true);
 update public.ink_entries set title=c.title,body=c.body,body_format='html',source_meta=coalesce(source_meta,'{}')||meta where id=target.id returning * into target;
 else
 if (item->>'expected_ink_revision')::integer<>0 then raise exception 'CONFLICT: Ink mapping changed';end if;
 insert into public.ink_entries(workspace_id,book_id,kind,language,chapter_number,title,body,body_format,source_meta) values(wid,bid,case when c.kind='rules' then 'style' else 'chapter' end,case when w.source_kind='main' then c.language else 'ar' end,case when w.source_kind='main' then (select coalesce(max(chapter_number),0)+1 from public.ink_entries where book_id=bid and kind='chapter' and language='en') else c.chapter_number end,c.title,c.body,'html',meta||jsonb_build_object('source_version','Benji Ink')) returning * into target;
 end if;
 update public.chronicles_workflow set ink_entry_id=target.id,ink_revision=target.revision,transferred_revision=c.revision,transferred_at=clock_timestamp() where source_id=w.source_id;
 result:=result||jsonb_build_array(jsonb_build_object('id',c.id,'ink_id',target.id,'revision',target.revision));
 end loop;
 for sup in select value from jsonb_array_elements(p_supplements) loop
 if sup->>'kind' not in ('style','characters','storyboard','notes') or length(sup->>'body')>2000000 then raise exception 'Invalid supporting material';end if;
 select * into target from public.ink_entries where book_id=bid and source_meta->>'chronicles_asset'=sup->>'kind' for update;
 meta:=jsonb_build_object('chronicles_asset',sup->>'kind','chronicles_updated_at',clock_timestamp(),'chronicles_writer',p_writer,'collection','missing_files','story_number',12);
 if target.id is null then
 if (sup->>'expected_revision')::integer<>0 then raise exception 'Supporting material changed';end if;
 insert into public.ink_entries(workspace_id,book_id,kind,language,title,body,body_format,source_meta) values(wid,bid,sup->>'kind','ar',sup->>'title',sup->>'body','html',meta);
 else
 if target.revision is distinct from (sup->>'expected_revision')::integer then raise exception 'CONFLICT: supporting material changed';end if;
 perform set_config('ink.expected_revision',target.revision::text,true);perform set_config('ink.revision_note','Supporting material from Chronicles by '||p_writer,true);
 update public.ink_entries set title=sup->>'title',body=sup->>'body',body_format='html',source_meta=source_meta||meta where id=target.id;
 end if;
 end loop;
 return result;
end $function$
;

