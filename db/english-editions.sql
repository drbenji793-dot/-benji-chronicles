-- Additive language bridge. Existing books, chapters, history and Ink links are untouched.
create table public.chronicles_english_editions (
 id uuid primary key default gen_random_uuid(),
 source_key text not null check(source_key ~ '^story:([1-9]|10|11|12):ar$' or source_key ~ '^[0-9a-f-]{36}$'),
 target_book_id uuid not null unique references public.chronicles_books(id),
 mode text not null check(mode in ('translation','adaptation')),
 instructions text not null default '' check(length(instructions)<=4000),
 created_at timestamptz not null default now(),
 created_by text not null check(created_by='Benji'),
 unique(source_key,mode)
);
create table public.chronicles_english_sources (
 target_entry_id uuid primary key references public.chronicles_book_entries(id),
 edition_id uuid not null references public.chronicles_english_editions(id),
 source_id uuid not null,
 source_kind text not null check(source_kind in ('main','extra')),
 source_revision integer not null check(source_revision>0),
 source_title text not null,
 source_body text not null,
 reviewed_revision integer not null check(reviewed_revision>0),
 sent_at timestamptz not null default now(),
 unique(edition_id,source_kind,source_id)
);
create index chronicles_english_sources_edition_idx on public.chronicles_english_sources(edition_id);
alter table public.chronicles_english_editions enable row level security;
alter table public.chronicles_english_sources enable row level security;
grant select,insert on public.chronicles_english_editions,public.chronicles_english_sources to anon,authenticated;
grant update(reviewed_revision) on public.chronicles_english_sources to anon,authenticated;
create policy edition_read on public.chronicles_english_editions for select to anon,authenticated using(true);
create policy edition_insert on public.chronicles_english_editions for insert to anon,authenticated with check(exists(select 1 from public.chronicles_books b where b.id=target_book_id and b.language='en'));
create policy source_read on public.chronicles_english_sources for select to anon,authenticated using(true);
create policy source_insert on public.chronicles_english_sources for insert to anon,authenticated with check(exists(select 1 from public.chronicles_book_entries e join public.chronicles_english_editions d on d.target_book_id=e.book_id where e.id=target_entry_id and d.id=edition_id));
create policy source_review on public.chronicles_english_sources for update to anon,authenticated using(true) with check(reviewed_revision>=source_revision);

create function public.chronicles_english_source_chapters(p_source_key text)
returns table(id uuid,source_kind text,chapter_number integer,title text,body text,revision integer)
language sql stable security invoker set search_path='' as $$
 select c.id,'main'::text,c.chapter_number,c.title,c.body,c.revision from public.chronicles_chapters c
 where c.language='ar' and p_source_key='story:'||c.story_number||':ar'
 union all
 select e.id,'extra'::text,e.chapter_number,e.title,e.body,e.revision from public.chronicles_book_entries e
 join public.chronicles_books b on b.id=e.book_id
 where b.language='ar' and b.id::text=p_source_key and e.kind='chapter'
 order by chapter_number;
$$;

create function public.chronicles_send_to_english(p_source_key text,p_mode text,p_title text,p_instructions text,p_chapters jsonb,p_writer text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.chronicles_english_editions;b public.chronicles_books;src record;item jsonb;eid uuid;next_number integer;added integer:=0;
begin
 if p_writer is distinct from 'Benji' then raise exception 'Select Benji to approve sending chapters';end if;
 if p_mode is null or p_mode not in ('translation','adaptation') then raise exception 'Choose translation or adaptation';end if;
 if p_source_key is null or not exists(select 1 from public.chronicles_english_source_chapters(p_source_key)) then raise exception 'No Arabic chapters in this source';end if;
 if p_chapters is null or jsonb_typeof(p_chapters)<>'array' or jsonb_array_length(p_chapters) not between 1 and 999 then raise exception 'Select chapters to send';end if;
 if exists(select 1 from public.chronicles_book_controls where book_key=case when p_source_key='story:12:ar' then 'main' when p_source_key like 'story:%' then regexp_replace(p_source_key,':ar$','') else p_source_key end and deleted_at is not null) then raise exception 'Restore the source book before sending';end if;
 perform pg_advisory_xact_lock(hashtext('chronicles-english:'||p_source_key||':'||p_mode));
 select * into d from public.chronicles_english_editions where source_key=p_source_key and mode=p_mode;
 if not found then
  if p_title is null or length(btrim(p_title)) not between 1 and 160 then raise exception 'Enter an English book title';end if;
  b:=public.chronicles_create_library_book(btrim(p_title),'English '||p_mode||' linked to an Arabic original.','Benji','shared','en');
  update public.chronicles_books set related_work=p_source_key where id=b.id;
  insert into public.chronicles_english_editions(source_key,target_book_id,mode,instructions,created_by)
   values(p_source_key,b.id,p_mode,coalesce(p_instructions,''),'Benji') returning * into d;
 end if;
 if exists(select 1 from public.chronicles_book_controls where book_key=d.target_book_id::text and deleted_at is not null) then raise exception 'Restore the English book before sending';end if;
 -- Lock target book so repeated and concurrent sends cannot duplicate chapter numbers.
 perform 1 from public.chronicles_books where id=d.target_book_id for update;
 select coalesce(max(chapter_number),0) into next_number from public.chronicles_book_entries where book_id=d.target_book_id and kind='chapter';
 for item in select value from jsonb_array_elements(p_chapters) loop
  select * into src from public.chronicles_english_source_chapters(p_source_key) where id=(item->>'id')::uuid;
  if not found then raise exception 'Selected chapter does not belong to this Arabic book';end if;
  if src.revision is distinct from (item->>'revision')::integer then raise exception 'Arabic chapter changed. Reopen the transfer panel and review again.';end if;
  if exists(select 1 from public.chronicles_english_sources where edition_id=d.id and source_id=src.id and source_kind=src.source_kind) then continue;end if;
  next_number:=next_number+1;
  insert into public.chronicles_book_entries(book_id,kind,chapter_number,title,body,updated_by)
   values(d.target_book_id,'chapter',next_number,'Chapter '||next_number||' · English draft','','Benji') returning id into eid;
  insert into public.chronicles_english_sources(target_entry_id,edition_id,source_id,source_kind,source_revision,source_title,source_body,reviewed_revision)
   values(eid,d.id,src.id,src.source_kind,src.revision,src.title,src.body,src.revision);
  added:=added+1;
 end loop;
 return jsonb_build_object('book_id',d.target_book_id,'added',added,'mode',d.mode);
end;
$$;

create function public.chronicles_review_english_source(p_target_entry uuid,p_revision integer,p_writer text)
returns void language plpgsql security invoker set search_path='' as $$
declare s public.chronicles_english_sources;d public.chronicles_english_editions;current_revision integer;
begin
 if p_writer is distinct from 'Benji' then raise exception 'Select Benji to confirm source review';end if;
 select * into strict s from public.chronicles_english_sources where target_entry_id=p_target_entry for update;
 select * into strict d from public.chronicles_english_editions where id=s.edition_id;
 select revision into current_revision from public.chronicles_english_source_chapters(d.source_key) where id=s.source_id;
 if current_revision is null or current_revision is distinct from p_revision then raise exception 'Arabic source changed. Review the latest version.';end if;
 update public.chronicles_english_sources set reviewed_revision=p_revision where target_entry_id=p_target_entry;
end;
$$;
revoke all on function public.chronicles_english_source_chapters(text),public.chronicles_send_to_english(text,text,text,text,jsonb,text),public.chronicles_review_english_source(uuid,integer,text) from public;
grant execute on function public.chronicles_english_source_chapters(text),public.chronicles_send_to_english(text,text,text,text,jsonb,text),public.chronicles_review_english_source(uuid,integer,text) to anon,authenticated;
notify pgrst,'reload schema';
