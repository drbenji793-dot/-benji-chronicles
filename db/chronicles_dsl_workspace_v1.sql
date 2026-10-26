-- Applied as migration chronicles_dsl_workspace_v1. Additive; no manuscript mutations.
create table public.chronicles_dsl_projects (
 book_id uuid primary key references public.chronicles_books(id), published jsonb,
 revision integer not null default 1, updated_by text not null check(updated_by in ('Benji','Ahmed','Guest','GPT')),
 updated_at timestamptz not null default now(), change_note text not null default '' check(length(change_note)<=500),
 check(published is null or (jsonb_typeof(published)='object' and octet_length(published::text)<=2000000))
);
create table public.chronicles_dsl_branches (
 id uuid primary key default gen_random_uuid(), book_id uuid not null references public.chronicles_dsl_projects(book_id),
 name text not null check(length(btrim(name)) between 1 and 120), data jsonb not null, base_snapshot jsonb,
 parent_id uuid references public.chronicles_dsl_branches(id), parent_revision integer, archived boolean not null default false,
 revision integer not null default 1, updated_by text not null check(updated_by in ('Benji','Ahmed','Guest','GPT')),
 updated_at timestamptz not null default now(), change_note text not null default '' check(length(change_note)<=500),
 check(data ?& array['schema','events','links','objects','summary'] and jsonb_typeof(data)='object' and jsonb_typeof(data->'events')='array' and jsonb_typeof(data->'links')='array' and jsonb_typeof(data->'objects')='array' and data->>'schema'='1' and octet_length(data::text)<=2000000),
 check(base_snapshot is null or octet_length(base_snapshot::text)<=2000000)
);
create index chronicles_dsl_branches_book on public.chronicles_dsl_branches(book_id);
create index chronicles_dsl_branches_parent on public.chronicles_dsl_branches(parent_id);
create table public.chronicles_dsl_history (
 id uuid primary key default gen_random_uuid(), book_id uuid not null references public.chronicles_dsl_projects(book_id),
 entity_id uuid not null, kind text not null check(kind in ('branch','publication')), revision integer not null,
 snapshot jsonb not null, saved_by text not null, saved_at timestamptz not null default now(), note text not null default '', unique(entity_id,kind,revision)
);
create index chronicles_dsl_history_book on public.chronicles_dsl_history(book_id,saved_at desc);
alter table public.chronicles_dsl_projects enable row level security;
alter table public.chronicles_dsl_branches enable row level security;
alter table public.chronicles_dsl_history enable row level security;
revoke all on public.chronicles_dsl_projects,public.chronicles_dsl_branches,public.chronicles_dsl_history from public,anon,authenticated;
grant select,insert,update on public.chronicles_dsl_projects,public.chronicles_dsl_branches to anon,authenticated;
grant select,insert on public.chronicles_dsl_history to anon,authenticated;
create policy dsl_project_read on public.chronicles_dsl_projects for select to anon,authenticated using(true);
create policy dsl_project_insert on public.chronicles_dsl_projects for insert to anon,authenticated with check(published is null);
create policy dsl_project_update on public.chronicles_dsl_projects for update to anon,authenticated using(true) with check(updated_by='Benji');
create policy dsl_branch_read on public.chronicles_dsl_branches for select to anon,authenticated using(true);
create policy dsl_branch_insert on public.chronicles_dsl_branches for insert to anon,authenticated with check(exists(select 1 from public.chronicles_dsl_projects p where p.book_id=chronicles_dsl_branches.book_id));
create policy dsl_branch_update on public.chronicles_dsl_branches for update to anon,authenticated using(true) with check(exists(select 1 from public.chronicles_dsl_projects p where p.book_id=chronicles_dsl_branches.book_id));
create policy dsl_history_read on public.chronicles_dsl_history for select to anon,authenticated using(true);
create policy dsl_history_trigger_only on public.chronicles_dsl_history for insert to anon,authenticated with check(pg_trigger_depth()>0);
create function public.chronicles_dsl_stamp() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.book_id<>old.book_id then raise exception 'Book cannot change'; end if;
  if TG_TABLE_NAME='chronicles_dsl_branches' then
   if new.id<>old.id then raise exception 'Branch identity cannot change'; end if;
   if new.parent_id is distinct from old.parent_id or new.parent_revision is distinct from old.parent_revision or new.base_snapshot is distinct from old.base_snapshot then raise exception 'Branch origin is immutable'; end if;
  end if;
  new.revision=old.revision+1;
 else new.revision=1;
 end if;
 if TG_TABLE_NAME='chronicles_dsl_branches' then
  if new.parent_id is not null and not exists(select 1 from public.chronicles_dsl_branches b where b.id=new.parent_id and b.book_id=new.book_id) then raise exception 'Branch origin must belong to the same book'; end if;
 end if;
 new.updated_at=clock_timestamp();return new;
end $$;
create function public.chronicles_dsl_archive() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.chronicles_dsl_history(book_id,entity_id,kind,revision,snapshot,saved_by,saved_at,note)
 values(new.book_id,case when TG_TABLE_NAME='chronicles_dsl_branches' then (to_jsonb(new)->>'id')::uuid else new.book_id end,case when TG_TABLE_NAME='chronicles_dsl_branches' then 'branch' else 'publication' end,new.revision,to_jsonb(new),new.updated_by,new.updated_at,new.change_note);
 return new;
end $$;
create trigger dsl_project_stamp before insert or update on public.chronicles_dsl_projects for each row execute function public.chronicles_dsl_stamp();
create trigger dsl_branch_stamp before insert or update on public.chronicles_dsl_branches for each row execute function public.chronicles_dsl_stamp();
create trigger dsl_project_history after insert or update on public.chronicles_dsl_projects for each row execute function public.chronicles_dsl_archive();
create trigger dsl_branch_history after insert or update on public.chronicles_dsl_branches for each row execute function public.chronicles_dsl_archive();
revoke all on function public.chronicles_dsl_stamp(),public.chronicles_dsl_archive() from public,anon,authenticated;
create function public.chronicles_dsl_publish(p_book uuid,p_branch uuid,p_branch_revision integer,p_project_revision integer,p_writer text) returns public.chronicles_dsl_projects language plpgsql security invoker set search_path='' as $$
declare b public.chronicles_dsl_branches; p public.chronicles_dsl_projects;
begin
 if p_writer<>'Benji' then raise exception 'Select Benji to publish in this attribution-only workspace'; end if;
 select * into b from public.chronicles_dsl_branches where id=p_branch and book_id=p_book for update;
 if not found or b.revision<>p_branch_revision or b.archived then raise exception 'The branch changed. Reload and review before publishing'; end if;
 update public.chronicles_dsl_projects set published=jsonb_build_object('data',b.data,'branch_id',b.id,'branch_name',b.name,'branch_revision',b.revision,'published_at',clock_timestamp(),'published_by',p_writer),updated_by=p_writer,change_note='Publish reviewed Storyline snapshot'
 where book_id=p_book and revision=p_project_revision returning * into p;
 if not found then raise exception 'Storyline changed. Reload and review before publishing'; end if;
 return p;
end $$;
revoke all on function public.chronicles_dsl_publish(uuid,uuid,integer,integer,text) from public;
grant execute on function public.chronicles_dsl_publish(uuid,uuid,integer,integer,text) to anon,authenticated;
comment on table public.chronicles_dsl_projects is 'Public collaborative building mode; writer labels are not authentication. No manuscript writes.';
