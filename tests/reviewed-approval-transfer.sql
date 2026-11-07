-- Run as a single request. All prose, workflow and Ink fixture writes roll back.
begin;
set local role anon;
do $test$
declare c public.chronicles_book_entries; b public.chronicles_dsl_branches;
 target public.ink_entries; w public.chronicles_workflow; bid uuid; result jsonb;
 rejected boolean; old_ink jsonb; old_workflow jsonb;
begin
 select * into c from public.chronicles_book_entries where id='b20da2dd-c78e-41a0-a275-4fd07cfc9f8f';
 select * into b from public.chronicles_dsl_branches where id='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1';
 select ink_book_id into bid from public.chronicles_book_controls where book_key=c.book_id::text;
 select * into w from public.chronicles_workflow where source_id=c.id;
 select * into target from public.ink_entries where book_id=bid
 and (id=w.ink_entry_id or source_meta->>'chronicles_source_id'=c.id::text) order by updated_at desc limit 1;
 rejected:=false;
 begin
  perform public.chronicles_reviewed_approve_and_transfer(c.id,c.revision,coalesce(target.revision,0),'Benji',b.id,b.revision-1);
 exception when others then
  if sqlerrm not like 'CURRENT_SOURCE: decisions changed%' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'TEST FAILED: stale planning accepted';end if;
 rejected:=false;
 begin
  perform public.chronicles_reviewed_approve_and_transfer(c.id,c.revision-1,coalesce(target.revision,0),'Benji',b.id,b.revision);
 exception when others then
  if sqlerrm not like 'CURRENT_SOURCE: chapter changed%' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'TEST FAILED: stale chapter accepted';end if;
 rejected:=false;
 begin
  perform public.chronicles_reviewed_approve_and_transfer(c.id,c.revision,coalesce(target.revision,0),'Benji',null,b.revision);
 exception when others then
  if sqlerrm not like 'CURRENT_SOURCE: this chapter%' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'TEST FAILED: missing branch accepted';end if;
 rejected:=false;
 begin
  perform public.chronicles_reviewed_approve_and_transfer(c.id,c.revision,coalesce(target.revision,0),'Benji',b.id,null);
 exception when others then
  if sqlerrm not like 'CURRENT_SOURCE: decisions changed%' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'TEST FAILED: missing revision accepted';end if;
 -- The existing naming trigger still applies through the new endpoint.
 rejected:=false;
 begin
  perform public.chronicles_reviewed_approve_and_transfer(c.id,c.revision,coalesce(target.revision,0),'Benji',b.id,b.revision);
 exception when others then
  if sqlerrm not like 'CURRENT_SOURCE:%' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'TEST FAILED: unnamed live chapter accepted';end if;
 update public.chronicles_book_entries set body=body||'<p>سعد أبو العلا</p>',updated_by='Benji' where id=c.id and revision=c.revision;
 select * into c from public.chronicles_book_entries where id=c.id;
 -- Draft saves can refresh linked planning metadata; review the resulting branch.
 select * into b from public.chronicles_dsl_branches where id=b.id;
 select to_jsonb(t) into old_ink from public.ink_entries t where id=target.id;
 select to_jsonb(t) into old_workflow from public.chronicles_workflow t where source_id=c.id;
 -- Force a later transaction failure after the actual approval and transfer.
 begin
  result:=public.chronicles_reviewed_approve_and_transfer(c.id,c.revision,coalesce(target.revision,0),'Benji',b.id,b.revision);
  select * into w from public.chronicles_workflow where source_id=c.id;
  if w.approved_revision is distinct from c.revision or w.transferred_revision is distinct from c.revision then raise exception 'TEST FAILED: approval and transfer differ';end if;
  if not exists(select 1 from public.ink_entries where id=w.ink_entry_id and body=c.body and title=c.title) then raise exception 'TEST FAILED: Ink differs';end if;
  raise exception using errcode='P0099',message='Intentional rollback fixture';
 exception when sqlstate 'P0099' then null;
 end;
 if (select to_jsonb(t) from public.ink_entries t where id=target.id) is distinct from old_ink
 or (select to_jsonb(t) from public.chronicles_workflow t where source_id=c.id) is distinct from old_workflow then
  raise exception 'TEST FAILED: partial approval or Ink write survived rollback';
 end if;
 -- Retrying with the same reviewed versions succeeds after the rollback.
 result:=public.chronicles_reviewed_approve_and_transfer(c.id,c.revision,coalesce(target.revision,0),'Benji',b.id,b.revision);
 if jsonb_array_length(result)<>1 then raise exception 'TEST FAILED: retry failed';end if;
end $test$;
rollback;
select 'PASS stale planning, stale chapter, missing branch/revision and unnamed prose rejected; corrected fixture, rollback and retry passed; no fixture writes persisted' as result;
