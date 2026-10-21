alter table public.chronicles_notes drop constraint chronicles_notes_author_check;
alter table public.chronicles_notes add constraint chronicles_notes_author_check check (length(btrim(author)) between 1 and 40 and author !~ '[<>[:cntrl:]]');
alter policy chronicles_edit on public.chronicles_chapters using (true) with check (length(btrim(updated_by)) between 1 and 40 and updated_by !~ '[<>[:cntrl:]]');
alter policy chronicles_notes_add on public.chronicles_notes with check (length(btrim(author)) between 1 and 40 and author !~ '[<>[:cntrl:]]');
