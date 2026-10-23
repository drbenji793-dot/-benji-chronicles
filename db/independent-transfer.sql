CREATE OR REPLACE FUNCTION public.chronicles_transfer(p_items jsonb, p_writer text, p_supplements jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item jsonb;c record;w public.chronicles_workflow;target public.ink_entries;book public.ink_books;extra public.chronicles_books;bid uuid;wid uuid;target_id uuid;key text;result jsonb:='[]';meta jsonb;sup jsonb;aid integer;
begin
 if p_writer <> 'Benji' or jsonb_array_length(p_items) <> 1 or jsonb_array_length(p_supplements) <> 0 then raise exception 'Benji can transfer one approved chapter at a time';end if;
 for item in select value from jsonb_array_elements(p_items) loop
 select * into w from public.chronicles_workflow where source_id=(item->>'id')::uuid for update;
 if not found then raise exception 'Approve the chapter first';end if;
 if w.source_kind='main' then
 select ch.*,null::uuid as book_id,'chapter'::text as kind into c from public.chronicles_chapters ch where id=w.source_id for share;key:=case when c.language='en' then 'adaptation:'||c.story_number when c.story_number=12 then 'main' else 'story:'||c.story_number end;target_id:=coalesce(c.source_entry_id,w.ink_entry_id);
 if c.language='en' and w.original_snapshot is distinct from public.chronicles_original_snapshot(c.story_number) then raise exception 'Original updated. Review and approve this adaptation again.';end if;
 else select e.*, b.language,null::integer as story_number into c from public.chronicles_book_entries e join public.chronicles_books b on b.id=e.book_id where e.id=w.source_id for share;key:=c.book_id::text;target_id:=w.ink_entry_id;end if;
 if exists(select 1 from public.chronicles_book_controls where book_key=key and deleted_at is not null) then raise exception 'Restore the book before transferring';end if;
 if c.revision<>w.approved_revision or c.revision<>(item->>'revision')::integer then raise exception 'CONFLICT: chapter changed after approval';end if;
 if w.source_kind='main' then
 select * into target from public.ink_entries where id=target_id for update;
 if not found then
 if c.language<>'en' then raise exception 'Original Ink chapter not found';end if;
 select * into book from public.ink_books where source_version='MF_COLLECTION_V1';bid:=book.id;wid:=book.workspace_id;
 if bid is null then raise exception 'Ink collection missing';end if;
 perform pg_advisory_xact_lock(6727,1);
 select * into target from public.ink_entries where book_id=bid and kind='chapter' and language='en' and (source_meta->>'story_number')::integer=c.story_number and (source_meta->>'local_chapter')::integer=c.chapter_number for update;
 if found then raise exception 'An English chapter already exists in Ink at this position. Link and review it before transferring.';end if;
 else bid:=target.book_id;wid:=target.workspace_id;end if;
 else
 insert into public.chronicles_book_controls(book_key) values(key) on conflict do nothing;
 select ink_book_id into bid from public.chronicles_book_controls where book_key=key for update;
 if bid is null then
 select * into extra from public.chronicles_books where id=c.book_id;
 select * into book from public.ink_create_book(coalesce((select title from public.chronicles_book_controls where book_key=key),extra.title),'',extra.description,p_writer,extra.collaboration,extra.language);
 bid:=book.id;update public.chronicles_book_controls set ink_book_id=bid where book_key=key;
 end if;
 select workspace_id into wid from public.ink_books where id=bid;
 select * into target from public.ink_entries where id=target_id for update;
 end if;
 meta:=jsonb_build_object('chronicles_source_id',w.source_id,'chronicles_kind',w.source_kind,'chronicles_revision',c.revision,'chronicles_writer',p_writer,'chronicles_updated_at',clock_timestamp(),'chronicles_url',case when w.source_kind='main' then 'https://benji-chronicles.vercel.app/#story='||c.story_number||'&lang='||c.language||'&chapter='||c.chapter_number else 'https://benji-chronicles.vercel.app/#book='||c.book_id||case when c.kind='rules' then '&rules=1' else '&chapter='||c.chapter_number end end);
 if w.source_kind='main' and c.language='en' then meta:=meta||jsonb_build_object('collection','missing_files','story_number',c.story_number,'local_chapter',c.chapter_number,'adaptation_id',(select id from public.chronicles_adaptations where story_number=c.story_number),'story_title',(select title from public.chronicles_adaptations where story_number=c.story_number));end if;
 if target.id is not null then
 if target.revision is distinct from (item->>'expected_ink_revision')::integer then raise exception 'CONFLICT: Ink changed. Compare again before updating.';end if;
 perform set_config('ink.expected_revision',target.revision::text,true);
 perform set_config('ink.revision_note','Approved Chronicles revision '||c.revision||' by '||p_writer,true);
 update public.ink_entries set title=c.title,body=c.body,body_format='html',source_meta=coalesce(source_meta,'{}')||meta where id=target.id returning * into target;
 else
 if (item->>'expected_ink_revision')::integer<>0 then raise exception 'CONFLICT: Ink mapping changed';end if;
 insert into public.ink_entries(workspace_id,book_id,kind,language,chapter_number,title,body,body_format,source_meta) values(wid,bid,case when c.kind='rules' then 'style' else 'chapter' end,c.language,case when w.source_kind='main' then (select coalesce(max(chapter_number),0)+1 from public.ink_entries where book_id=bid and kind='chapter' and language='en') else c.chapter_number end,c.title,c.body,'html',meta||jsonb_build_object('source_version','Benji Ink')) returning * into target;
 end if;
 update public.chronicles_workflow set ink_entry_id=target.id,ink_revision=target.revision,transferred_revision=c.revision,transferred_at=clock_timestamp() where source_id=w.source_id;
 result:=result||jsonb_build_array(jsonb_build_object('id',c.id,'ink_id',target.id,'revision',target.revision));
 end loop;
 for sup in select value from jsonb_array_elements(p_supplements) loop
 if sup->>'kind' not in ('style','characters','storyboard','notes') or length(sup->>'body')>2000000 then raise exception 'Invalid supporting material';end if;
 select * into target from public.ink_entries where book_id=bid and source_meta->>'chronicles_asset'=sup->>'kind' for update;
 meta:=jsonb_build_object('chronicles_asset',sup->>'kind','chronicles_updated_at',clock_timestamp(),'chronicles_writer',p_writer,'collection','missing_files','story_number',12);
 if target.id is null then
 if (sup->>'expected_revision')::integer<>0 then raise exception 'Supporting material changed';end if;
 insert into public.ink_entries(workspace_id,book_id,kind,language,title,body,body_format,source_meta) values(wid,bid,sup->>'kind','ar',sup->>'title',sup->>'body','html',meta);
 else
 if target.revision is distinct from (sup->>'expected_revision')::integer then raise exception 'CONFLICT: supporting material changed';end if;
 perform set_config('ink.expected_revision',target.revision::text,true);perform set_config('ink.revision_note','Supporting material from Chronicles by '||p_writer,true);
 update public.ink_entries set title=sup->>'title',body=sup->>'body',body_format='html',source_meta=source_meta||meta where id=target.id;
 end if;
 end loop;
 return result;
end $function$
;

