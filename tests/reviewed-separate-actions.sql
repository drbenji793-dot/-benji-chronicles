-- Run together. Every fixture mutation and history entry rolls back.
begin;
set local role anon;
do $test$
declare c public.chronicles_book_entries; b public.chronicles_dsl_branches;
 w public.chronicles_workflow; result jsonb; action text; mode integer;
 cr integer; br integer; branch_id uuid; rejected boolean;
 expected_ink integer; old_workflow jsonb; old_ink text; after_ink text;
begin
 select * into c from public.chronicles_book_entries where id='b20da2dd-c78e-41a0-a275-4fd07cfc9f8f';
 select * into b from public.chronicles_dsl_branches where id='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1';
 if c.id is null or b.id is null then raise exception 'TEST FAILED: source missing';end if;
 foreach action in array array['approve','transfer'] loop
  for mode in 1..4 loop
   cr:=case when mode=1 then c.revision-1 else c.revision end;
   br:=case when mode=2 then b.revision-1 when mode=4 then null else b.revision end;
   branch_id:=case when mode=3 then null else b.id end;rejected:=false;
   begin
    if action='approve' then perform public.chronicles_reviewed_approve(c.id,cr,'Benji',branch_id,br);
    else perform public.chronicles_reviewed_transfer(c.id,cr,0,'Benji',branch_id,br);end if;
   exception when others then
    if sqlerrm not like 'CURRENT_SOURCE:%' then raise;end if;rejected:=true;
   end;
   if not rejected then raise exception 'TEST FAILED: % accepted stale/missing token %',action,mode;end if;
  end loop;
 end loop;
 rejected:=false;
 begin perform public.chronicles_reviewed_approve(c.id,c.revision,'Benji',b.id,b.revision);
 exception when others then if sqlerrm not like 'CURRENT_SOURCE:%' then raise;end if;rejected:=true;end;
 if not rejected then raise exception 'TEST FAILED: missing approved name accepted';end if;
 update public.chronicles_book_entries set body=body||'<p>سعد أبو العلا</p>',updated_by='Benji' where id=c.id and revision=c.revision;
 select * into c from public.chronicles_book_entries where id=c.id;
 select * into b from public.chronicles_dsl_branches where id=b.id;
 select coalesce(max(t.revision),0) into expected_ink from public.ink_entries t where t.book_id=(select ink_book_id from public.chronicles_book_controls where book_key=c.book_id::text) and t.source_meta->>'chronicles_source_id'=c.id::text;
 select to_jsonb(t) into old_workflow from public.chronicles_workflow t where source_id=c.id;
 select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) into old_ink from public.ink_entries t;
 begin
  w:=public.chronicles_reviewed_approve(c.id,c.revision,'Benji',b.id,b.revision);
  if w.approved_revision is distinct from c.revision then raise exception 'TEST FAILED: separate approval';end if;
  rejected:=false;
  begin perform public.chronicles_reviewed_transfer(c.id,c.revision,expected_ink+1,'Benji',b.id,b.revision);
  exception when others then if sqlerrm not like 'CONFLICT: Ink changed%' then raise;end if;rejected:=true;end;
  if not rejected then raise exception 'TEST FAILED: changed Ink target accepted';end if;
  result:=public.chronicles_reviewed_transfer(c.id,c.revision,expected_ink,'Benji',b.id,b.revision);
  if jsonb_array_length(result)<>1 then raise exception 'TEST FAILED: separate transfer';end if;
  select * into w from public.chronicles_workflow where source_id=c.id;
  if w.transferred_revision is distinct from c.revision or not exists(select 1 from public.ink_entries where id=w.ink_entry_id and body=c.body) then raise exception 'TEST FAILED: transfer mismatch';end if;
  raise exception using errcode='P0099',message='Intentional rollback';
 exception when sqlstate 'P0099' then null;end;
 select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) into after_ink from public.ink_entries t;
 if after_ink is distinct from old_ink or (select to_jsonb(t) from public.chronicles_workflow t where source_id=c.id) is distinct from old_workflow then raise exception 'TEST FAILED: partial writes survived';end if;
 w:=public.chronicles_reviewed_approve(c.id,c.revision,'Benji',b.id,b.revision);
 result:=public.chronicles_reviewed_transfer(c.id,c.revision,expected_ink,'Benji',b.id,b.revision);
 if jsonb_array_length(result)<>1 then raise exception 'TEST FAILED: retry';end if;
end $test$;
rollback;
select 'PASS separate approval and transfer: stale/missing tokens, missing name, corrected fixture, rollback and retry; no fixture persisted' as result;
