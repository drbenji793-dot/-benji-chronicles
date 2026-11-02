// Compare the resolution state actually loaded before changing it.
export async function saveNoteResolution(api,note,entryId,writer){
 if(!note?.id||note.entry_id!==entryId)throw Error('This note is no longer available. Reload the chapter.');
 if(!Number.isInteger(note.revision))throw Error('Reload the chapter to load the current note revision.');
 const expected=note.resolved_at?'eq.'+encodeURIComponent(note.resolved_at):'is.null';
 const rows=await api('chronicles_book_notes?id=eq.'+encodeURIComponent(note.id)+'&entry_id=eq.'+encodeURIComponent(entryId)+'&revision=eq.'+note.revision+'&resolved_at='+expected,{
  method:'PATCH',headers:{Prefer:'return=representation'},
  body:JSON.stringify({resolved_at:note.resolved_at?null:new Date().toISOString(),resolved_by:note.resolved_at?null:writer,updated_by:writer,change_note:note.resolved_at?'Reopen writing note':'Resolve writing note'})
 });
 if(!rows?.length)throw Error('This note changed on another device. Reload the chapter before changing its status.');
 return rows[0];
}
