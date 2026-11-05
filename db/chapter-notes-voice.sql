-- Additive chapter feedback metadata. Preserve the existing shared access model.
alter table public.chronicles_notes add column quote_text text not null default '', add column source_revision integer, add column resolved_at timestamptz, add column resolved_by text, add column revision integer not null default 0, add column updated_at timestamptz, add column updated_by text, add column change_note text, add column note_meta jsonb not null default '{}'::jsonb check(jsonb_typeof(note_meta)='object' and octet_length(note_meta::text)<100000);
alter table public.chronicles_book_notes add column note_meta jsonb not null default '{}'::jsonb check(jsonb_typeof(note_meta)='object' and octet_length(note_meta::text)<100000);
create trigger update_record_stamp before insert or update on public.chronicles_notes for each row execute function chronicles_internal.stamp_record();
create trigger update_record_history after insert or update on public.chronicles_notes for each row execute function chronicles_internal.archive_record();
grant update(body,quote_text,resolved_at,resolved_by,note_meta,updated_by,change_note) on public.chronicles_notes to anon,authenticated;
grant update(body,quote_text,note_meta,updated_by,change_note) on public.chronicles_book_notes to anon,authenticated;
create policy chronicles_notes_edit on public.chronicles_notes for update to anon,authenticated using(exists(select 1 from public.chronicles_chapters c where c.id=chapter_id)) with check(exists(select 1 from public.chronicles_chapters c where c.id=chapter_id) and (resolved_by is null or resolved_by in('Benji','Ahmed','Guest','Guest 2','Default')));
-- Default is attribution only. Do not change approval guards or access roles.
do $block$ declare r record; expr text; begin
 for r in select c.relname,pc.conname,pg_get_constraintdef(pc.oid) as def from pg_constraint pc join pg_class c on c.oid=pc.conrelid join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relname like 'chronicles_%' and pc.contype='c' and pg_get_constraintdef(pc.oid) like '%''Guest 2''::text%' loop
  expr:=replace(r.def,'''Guest 2''::text','''Guest 2''::text, ''Default''::text');
  execute format('alter table public.%I drop constraint %I',r.relname,r.conname);
  execute format('alter table public.%I add constraint %I %s',r.relname,r.conname,expr);
 end loop;
 for r in select * from pg_policies where schemaname='public' and tablename like 'chronicles_%' and with_check like '%''Guest 2''::text%' loop
  execute format('alter policy %I on public.%I with check (%s)',r.policyname,r.tablename,replace(r.with_check,'''Guest 2''::text','''Guest 2''::text, ''Default''::text'));
 end loop;
 for r in select p.oid,pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('chronicles_insert_chapter','chronicles_new_adaptation_chapter','chronicles_save_resource') loop
  execute replace(r.def,'''Guest 2'')','''Guest 2'',''Default'')');
 end loop;
end $block$;
notify pgrst,'reload schema';

grant insert(note_meta,updated_by,change_note) on public.chronicles_book_notes to anon,authenticated;
