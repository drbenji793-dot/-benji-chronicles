begin;
do $$ declare a public.chronicles_adaptations; n integer; begin
 select * into a from public.chronicles_adaptations limit 1;
 update public.chronicles_adaptations set title=title||' test' where id=a.id and revision=a.revision;
 if (select revision from public.chronicles_adaptations where id=a.id)<>a.revision+1 then raise exception 'Revision failed'; end if;
 if not exists(select 1 from chronicles_internal.record_history where table_name='chronicles_adaptations' and record_id=a.id::text and previous_record=to_jsonb(a)) then raise exception 'Recovery failed'; end if;
 update public.chronicles_adaptations set title='stale' where id=a.id and revision=a.revision;
 get diagnostics n=row_count;if n<>0 then raise exception 'Stale accepted'; end if;
 update public.chronicles_adaptations set title=title where id=a.id;
 if (select revision from public.chronicles_adaptations where id=a.id)<>a.revision+1 then raise exception 'No-op restamped'; end if;
end $$; select 'PASS adaptation revision, previous snapshot, stale rejection and no-op' as result; rollback;