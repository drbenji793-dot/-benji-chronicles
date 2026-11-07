-- Staged only. No installation or content changes are performed by this file.
-- Preserve the existing invoker permissions and normal chapter note policies.
create or replace function public.chronicles_record_protocol_request(
 p_kind text, p_id uuid, p_revision integer, p_writer text, p_request jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_revision integer; note_id uuid; protocol_version text; register_name text;
begin
 if p_kind not in ('extra','chapter') or p_kind is null then raise exception 'Unknown chapter type'; end if;
 if p_kind='extra' then
  select revision into current_revision from public.chronicles_book_entries where id=p_id for share;
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
 return jsonb_build_object('id',note_id,'source_revision',current_revision);
end $$;
