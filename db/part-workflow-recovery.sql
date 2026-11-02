-- Future recovery only; existing content and historical dates are unchanged.
create table chronicles_internal.workflow_history (
 id bigint generated always as identity primary key,
 source_id uuid not null,
 recorded_at timestamptz not null default clock_timestamp(),
 operation text not null,
 writer text not null,
 previous_record jsonb,
 current_record jsonb
);
alter table chronicles_internal.workflow_history enable row level security;
revoke all on chronicles_internal.workflow_history from public,anon,authenticated;
revoke all on sequence chronicles_internal.workflow_history_id_seq from public,anon,authenticated;
create function chronicles_internal.archive_workflow() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and to_jsonb(NEW)=to_jsonb(OLD) then return NEW; end if;
 insert into chronicles_internal.workflow_history(source_id,operation,writer,previous_record,current_record)
 values(coalesce(NEW.source_id,OLD.source_id),TG_OP,
 coalesce(nullif(current_setting('chronicles.writer',true),''),'Unspecified'),
 case when TG_OP<>'INSERT' then to_jsonb(OLD) end,
 case when TG_OP<>'DELETE' then to_jsonb(NEW) end);
 return coalesce(NEW,OLD);
end $$;
revoke all on function chronicles_internal.archive_workflow() from public,anon,authenticated;
create trigger workflow_recovery after insert or update or delete on public.chronicles_workflow for each row execute function chronicles_internal.archive_workflow();

create or replace function public.chronicles_part_stamp() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  new.revision=old.revision+1;
  new.history=old.history || jsonb_build_array(to_jsonb(old)-'history');
 else new.revision=1;new.history='[]'::jsonb;
 end if;
 new.updated_at=clock_timestamp();return new;
end $$;
