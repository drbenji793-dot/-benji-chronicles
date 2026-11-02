const encode=encodeURIComponent;
const conflict=()=>new Error('This record changed on another device. Reload and compare before saving.');
export async function saveBookControl(api,key,previous,changes,writer){
 const allowed=Object.keys(changes);
 if(!allowed.length||allowed.some(k=>!['title','deleted_at'].includes(k)))throw Error('Unsupported book change.');
 if(previous&&previous.book_key!==key)throw Error('Book context changed. Reopen the library.');
 if(previous&&!Number.isInteger(previous.revision))throw Error('Reload the library to load the current book revision.');
 if(previous&&allowed.every(k=>(previous[k]??null)===(changes[k]??null)))return previous;
 const path='chronicles_book_controls'+(previous?'?book_key=eq.'+encode(key)+'&revision=eq.'+previous.revision:'');
 const rows=await api(path,{method:previous?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...(!previous?{book_key:key}:{}),...changes,updated_by:writer,change_note:'Book '+(allowed.includes('title')?'renamed':changes.deleted_at?'moved to Trash':'restored')})});
 if(!rows?.length)throw conflict();
 return rows[0];
}
export async function saveBookRelation(api,book,related,writer){
 if(!book?.id||!Number.isInteger(book.revision))throw Error('Reload the book before changing its connection.');
 if((book.related_work??null)===related)return book;
 const rows=await api('chronicles_books?id=eq.'+encode(book.id)+'&revision=eq.'+book.revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({related_work:related,updated_by:writer,change_note:'Update related work connection'})});
 if(!rows?.length)throw conflict();return rows[0];
}
