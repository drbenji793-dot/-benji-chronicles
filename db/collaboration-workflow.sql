-- Additive workflow metadata; manuscript and revision tables are not rewritten.
create table public.chronicles_book_controls (
 book_key text primary key, title text, deleted_at timestamptz, ink_book_id uuid references public.ink_books(id),
 check(book_key='main' or book_key ~ '^[0-9a-f-]{36}$'),check(title is null or length(trim(title)) between 1 and 160)
);
alter table public.chronicles_book_controls enable row level security;
create policy controls_read on public.chronicles_book_controls for select to anon,authenticated using(true);
create policy controls_insert on public.chronicles_book_controls for insert to anon,authenticated with check(book_key='main' or exists(select 1 from public.chronicles_books b where b.id::text=book_key));
create policy controls_update on public.chronicles_book_controls for update to anon,authenticated using(true) with check(book_key='main' or exists(select 1 from public.chronicles_books b where b.id::text=book_key));
grant select,insert,update on public.chronicles_book_controls to anon,authenticated;
create table public.chronicles_workflow (
 source_id uuid primary key, source_kind text not null check(source_kind in ('main','extra')),
 approved_revision integer not null,approved_title text not null,approved_body text not null,
 approved_by text not null check(approved_by in ('Benji','Ahmed')),approved_at timestamptz not null default now(),
 arabic_revision integer,ink_entry_id uuid references public.ink_entries(id),ink_revision integer,
 transferred_revision integer,transferred_at timestamptz
);
alter table public.chronicles_workflow enable row level security;
create policy workflow_read on public.chronicles_workflow for select to anon,authenticated using(true);
create policy workflow_insert on public.chronicles_workflow for insert to anon,authenticated with check((source_kind='main' and exists(select 1 from public.chronicles_chapters c where c.id=source_id and c.revision=approved_revision and c.body=approved_body and c.title=approved_title)) or (source_kind='extra' and exists(select 1 from public.chronicles_book_entries c where c.id=source_id and c.revision=approved_revision and c.body=approved_body and c.title=approved_title)));
create policy workflow_update on public.chronicles_workflow for update to anon,authenticated using(true) with check((source_kind='main' and exists(select 1 from public.chronicles_chapters c where c.id=source_id and c.revision=approved_revision and c.body=approved_body and c.title=approved_title)) or (source_kind='extra' and exists(select 1 from public.chronicles_book_entries c where c.id=source_id and c.revision=approved_revision and c.body=approved_body and c.title=approved_title)));
grant select,insert,update on public.chronicles_workflow to anon,authenticated;
create or replace function public.chronicles_approve(p_id uuid,p_kind text,p_revision integer,p_writer text) returns public.chronicles_workflow language plpgsql security invoker set search_path='' as $$
declare c record; a integer; result public.chronicles_workflow;
begin
 if p_writer not in ('Benji','Ahmed') then raise exception 'Choose a writer';end if;
 if p_kind='main' then
 select * into c from public.chronicles_chapters where id=p_id for share;
 if not found then raise exception 'Chapter missing';end if;
 if c.language='en' then select revision into a from public.chronicles_chapters where language='ar' and chapter_number=c.chapter_number;end if;
 elsif p_kind='extra' then select * into c from public.chronicles_book_entries where id=p_id for share;
 if not found then raise exception 'Chapter missing';end if;
 else raise exception 'Invalid source';end if;
 if c.revision<>p_revision then raise exception 'CONFLICT: chapter changed. Review latest revision.';end if;
 if length(trim(c.body))=0 then raise exception 'An empty chapter cannot be approved';end if;
 insert into public.chronicles_workflow(source_id,source_kind,approved_revision,approved_title,approved_body,approved_by,arabic_revision)
 values(p_id,p_kind,c.revision,c.title,c.body,p_writer,a)
 on conflict(source_id) do update set approved_revision=excluded.approved_revision,approved_title=excluded.approved_title,approved_body=excluded.approved_body,approved_by=excluded.approved_by,approved_at=clock_timestamp(),arabic_revision=excluded.arabic_revision returning * into result;
 return result;
end $$;
create or replace function public.chronicles_transfer(p_items jsonb,p_writer text,p_supplements jsonb default '[]') returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb;c record;w public.chronicles_workflow;target public.ink_entries;book public.ink_books;extra public.chronicles_books;bid uuid;wid uuid;target_id uuid;key text;result jsonb:='[]';meta jsonb;sup jsonb;aid integer;
begin
 if p_writer not in ('Benji','Ahmed') or jsonb_array_length(p_items) not between 1 and 2 then raise exception 'Select one or two approved editions';end if;
 for item in select value from jsonb_array_elements(p_items) loop
 select * into w from public.chronicles_workflow where source_id=(item->>'id')::uuid for update;
 if not found then raise exception 'Approve the chapter first';end if;
 if w.source_kind='main' then
 select ch.*,null::uuid as book_id,'chapter'::text as kind into c from public.chronicles_chapters ch where id=w.source_id for share;key:='main';target_id:=c.source_entry_id;
 if c.language='en' then select revision into aid from public.chronicles_chapters where language='ar' and chapter_number=c.chapter_number;
 if w.arabic_revision is distinct from aid then raise exception 'English needs review after the Arabic changes';end if;end if;
 else select e.*, 'ar'::text as language into c from public.chronicles_book_entries e where id=w.source_id for share;key:=c.book_id::text;target_id:=w.ink_entry_id;end if;
 if exists(select 1 from public.chronicles_book_controls where book_key=key and deleted_at is not null) then raise exception 'Restore the book before transferring';end if;
 if c.revision<>w.approved_revision or c.revision<>(item->>'revision')::integer then raise exception 'CONFLICT: chapter changed after approval';end if;
 if w.source_kind='main' then
 select * into target from public.ink_entries where id=target_id for update;
 if not found then raise exception 'Original Ink chapter not found';end if;
 bid:=target.book_id;wid:=target.workspace_id;
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
 meta:=jsonb_build_object('chronicles_source_id',w.source_id,'chronicles_kind',w.source_kind,'chronicles_revision',c.revision,'chronicles_writer',p_writer,'chronicles_updated_at',clock_timestamp(),'chronicles_url',case when w.source_kind='main' then 'https://benji-chronicles.vercel.app/#lang='||c.language||'&chapter='||c.chapter_number else 'https://benji-chronicles.vercel.app/#book='||c.book_id||case when c.kind='rules' then '&rules=1' else '&chapter='||c.chapter_number end end);
 if target.id is not null then
 if target.revision is distinct from (item->>'expected_ink_revision')::integer then raise exception 'CONFLICT: Ink changed. Compare again before updating.';end if;
 perform set_config('ink.expected_revision',target.revision::text,true);
 perform set_config('ink.revision_note','Approved Chronicles revision '||c.revision||' by '||p_writer,true);
 update public.ink_entries set title=c.title,body=c.body,body_format='html',source_meta=coalesce(source_meta,'{}')||meta where id=target.id returning * into target;
 else
 if (item->>'expected_ink_revision')::integer<>0 then raise exception 'CONFLICT: Ink mapping changed';end if;
 insert into public.ink_entries(workspace_id,book_id,kind,language,chapter_number,title,body,body_format,source_meta) values(wid,bid,case when c.kind='rules' then 'style' else 'chapter' end,'ar',c.chapter_number,c.title,c.body,'html',meta||jsonb_build_object('source_version','Benji Ink')) returning * into target;
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
end $$;
revoke all on function public.chronicles_approve(uuid,text,integer,text),public.chronicles_transfer(jsonb,text,jsonb) from public;
grant execute on function public.chronicles_approve(uuid,text,integer,text),public.chronicles_transfer(jsonb,text,jsonb) to anon,authenticated;
