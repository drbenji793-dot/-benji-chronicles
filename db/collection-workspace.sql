-- Add story scope without changing existing manuscript rows or history.
alter table public.chronicles_chapters add column story_number integer not null default 12 check(story_number between 1 and 12);
alter table public.chronicles_chapters drop constraint chronicles_chapters_language_chapter_number_key;
alter table public.chronicles_chapters add constraint chronicles_story_language_chapter_key unique(story_number,language,chapter_number);
create unique index chronicles_source_entry_unique on public.chronicles_chapters(source_entry_id) where source_entry_id is not null;
alter table public.chronicles_book_controls drop constraint chronicles_book_controls_book_key_check;
alter table public.chronicles_book_controls add constraint chronicles_book_controls_book_key_check check(book_key='main' or book_key ~ '^story:([1-9]|10|11)$' or book_key ~ '^[0-9a-f-]{36}$');
alter policy controls_insert on public.chronicles_book_controls with check(book_key='main' or book_key ~ '^story:([1-9]|10|11)$' or exists(select 1 from public.chronicles_books b where b.id::text=book_key));
alter policy controls_update on public.chronicles_book_controls using(true) with check(book_key='main' or book_key ~ '^story:([1-9]|10|11)$' or exists(select 1 from public.chronicles_books b where b.id::text=book_key));
create table public.chronicles_story_resources(
 story_number integer not null check(story_number between 1 and 12),kind text not null check(kind in('rules','characters','storyboard','references')),
 body text not null default '', revision integer not null default 1,updated_by text not null check(updated_by in('Benji','Ahmed','Guest')),updated_at timestamptz not null default now(),primary key(story_number,kind)
);
create table public.chronicles_resource_versions(
 story_number integer not null,kind text not null,revision integer not null,body text not null,saved_by text not null,saved_at timestamptz not null default now(),primary key(story_number,kind,revision),foreign key(story_number,kind) references public.chronicles_story_resources(story_number,kind)
);
alter table public.chronicles_story_resources enable row level security;
alter table public.chronicles_resource_versions enable row level security;
create policy resource_read on public.chronicles_story_resources for select to anon,authenticated using(true);
create policy resource_insert on public.chronicles_story_resources for insert to anon,authenticated with check(updated_by in('Benji','Ahmed','Guest'));
create policy resource_update on public.chronicles_story_resources for update to anon,authenticated using(true) with check(updated_by in('Benji','Ahmed','Guest'));
create policy resource_history_read on public.chronicles_resource_versions for select to anon,authenticated using(true);
create policy resource_history_insert on public.chronicles_resource_versions for insert to anon,authenticated with check(exists(select 1 from public.chronicles_story_resources r where r.story_number=chronicles_resource_versions.story_number and r.kind=chronicles_resource_versions.kind and r.revision=chronicles_resource_versions.revision and r.body=chronicles_resource_versions.body));
grant select,insert,update on public.chronicles_story_resources to anon,authenticated;
grant select,insert on public.chronicles_resource_versions to anon,authenticated;
create function public.chronicles_save_resource(p_story integer,p_kind text,p_body text,p_revision integer,p_writer text) returns public.chronicles_story_resources language plpgsql security invoker set search_path='' as $$
declare r public.chronicles_story_resources;
begin
 if p_writer not in('Benji','Ahmed','Guest') or length(p_body)>2000000 then raise exception 'Invalid story notes';end if;
 perform pg_advisory_xact_lock(6725,p_story);
 select * into r from public.chronicles_story_resources where story_number=p_story and kind=p_kind for update;
 if coalesce(r.revision,0)<>p_revision then raise exception 'CONFLICT: notes changed. Reload and compare your saved draft.';end if;
 insert into public.chronicles_story_resources(story_number,kind,body,revision,updated_by) values(p_story,p_kind,p_body,1,p_writer)
 on conflict(story_number,kind) do update set body=excluded.body,revision=public.chronicles_story_resources.revision+1,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into r;
 insert into public.chronicles_resource_versions(story_number,kind,revision,body,saved_by,saved_at) values(r.story_number,r.kind,r.revision,r.body,r.updated_by,r.updated_at);
 return r;
end $$;
revoke all on function public.chronicles_save_resource(integer,text,text,integer,text) from public;
grant execute on function public.chronicles_save_resource(integer,text,text,integer,text) to anon,authenticated;
