create table public.chronicles_book_parts (
 id uuid primary key default gen_random_uuid(),
 book_id uuid not null references public.chronicles_books(id),
 start_chapter integer not null check(start_chapter between 1 and 999),
 title text not null check(length(btrim(title)) between 1 and 160),
 planned_chapters integer check(planned_chapters between 1 and 999),
 revision integer not null default 1,
 updated_by text not null check(updated_by in ('Benji','Ahmed','Guest')),
 updated_at timestamptz not null default now(),
 history jsonb not null default '[]'::jsonb,
 unique(book_id,start_chapter)
);
alter table public.chronicles_book_parts enable row level security;
create policy parts_read on public.chronicles_book_parts for select to anon,authenticated using(true);
create policy parts_create on public.chronicles_book_parts for insert to anon,authenticated with check(exists(select 1 from public.chronicles_books b where b.id=book_id));
create policy parts_edit on public.chronicles_book_parts for update to anon,authenticated using(true) with check(true);
grant select on public.chronicles_book_parts to anon,authenticated;
grant insert(book_id,start_chapter,title,planned_chapters,updated_by),update(title,updated_by) on public.chronicles_book_parts to anon,authenticated;
create function public.chronicles_part_stamp() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  new.revision=old.revision+1;
  new.history=old.history || jsonb_build_array(jsonb_build_object('title',old.title,'revision',old.revision,'updated_by',old.updated_by,'updated_at',old.updated_at));
 else new.revision=1;new.history='[]'::jsonb;
 end if;
 new.updated_at=clock_timestamp();return new;
end $$;
create trigger part_stamp before insert or update on public.chronicles_book_parts for each row execute function public.chronicles_part_stamp();
