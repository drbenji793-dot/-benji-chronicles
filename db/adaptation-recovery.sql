create function chronicles_internal.stamp_adaptation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if NEW.title is not distinct from OLD.title and NEW.setting is not distinct from OLD.setting then return OLD; end if;
  NEW.revision:=OLD.revision+1;
 else NEW.revision:=1; end if;
 NEW.updated_at:=clock_timestamp();return NEW;
end $$;
create function chronicles_internal.archive_adaptation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and NEW.revision=OLD.revision then return NEW; end if;
 insert into chronicles_internal.record_history(table_name,record_id,revision,writer,change_note,previous_record,current_record)
 values(TG_TABLE_NAME,NEW.id::text,NEW.revision,coalesce(nullif(current_setting('chronicles.writer',true),''),'Unspecified'),'Adaptation details saved',case when TG_OP='UPDATE' then to_jsonb(OLD) else null end,to_jsonb(NEW));
 return NEW;
end $$;
revoke all on function chronicles_internal.stamp_adaptation() from public,anon,authenticated;
revoke all on function chronicles_internal.archive_adaptation() from public,anon,authenticated;
create trigger adaptation_stamp before insert or update on public.chronicles_adaptations for each row execute function chronicles_internal.stamp_adaptation();
create trigger adaptation_recovery after insert or update on public.chronicles_adaptations for each row execute function chronicles_internal.archive_adaptation();