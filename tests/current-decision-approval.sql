begin;
set local role anon;
do $test$
declare c public.chronicles_book_entries; w public.chronicles_workflow; rejected boolean:=false;
begin
 select * into c from public.chronicles_book_entries where id='b20da2dd-c78e-41a0-a275-4fd07cfc9f8f';
 begin
 perform public.chronicles_approve(c.id,'extra',c.revision,'Benji');
 exception when others then
 if sqlerrm not like 'CURRENT_SOURCE:%' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'TEST FAILED: unnamed chapter approved'; end if;
 update public.chronicles_book_entries set body=body||'<p>سعد أبو العلا</p>',updated_by='Benji' where id=c.id and revision=c.revision;
 select * into c from public.chronicles_book_entries where id=c.id;
 select * into w from public.chronicles_approve(c.id,'extra',c.revision,'Benji');
 if w.approved_revision<>c.revision then raise exception 'TEST FAILED: corrected fixture did not approve'; end if;
 rejected:=false;
 begin
 update public.chronicles_workflow set approved_body='different content' where source_id=c.id;
 exception when others then
 if sqlerrm not like 'CURRENT_SOURCE:%' then raise; end if;rejected:=true;
 end;
 if not rejected then raise exception 'TEST FAILED: mismatched approval snapshot accepted'; end if;
end $test$;
rollback;
select 'PASS anonymous-role approval: missing name blocked, corrected fixture accepted, mismatched snapshot blocked; all fixture writes rolled back' as result;