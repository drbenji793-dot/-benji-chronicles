-- Shared collaborative workspace, same read/write audience as chronicles_dsl_branches.
create table public.chronicles_name_bank (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 160),
 categories jsonb not null default '[]' check (jsonb_typeof(categories)='array' and jsonb_array_length(categories)<=30),
 kind text not null default 'اسم' check (length(kind)<=80),
 notes text not null default '' check (length(notes)<=4000),
 source_page integer check(source_page between 1 and 5),
 source text not null default 'user' check(source in ('pdf','user')),
 usages jsonb not null default '[]' check(jsonb_typeof(usages)='array' and jsonb_array_length(usages)<=200),
 archived boolean not null default false,
 revision integer not null default 1,
 updated_by text not null default 'Benji' check(updated_by in ('Benji','Ahmed')),
 updated_at timestamptz not null default now()
);
create table public.chronicles_name_bank_history (
 id uuid primary key default gen_random_uuid(),
 entry_id uuid not null references public.chronicles_name_bank(id),
 revision integer not null,
 snapshot jsonb not null,
 saved_at timestamptz not null default now(),
 unique(entry_id,revision)
);
alter table public.chronicles_name_bank enable row level security;
alter table public.chronicles_name_bank_history enable row level security;
revoke all on public.chronicles_name_bank, public.chronicles_name_bank_history from anon, authenticated;
grant select,insert,update on public.chronicles_name_bank to anon,authenticated;
grant select,insert on public.chronicles_name_bank_history to anon,authenticated;
create policy name_bank_read on public.chronicles_name_bank for select to anon,authenticated using(true);
create policy name_bank_insert on public.chronicles_name_bank for insert to anon,authenticated with check(true);
create policy name_bank_update on public.chronicles_name_bank for update to anon,authenticated using(true) with check(true);
create policy name_bank_history_read on public.chronicles_name_bank_history for select to anon,authenticated using(true);
create policy name_bank_history_trigger on public.chronicles_name_bank_history for insert to anon,authenticated with check(pg_trigger_depth()>0);
create function public.chronicles_name_bank_revision() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if TG_OP='UPDATE' then
  if NEW.id<>OLD.id then raise exception 'Entry identity cannot change'; end if;
  NEW.revision=OLD.revision+1;
 else NEW.revision=1; end if;
 NEW.updated_at=now(); return NEW;
end $$;
create function public.chronicles_name_bank_archive() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.chronicles_name_bank_history(entry_id,revision,snapshot) values(NEW.id,NEW.revision,to_jsonb(NEW));
 return NEW;
end $$;
revoke all on function public.chronicles_name_bank_revision(),public.chronicles_name_bank_archive() from public,anon,authenticated;
create trigger name_bank_revision before insert or update on public.chronicles_name_bank for each row execute function public.chronicles_name_bank_revision();
create trigger name_bank_archive after insert or update on public.chronicles_name_bank for each row execute function public.chronicles_name_bank_archive();
