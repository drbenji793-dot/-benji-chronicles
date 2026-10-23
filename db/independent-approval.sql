CREATE OR REPLACE FUNCTION public.chronicles_approve(p_id uuid, p_kind text, p_revision integer, p_writer text)
 RETURNS chronicles_workflow
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c record; a integer; result public.chronicles_workflow;
begin
 if p_writer <> 'Benji' then raise exception 'Choose a writer';end if;
 if p_kind='main' then
 select * into c from public.chronicles_chapters where id=p_id for share;
 if not found then raise exception 'Chapter missing';end if;
 
 elsif p_kind='extra' then select e.*,b.language,null::integer as story_number into c from public.chronicles_book_entries e join public.chronicles_books b on b.id=e.book_id where e.id=p_id for share;
 if not found then raise exception 'Chapter missing';end if;
 else raise exception 'Invalid source';end if;
 if c.revision<>p_revision then raise exception 'CONFLICT: chapter changed. Review latest revision.';end if;
 if length(trim(c.body))=0 then raise exception 'An empty chapter cannot be approved';end if;
 insert into public.chronicles_workflow(source_id,source_kind,approved_revision,approved_title,approved_body,approved_by,arabic_revision,original_snapshot)
 values(p_id,p_kind,c.revision,c.title,c.body,p_writer,a,case when p_kind='main' and c.language='en' then public.chronicles_original_snapshot(c.story_number) else null end)
 on conflict(source_id) do update set approved_revision=excluded.approved_revision,approved_title=excluded.approved_title,approved_body=excluded.approved_body,approved_by=excluded.approved_by,approved_at=clock_timestamp(),arabic_revision=excluded.arabic_revision,original_snapshot=excluded.original_snapshot returning * into result;
 return result;
end $function$

;
