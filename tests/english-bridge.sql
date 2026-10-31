begin;
set local role anon;
do $$
declare b public.chronicles_books;s public.chronicles_book_entries;r jsonb;r2 jsonb;tid uuid;n integer;
begin
 b:=public.chronicles_create_library_book('TEST language bridge rollback only','','Benji','shared','ar');
 insert into public.chronicles_book_entries(book_id,kind,chapter_number,title,body,updated_by) values(b.id,'chapter',1,'مصدر للاختبار','<p>Original Arabic source</p>','Benji') returning * into s;
 r:=public.chronicles_send_to_english(b.id::text,'translation','TEST English rollback only','Keep the original setting',jsonb_build_array(jsonb_build_object('id',s.id,'revision',s.revision)),'Benji');
 if (r->>'added')::int<>1 then raise exception 'Send failed';end if;
 r2:=public.chronicles_send_to_english(b.id::text,'translation','TEST English rollback only','',jsonb_build_array(jsonb_build_object('id',s.id,'revision',s.revision)),'Benji');
 if (r2->>'added')::int<>0 or r2->>'book_id'<>r->>'book_id' then raise exception 'Duplicate transfer';end if;
 select target_entry_id into tid from public.chronicles_english_sources where source_id=s.id;
 if (select body from public.chronicles_book_entries where id=tid)<>'' then raise exception 'Source must not masquerade as translated English';end if;
 update public.chronicles_book_entries set body='<p>Independent English text</p>' where id=tid;
 update public.chronicles_book_entries set body='<p>Changed Arabic source</p>' where id=s.id;
 if (select source_body from public.chronicles_english_sources where target_entry_id=tid)<>'<p>Original Arabic source</p>' then raise exception 'Snapshot lost';end if;
 begin
  perform public.chronicles_send_to_english(b.id::text,'translation','TEST','',jsonb_build_array(jsonb_build_object('id',s.id,'revision',1)),'Benji');
  raise exception 'Expected stale revision rejection';
 exception when others then if sqlerrm not like 'Arabic chapter changed.%' then raise;end if;end;
 perform public.chronicles_review_english_source(tid,2,'Benji');
 if (select reviewed_revision from public.chronicles_english_sources where target_entry_id=tid)<>2 then raise exception 'Review missing';end if;
 if (select body from public.chronicles_book_entries where id=tid)<>'<p>Independent English text</p>' then raise exception 'English overwritten';end if;
 r2:=public.chronicles_send_to_english(b.id::text,'adaptation','TEST Adaptation rollback only','New setting',jsonb_build_array(jsonb_build_object('id',s.id,'revision',2)),'Benji');
 if r2->>'book_id'=r->>'book_id' then raise exception 'Translation and adaptation not independent';end if;
 begin
  perform public.chronicles_send_to_english(b.id::text,'translation','TEST','',jsonb_build_array(jsonb_build_object('id',s.id,'revision',2)),'Guest');
  raise exception 'Expected writer rejection';
 exception when others then if sqlerrm not like 'Select Benji%' then raise;end if;end;
end $$;
rollback;
select 'PASS: public client grants, source snapshots, idempotent sends, revision conflicts, independent adaptation, English preservation and source review. All fixtures rolled back.' as result;
