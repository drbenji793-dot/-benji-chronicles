create table public.chronicles_shelf_order (
 scope text primary key check(scope in ('ar:library','en:library','ar:collection')),
 order_keys text[] not null default '{}' check(cardinality(order_keys)<=500),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.chronicles_shelf_order enable row level security;
insert into public.chronicles_shelf_order(scope) values('ar:library'),('en:library'),('ar:collection');
grant select on public.chronicles_shelf_order to anon,authenticated;
grant update(order_keys,revision,updated_at) on public.chronicles_shelf_order to anon,authenticated;
create policy shelf_read on public.chronicles_shelf_order for select to anon,authenticated using(true);
create policy shelf_update on public.chronicles_shelf_order for update to anon,authenticated using(true) with check(scope in ('ar:library','en:library','ar:collection'));
create function public.chronicles_save_shelf_order(p_scope text,p_keys text[],p_revision integer)
returns public.chronicles_shelf_order language plpgsql security invoker set search_path='' as $$
declare result public.chronicles_shelf_order;
begin
 if p_keys is null or cardinality(p_keys)>500 or exists(select 1 from unnest(p_keys) k where k is null or length(k)>120 or k !~ '^(collection:(ar|en)|story:([1-9]|10|11|12):(ar|en)|book:[0-9a-f-]{36})$') then raise exception 'Invalid shelf order';end if;
 if (select count(distinct k) from unnest(p_keys) k)<>cardinality(p_keys) then raise exception 'Duplicate book in shelf order';end if;
 update public.chronicles_shelf_order set order_keys=p_keys,revision=revision+1,updated_at=clock_timestamp() where scope=p_scope and revision=p_revision returning * into result;
 if not found then raise exception 'Shelf changed on another device. Latest order loaded; please arrange again.';end if;
 return result;
end $$;
revoke all on function public.chronicles_save_shelf_order(text,text[],integer) from public;
grant execute on function public.chronicles_save_shelf_order(text,text[],integer) to anon,authenticated;
notify pgrst,'reload schema';
