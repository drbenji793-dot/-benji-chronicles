create table public.chronicles_chapters (
id uuid primary key default gen_random_uuid(),
language text not null check(language in ('ar','en')),
chapter_number integer not null check(chapter_number between 1 and 55),
title text not null, body text not null,
revision integer not null default 1,
updated_at timestamptz not null default now(),
updated_by text not null default 'Benji Ink',
source_entry_id uuid,
unique(language,chapter_number));
create table public.chronicles_versions (
id uuid primary key default gen_random_uuid(),
chapter_id uuid not null references public.chronicles_chapters(id),
title text not null, body text not null, revision integer not null,
saved_at timestamptz not null, saved_by text not null,
unique(chapter_id,revision));
create table public.chronicles_notes (
id uuid primary key default gen_random_uuid(),
chapter_id uuid not null references public.chronicles_chapters(id),
author text not null check(author in ('Zee','Ahmed')),
body text not null check(length(trim(body)) between 1 and 10000),
created_at timestamptz not null default now());
alter table public.chronicles_chapters enable row level security;
alter table public.chronicles_versions enable row level security;
alter table public.chronicles_notes enable row level security;
revoke all on public.chronicles_chapters,public.chronicles_versions,public.chronicles_notes from anon,authenticated;
grant select on public.chronicles_chapters,public.chronicles_versions,public.chronicles_notes to anon,authenticated;
grant update(title,body,updated_by) on public.chronicles_chapters to anon,authenticated;
grant insert on public.chronicles_versions,public.chronicles_notes to anon,authenticated;
create policy chronicles_read on public.chronicles_chapters for select to anon,authenticated using(true);
create policy chronicles_edit on public.chronicles_chapters for update to anon,authenticated using(true) with check(updated_by in ('Zee','Ahmed'));
create policy chronicles_versions_read on public.chronicles_versions for select to anon,authenticated using(true);
create policy chronicles_versions_insert on public.chronicles_versions for insert to anon,authenticated with check (exists(select 1 from public.chronicles_chapters c where c.id=chapter_id and c.revision=chronicles_versions.revision and c.title=chronicles_versions.title and c.body=chronicles_versions.body and c.updated_at=chronicles_versions.saved_at and c.updated_by=chronicles_versions.saved_by));
create policy chronicles_notes_read on public.chronicles_notes for select to anon,authenticated using(true);
create policy chronicles_notes_add on public.chronicles_notes for insert to anon,authenticated with check(author in ('Zee','Ahmed'));
create function public.chronicles_before_save() returns trigger language plpgsql security invoker set search_path='' as $$
begin
if length(trim(new.title))=0 or length(trim(new.body))=0 then raise exception 'Title and chapter text are required'; end if;
new.revision=old.revision+1;
new.updated_at=clock_timestamp();
return new;
end $$;
create function public.chronicles_archive_save() returns trigger language plpgsql security invoker set search_path='' as $$
begin
insert into public.chronicles_versions(chapter_id,title,body,revision,saved_at,saved_by) values(new.id,new.title,new.body,new.revision,new.updated_at,new.updated_by);
return new;
end $$;
create trigger chronicles_revision before update on public.chronicles_chapters for each row execute function public.chronicles_before_save();
create trigger chronicles_history after insert or update on public.chronicles_chapters for each row execute function public.chronicles_archive_save();
create index chronicles_notes_chapter on public.chronicles_notes(chapter_id,created_at);
insert into public.chronicles_chapters(language,chapter_number,title,body,source_entry_id)
select language,(source_meta->>'local_chapter')::integer,title,body,id from public.ink_entries
where book_id='57fd324a-21e7-4d88-a02e-5f84a4f707ee' and source_meta->>'story_number'='12' and language in ('ar','en');
