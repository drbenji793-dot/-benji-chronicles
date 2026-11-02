begin;

select set_config('request.method','PATCH',true);
set local role anon;
do $$ declare k text; r integer; n integer; begin
 select id::text into k from public.chronicles_books limit 1;
 insert into public.chronicles_book_controls(book_key) values(k) on conflict do nothing;
 select revision into r from public.chronicles_book_controls where book_key=k;
 update public.chronicles_book_controls set title='Temporary concurrency verification',updated_by='Benji',change_note='Rollback test' where book_key=k and revision=r;
 if (select revision from public.chronicles_book_controls where book_key=k)<>r+1 then raise exception 'revision not advanced'; end if;
 update public.chronicles_book_controls set title='Stale overwrite' where book_key=k and revision=r;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'stale write accepted'; end if;
 update public.chronicles_book_controls set title='Temporary concurrency verification' where book_key=k;
 if (select revision from public.chronicles_book_controls where book_key=k)<>r+1 then raise exception 'no-op restamped'; end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from chronicles_internal.record_history where change_note='Rollback test' and previous_record is not null) then raise exception 'history missing'; end if;
 if has_schema_privilege('anon','chronicles_internal','USAGE') then raise exception 'history exposed'; end if;
end $$;
do $$ declare k text; r integer; saved jsonb; begin
 select book_key,revision into k,r from public.chronicles_book_controls limit 1;
 saved:=chronicles_internal.update_record('chronicles_book_controls',k,r,jsonb_build_object('title','Maintenance test'),'GPT','Rollback maintenance check');
 if (saved->>'revision')::integer<>r+1 then raise exception 'maintenance failed'; end if;
 begin
 perform chronicles_internal.update_record('chronicles_book_controls',k,r,jsonb_build_object('title','Stale maintenance'),'GPT','Rollback check');
 raise exception 'stale maintenance accepted';
 exception when serialization_failure then null; end;
 begin
 perform chronicles_internal.update_record('chronicles_book_controls',k,r+1,jsonb_build_object('ink_book_id','bad'),'GPT','Rollback check');
 raise exception 'unexpected field accepted';
 exception when raise_exception then if SQLERRM<>'Unsupported field' then raise; end if; end;
end $$;
select 'PASS revisions, stale rejection, no-op preservation, private recovery history; all rolled back' as result;
rollback;
