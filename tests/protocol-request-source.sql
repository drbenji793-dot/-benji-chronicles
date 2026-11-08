begin;
set local role anon;
do $test$
declare source record; request jsonb; bad jsonb; result jsonb; rejected boolean; i integer;
begin
 for source in select 'extra' as kind,id,revision from public.chronicles_book_entries where id='b20da2dd-c78e-41a0-a275-4fd07cfc9f8f'
 union all select 'chapter',id,revision from public.chronicles_chapters where id=(select id from public.chronicles_chapters order by id limit 1)
 loop
  request:=jsonb_build_object('resolved','_zk7.0','sha256',repeat('a',64),'offline',false,'register','_am');
  if source.kind='extra' then request:=request||jsonb_build_object('planning',jsonb_build_object('branchId','9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1','branchRevision',(select revision from public.chronicles_dsl_branches where id='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1')));end if;
  for i in 1..7 loop
   bad:=case i when 2 then request||'{"offline":true}' when 3 then request||'{"sha256":"bad"}' when 4 then request||'{"resolved":"_zk6.0"}' when 5 then request||'{"register":"English"}' when 6 then request||'{"resolved":"_zk5e.0"}' when 7 then '{}' else request end;
   rejected:=false;
   begin perform public.chronicles_record_protocol_request(source.kind,source.id,case when i=1 then source.revision-1 else source.revision end,'Benji',bad);
   exception when others then if sqlerrm not like 'CURRENT_SOURCE:%' then raise;end if;rejected:=true;end;
   if not rejected then raise exception 'TEST FAILED: request % accepted for %',i,source.kind;end if;
  end loop;
  if source.kind='extra' then
   for i in 1..2 loop
    bad:=case i when 1 then request-'planning' else jsonb_set(request,'{planning,branchRevision}','-1') end;
    rejected:=false;
    begin perform public.chronicles_record_protocol_request(source.kind,source.id,source.revision,'Benji',bad);
    exception when others then if sqlerrm not like 'CURRENT_SOURCE:%' then raise;end if;rejected:=true;end;
    if not rejected then raise exception 'TEST FAILED: missing or stale planning accepted';end if;
   end loop;
  end if;
  result:=public.chronicles_record_protocol_request(source.kind,source.id,source.revision,'Benji',request);
  if source.kind='extra' and (result->'planning'->'decisions') is distinct from (select data->'decisions' from public.chronicles_dsl_branches where id='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1') then raise exception 'TEST FAILED: decisions not returned';end if;
  if (result->>'source_revision')::integer is distinct from source.revision then raise exception 'TEST FAILED: wrong request source';end if;
  if source.kind='extra' and not exists(select 1 from public.chronicles_book_notes where id=(result->>'id')::uuid and note_meta->'protocolRequest'->>'resolved'=request->>'resolved') then raise exception 'TEST FAILED: book note missing';end if;
  if source.kind='chapter' and not exists(select 1 from public.chronicles_notes where id=(result->>'id')::uuid and note_meta->'protocolRequest'->>'resolved'=request->>'resolved') then raise exception 'TEST FAILED: chapter note missing';end if;
  result:=public.chronicles_record_protocol_request(source.kind,source.id,source.revision,'Benji',request||'{"resolved":"_zk5e.0","register":"English"}');
 end loop;
end $test$;
rollback;
select 'PASS both chapter storage paths: stale revision, offline, invalid hash, historical Arabic and mismatched register rejected; valid references recorded; all notes rolled back' as result;
