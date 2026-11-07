create or replace function public.chronicles_current_decision_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.chronicles_book_entries; b public.chronicles_dsl_branches; decision jsonb; plain text;
begin
 if new.source_kind<>'extra' then return new; end if;
 select * into c from public.chronicles_book_entries where id=new.source_id for share;
 if not found or c.book_id<>'c911584d-bd5b-42fe-b41c-a2a456c64d41'::uuid or c.chapter_number<>1 then return new; end if;
 select * into b from public.chronicles_dsl_branches
 where id='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1'::uuid
 and book_id='66739f5d-2bac-4d75-a4fd-6df93da8ac7e'::uuid and not archived for share;
 if not found then raise exception 'CURRENT_SOURCE: current decisions unavailable'; end if;
 select value into decision from pg_catalog.jsonb_array_elements(b.data->'decisions') where value->>'id'='claude-before-ch11-03';
 if decision is null or decision->>'status' is distinct from 'approved'
 or coalesce(decision->>'recordStatus','current')<>'current'
 or coalesce(decision->>'source','')=''
 or position('سعد أبو العلا' in coalesce(decision->>'text',''))=0 then
 raise exception 'CURRENT_SOURCE: approved introduction requires reconciliation'; end if;
 plain:=pg_catalog.regexp_replace(pg_catalog.regexp_replace(pg_catalog.regexp_replace(c.body,'<[^>]*>','','g'),'[ً-ٰٟ]','','g'),'\s+',' ','g');
 if position('سعد أبو العلا' in plain)=0 then raise exception 'CURRENT_SOURCE: Chapter 1 must introduce سعد أبو العلا before approval or transfer'; end if;
 if new.approved_revision is distinct from c.revision or new.approved_body is distinct from c.body or new.approved_title is distinct from c.title then
 raise exception 'CURRENT_SOURCE: approval must match the current saved chapter'; end if;
 return new;
end $$;
create trigger chronicles_current_decision_guard
before insert or update on public.chronicles_workflow
for each row execute function public.chronicles_current_decision_guard();