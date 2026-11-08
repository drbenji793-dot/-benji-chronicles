-- Additive endpoint for the registered Ibn Al Jabal review flow.
-- Existing endpoints remain compatible; this does not approve or rewrite prose.
create or replace function public.chronicles_reviewed_approve_and_transfer(
 p_id uuid, p_revision integer, p_expected_ink_revision integer, p_writer text,
 p_branch_id uuid, p_branch_revision integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.chronicles_book_entries; b public.chronicles_dsl_branches;
begin
 if p_writer is distinct from 'Benji' then raise exception 'Only Benji can approve and send'; end if;
 select * into c from public.chronicles_book_entries where id=p_id for update;
 if not found or c.revision is distinct from p_revision then
  raise exception 'CURRENT_SOURCE: chapter changed. Reopen Review before approval.';
 end if;
 if c.book_id is distinct from 'c911584d-bd5b-42fe-b41c-a2a456c64d41'::uuid
    or p_branch_id is distinct from '9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1'::uuid then
  raise exception 'CURRENT_SOURCE: this chapter and planning source are not registered together.';
 end if;
 select * into b from public.chronicles_dsl_branches
 where id=p_branch_id and book_id='66739f5d-2bac-4d75-a4fd-6df93da8ac7e'::uuid
 and archived=false for share;
 if not found or b.revision is distinct from p_branch_revision then
  raise exception 'CURRENT_SOURCE: decisions changed. Reopen Review before approval.';
 end if;
 -- Both locks remain held until the approval and Ink write commit or roll back.
 return public.chronicles_approve_and_transfer(p_id,p_revision,p_expected_ink_revision,p_writer);
end $$;

-- Separate actions use the same reviewed source boundary. Installed with rollback checks.
create or replace function public.chronicles_reviewed_approve(
 p_id uuid, p_revision integer, p_writer text, p_branch_id uuid, p_branch_revision integer
) returns public.chronicles_workflow language plpgsql security invoker set search_path = '' as $$
declare c public.chronicles_book_entries; b public.chronicles_dsl_branches;
begin
 if p_writer is distinct from 'Benji' then raise exception 'Only Benji can approve and send'; end if;
 select * into c from public.chronicles_book_entries where id=p_id for update;
 if not found or c.revision is distinct from p_revision then
  raise exception 'CURRENT_SOURCE: chapter changed. Reopen Review before approval.';
 end if;
 if c.book_id is distinct from 'c911584d-bd5b-42fe-b41c-a2a456c64d41'::uuid
    or p_branch_id is distinct from '9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1'::uuid then
  raise exception 'CURRENT_SOURCE: this chapter and planning source are not registered together.';
 end if;
 select * into b from public.chronicles_dsl_branches
 where id=p_branch_id and book_id='66739f5d-2bac-4d75-a4fd-6df93da8ac7e'::uuid
 and archived=false for share;
 if not found or b.revision is distinct from p_branch_revision then
  raise exception 'CURRENT_SOURCE: decisions changed. Reopen Review before approval.';
 end if;
 return public.chronicles_approve(p_id,'extra',p_revision,p_writer);
end $$;

create or replace function public.chronicles_reviewed_transfer(
 p_id uuid, p_revision integer, p_expected_ink_revision integer, p_writer text,
 p_branch_id uuid, p_branch_revision integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.chronicles_book_entries; b public.chronicles_dsl_branches;
 w public.chronicles_workflow; target public.ink_entries; bid uuid;
begin
 if p_writer is distinct from 'Benji' then raise exception 'Only Benji can approve and send'; end if;
 select * into c from public.chronicles_book_entries where id=p_id for update;
 if not found or c.revision is distinct from p_revision then
  raise exception 'CURRENT_SOURCE: chapter changed. Reopen Review before approval.';
 end if;
 if c.book_id is distinct from 'c911584d-bd5b-42fe-b41c-a2a456c64d41'::uuid
    or p_branch_id is distinct from '9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1'::uuid then
  raise exception 'CURRENT_SOURCE: this chapter and planning source are not registered together.';
 end if;
 select * into b from public.chronicles_dsl_branches
 where id=p_branch_id and book_id='66739f5d-2bac-4d75-a4fd-6df93da8ac7e'::uuid
 and archived=false for share;
 if not found or b.revision is distinct from p_branch_revision then
  raise exception 'CURRENT_SOURCE: decisions changed. Reopen Review before approval.';
 end if;
 select * into w from public.chronicles_workflow where source_id=c.id for update;
 if not found or w.approved_revision is distinct from c.revision then raise exception 'Approve this chapter first';end if;
 select ink_book_id into bid from public.chronicles_book_controls where book_key=c.book_id::text;
 if bid is null then raise exception 'Ink edition is not connected';end if;
 select * into target from public.ink_entries where book_id=bid
 and (id=w.ink_entry_id or source_meta->>'chronicles_source_id'=c.id::text)
 order by updated_at desc limit 1 for update;
 if coalesce(target.revision,0) is distinct from p_expected_ink_revision then
  raise exception 'CONFLICT: Ink changed. Compare again.';
 end if;
 if target.id is not null then update public.chronicles_workflow set ink_entry_id=target.id where source_id=c.id;end if;
 return public.chronicles_transfer(
  jsonb_build_array(jsonb_build_object('id',p_id,'revision',p_revision,'expected_ink_revision',p_expected_ink_revision)),
  p_writer,'[]'::jsonb);
end $$;
