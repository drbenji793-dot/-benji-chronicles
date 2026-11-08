-- Additive installation source. Does not rewrite or approve chapter content.
-- Preserve the existing invoker permissions and normal chapter note policies.
create or replace function public.chronicles_record_protocol_request(
 p_kind text, p_id uuid, p_revision integer, p_writer text, p_request jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_revision integer; note_id uuid; protocol_version text; register_name text; source_book uuid; planning_revision integer; planning_data jsonb; planning_context jsonb;
begin
 if p_kind not in ('extra','chapter') or p_kind is null then raise exception 'Unknown chapter type'; end if;
 if p_kind='extra' then
  select revision,book_id into current_revision,source_book from public.chronicles_book_entries where id=p_id for share;
 else
  select revision into current_revision from public.chronicles_chapters where id=p_id for share;
 end if;
 if not found or current_revision is distinct from p_revision then
  raise exception 'CURRENT_SOURCE: chapter changed. Reopen before preparing a request.';
 end if;
 protocol_version:=p_request->>'resolved'; register_name:=p_request->>'register';
 if protocol_version is null or protocol_version !~ '^_zk[1-9][0-9]*e?\.[0-9]+$'
    or coalesce(p_request->>'sha256','') !~ '^[a-f0-9]{64}$'
    or coalesce(p_request->>'offline','true')<>'false'
    or register_name is null or register_name not in ('English','_am','_f')
    or nullif(trim(p_writer),'') is null then
  raise exception 'CURRENT_SOURCE: complete online protocol reference required.';
 end if;
 if (register_name='English' and (protocol_version !~ '^_zk[1-9][0-9]*e\.[0-9]+$' or substring(protocol_version from '^_zk([0-9]+)')::numeric<5))
    or (register_name<>'English' and (protocol_version !~ '^_zk[1-9][0-9]*\.[0-9]+$' or substring(protocol_version from '^_zk([0-9]+)')::numeric<7)) then
  raise exception 'CURRENT_SOURCE: historical or mismatched protocol reference.';
 end if;
 -- Registered book requests must bind the current planning revision. Missing
 -- decisions cannot be replaced by manually typed claims or a stale export.
 if source_book='c911584d-bd5b-42fe-b41c-a2a456c64d41' then
  select revision,data into planning_revision,planning_data from public.chronicles_dsl_branches
   where id='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1' and book_id='66739f5d-2bac-4d75-a4fd-6df93da8ac7e' and archived=false for share;
  if not found or coalesce(p_request->'planning'->>'branchId','')<>'9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1'
   or coalesce(p_request->'planning'->>'branchRevision','')<>planning_revision::text
   or jsonb_typeof(planning_data->'decisions') is distinct from 'array'
   or jsonb_array_length(planning_data->'decisions')=0 then
   raise exception 'CURRENT_SOURCE: current decisions missing or changed. Reopen before preparing a request.';
  end if;
  planning_context:=jsonb_build_object('bookId','66739f5d-2bac-4d75-a4fd-6df93da8ac7e','branchId','9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1','branchRevision',planning_revision,'decisions',planning_data->'decisions','approvalGranted',false);
  p_request:=p_request||jsonb_build_object('planning',planning_context);
 end if;
 -- This records the supplied reference, not authentication of HQ approval.
 if p_kind='extra' then
  insert into public.chronicles_book_notes(entry_id,body,author,source_revision,note_meta,updated_by,change_note)
  values(p_id,'Writing request prepared with '||protocol_version||' '||register_name||'. No chapter rewrite or approval.',p_writer,p_revision,
    jsonb_build_object('types',jsonb_build_array('Note'),'protocolRequest',p_request),p_writer,'HQ protocol request') returning id into note_id;
 else
  insert into public.chronicles_notes(chapter_id,body,author,source_revision,note_meta,updated_by,change_note)
  values(p_id,'Writing request prepared with '||protocol_version||' '||register_name||'. No chapter rewrite or approval.',p_writer,p_revision,
    jsonb_build_object('types',jsonb_build_array('Note'),'protocolRequest',p_request),p_writer,'HQ protocol request') returning id into note_id;
 end if;
 return jsonb_build_object('id',note_id,'source_revision',current_revision,'planning',planning_context);
end $$;
