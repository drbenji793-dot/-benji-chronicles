-- Additive metadata only. Existing content and its original dates are not rewritten.
create schema if not exists chronicles_internal;
revoke all on schema chronicles_internal from public,anon,authenticated;
create table chronicles_internal.record_history (
 id bigint generated always as identity primary key,
 table_name text not null, record_id text not null, revision integer not null,
 saved_at timestamptz not null default clock_timestamp(),
 writer text not null, change_note text not null,
 previous_record jsonb, current_record jsonb not null,
 unique(table_name,record_id,revision)
);
alter table chronicles_internal.record_history enable row level security;
revoke all on chronicles_internal.record_history from public,anon,authenticated;
create function chronicles_internal.stamp_record() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if (to_jsonb(NEW)-array['revision','updated_at','updated_by','change_note']) = (to_jsonb(OLD)-array['revision','updated_at','updated_by','change_note']) then return OLD; end if;
  NEW.revision:=OLD.revision+1;
 else NEW.revision:=1;
 end if;
 NEW.updated_at:=clock_timestamp();
 -- A claimed writer is attribution, never authentication or approval.
 if coalesce(current_setting('request.method',true),'')='' then
  NEW.updated_by:=coalesce(nullif(current_setting('chronicles.writer',true),''),'Database maintenance (unspecified)');
 else NEW.updated_by:=coalesce(nullif(NEW.updated_by,''),'Unspecified'); end if;
 NEW.change_note:=coalesce(nullif(NEW.change_note,''),'Record saved');
 return NEW;
end $$;
-- Trigger-only definer: clients cannot insert, edit or delete recovery records.
-- No auth.uid assumption: this existing application uses selected writer attribution.
create function chronicles_internal.archive_record() returns trigger
language plpgsql security definer set search_path='' as $$
declare current_data jsonb:=to_jsonb(NEW); old_data jsonb; key text;
begin
 if TG_OP='UPDATE' then
  if NEW.revision=OLD.revision then return NEW; end if;
  old_data:=to_jsonb(OLD);
 end if;
 key:=coalesce(current_data->>'book_key',current_data->>'id');
 insert into chronicles_internal.record_history(table_name,record_id,revision,writer,change_note,previous_record,current_record)
 values(TG_TABLE_NAME,key,NEW.revision,NEW.updated_by,NEW.change_note,old_data,current_data);
 return NEW;
end $$;
revoke all on function chronicles_internal.stamp_record() from public,anon,authenticated;
revoke all on function chronicles_internal.archive_record() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['chronicles_book_controls','chronicles_books','chronicles_book_notes'] loop
  execute format('alter table public.%I add column revision integer not null default 0, add column updated_at timestamptz, add column updated_by text, add column change_note text',t);
  execute format('create trigger update_record_stamp before insert or update on public.%I for each row execute function chronicles_internal.stamp_record()',t);
  execute format('create trigger update_record_history after insert or update on public.%I for each row execute function chronicles_internal.archive_record()',t);
 end loop;
end $$;
grant update(updated_by,change_note) on public.chronicles_books to anon,authenticated;
comment on column public.chronicles_book_controls.revision is '0 is initialization of an existing record, not a historical edit count. updated_at stays unknown until a new save.';
comment on column public.chronicles_books.revision is '0 is initialization of an existing record, not a historical edit count.';
comment on column public.chronicles_book_notes.revision is '0 is initialization of an existing record, not a historical edit count.';
-- Administrative maintenance uses the same compare-before-write rule. This is
-- intentionally private and not granted to browser/API roles.
create function chronicles_internal.update_record(p_table text,p_id text,p_revision integer,p_patch jsonb,p_writer text,p_note text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare allowed text[]; field text; assignments text:=''; key text; saved jsonb; patch jsonb;
 prior_writer text:=current_setting('chronicles.writer',true);
begin
 allowed:=case p_table
  when 'chronicles_book_controls' then array['title','deleted_at']
  when 'chronicles_books' then array['related_work']
  when 'chronicles_book_notes' then array['resolved_at','resolved_by'] end;
 if allowed is null or p_revision is null or p_revision<0 or coalesce(btrim(p_writer),'')='' or coalesce(btrim(p_note),'')='' or jsonb_typeof(p_patch) is distinct from 'object' or p_patch='{}'::jsonb then raise exception 'Valid scope, source revision, writer, note and patch required'; end if;
 for field in select jsonb_object_keys(p_patch) loop
  if not(field=any(allowed)) then raise exception 'Unsupported field'; end if;
 end loop;
 patch:=p_patch||jsonb_build_object('updated_by',p_writer,'change_note',p_note);
 for field in select jsonb_object_keys(patch) loop
  assignments:=assignments||case when assignments='' then '' else ',' end||format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',field,p_table,field);
 end loop;
 key:=case when p_table='chronicles_book_controls' then 'book_key' else 'id' end;
 perform set_config('chronicles.writer',p_writer,true);
 execute format('update public.%I as target set %s where %I::text=$2 and revision=$3 returning to_jsonb(target)',p_table,assignments,key) into saved using patch,p_id,p_revision;
 perform set_config('chronicles.writer',coalesce(prior_writer,''),true);
 if saved is null then raise exception 'Source changed or missing; reconcile before saving' using errcode='40001'; end if;
 return saved;
end $$;
revoke all on function chronicles_internal.update_record(text,text,integer,jsonb,text,text) from public,anon,authenticated;
