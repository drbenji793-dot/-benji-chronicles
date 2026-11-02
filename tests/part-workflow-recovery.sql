begin;
do $$
declare p public.chronicles_book_parts; w public.chronicles_workflow; c public.chronicles_book_entries; n integer;
begin
 select * into strict p from public.chronicles_book_parts limit 1;
 update public.chronicles_book_parts set start_chapter=start_chapter+1 where id=p.id and revision=p.revision;
 if not exists(select 1 from public.chronicles_book_parts where id=p.id and history->-1=to_jsonb(p)-'history' and revision=p.revision+1) then raise exception 'Part boundary snapshot missing'; end if;
 update public.chronicles_book_parts set title='stale' where id=p.id and revision=p.revision;
 get diagnostics n=row_count; if n<>0 then raise exception 'Stale part write accepted'; end if;
 select * into strict w from public.chronicles_workflow limit 1;
 update public.chronicles_workflow set approved_title=coalesce(approved_title,'')||' test' where source_id=w.source_id;
 if not exists(select 1 from chronicles_internal.workflow_history where source_id=w.source_id and previous_record=to_jsonb(w) and operation='UPDATE') then raise exception 'Approval recovery missing'; end if;
 select * into w from public.chronicles_workflow where source_id=w.source_id;
 update public.chronicles_workflow set transferred_at=clock_timestamp() where source_id=w.source_id;
 if not exists(select 1 from chronicles_internal.workflow_history where source_id=w.source_id and previous_record=to_jsonb(w)) then raise exception 'Transfer recovery missing'; end if;
 select count(*) into n from chronicles_internal.workflow_history;
 update public.chronicles_workflow set approved_title=approved_title where source_id=w.source_id;
 if (select count(*) from chronicles_internal.workflow_history)<>n then raise exception 'No-op archived'; end if;
 select e.* into strict c from public.chronicles_book_entries e join public.chronicles_book_controls b on b.book_key=e.book_id::text where b.ink_book_id is not null limit 1;
 begin
  perform public.chronicles_approve_and_transfer(c.id,c.revision,-1,'Benji');
  raise exception 'Stale target accepted';
 exception when others then
  if sqlerrm not like 'CONFLICT: Ink changed%' then raise; end if;
 end;
 begin
  perform public.chronicles_approve_and_transfer(c.id,-1,0,'Benji');
  raise exception 'Stale source accepted';
 exception when others then
  if sqlerrm not like 'CONFLICT: reopen%' then raise; end if;
 end;
 if has_table_privilege('anon','chronicles_internal.workflow_history','SELECT') or has_table_privilege('authenticated','chronicles_internal.workflow_history','INSERT') then raise exception 'Recovery exposed'; end if;
end $$;
select 'PASS: part boundary, stale part, approval and transfer snapshots, no-op, stale source and target rejection, private access' result;
rollback;
