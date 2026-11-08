import {formatTime} from './revision-stamp.js';
export function chapterWritingStamp(record,{esc,language,version,date=formatTime}){
 const {method,style_version,variant}=record.writing_meta||{};
 const guide=method==='Manual'?'None':style_version||'Unrecorded';
 const variants={E:'_am (العامية)',_am:'_am (العامية)',F:'_f (المثقفة)',_f:'_f (المثقفة)'};
 const label=(language==='ar'&&Object.hasOwn(variants,variant)?variants[variant]:variant)||'Unrecorded';
 const time=record.saved_at||record.updated_at;
 const writer=record.saved_by||record.updated_by;
 return '<p><strong>Saved '+esc(version(record.revision))+'</strong> · '+esc(time?date(time):'Time unrecorded')+(writer?' · '+esc(writer):'')+'</p>'
  +'<p>Method <strong>'+esc(method&&method!=='unknown'?method:'Unrecorded')+'</strong> · Guide '+esc(guide)+' · Variant <bdi>'+esc(label)+'</bdi></p>';
}
// Recovery is explicit: lists contain metadata; saved text loads only on request.
export async function mountChapterHistory({root,api,entryId,currentRevision,esc,clean,language,version,date,isCurrent,onRestore}){
 const scope='chronicles_book_versions?entry_id=eq.'+encodeURIComponent(entryId);
 root.innerHTML='<p>Read a saved revision or use it as an unsaved draft.</p><div data-revisions></div><p data-history-status role="status"></p><button data-more>Load revisions</button><div data-preview></div>';
 const list=root.querySelector('[data-revisions]'),status=root.querySelector('[data-history-status]'),more=root.querySelector('[data-more]'),preview=root.querySelector('[data-preview]');
 const valid=()=>root.isConnected&&isCurrent();
 const cache=new Map();let cursor=null,busy=false,request=0;
 async function open(row,restore){
  const ticket=++request;status.textContent='Loading saved text…';
  try{
   let saved=cache.get(row.id);
   if(!saved){const rows=await api(scope+'&id=eq.'+encodeURIComponent(row.id)+'&select=id,entry_id,title,body,revision,saved_at,saved_by,writing_meta&limit=1');saved=rows[0];if(!saved)throw Error('Revision unavailable.');cache.set(row.id,saved);}
   if(!valid()||ticket!==request)return;
   status.textContent='';
   if(restore){await onRestore(saved);return;}
   preview.innerHTML='<div class="preview" dir="'+(language==='en'?'ltr':'rtl')+'"><h2 dir="auto">'+esc(saved.title)+'</h2>'+(version?'<div class="chapter-stamp" dir="ltr">'+chapterWritingStamp(saved,{esc,language,version,date})+'</div>':'')+'<article class="prose">'+clean(saved.body)+'</article></div>';
  }catch(error){if(valid()&&ticket===request){status.textContent=error.message+' ';const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>open(row,restore);status.append(retry);}}
 }
 async function load(){
  if(busy||!valid())return;busy=true;more.disabled=true;status.textContent='Loading revisions…';
  try{
   const rows=await api(scope+'&select=id,entry_id,title,revision,saved_at,saved_by&order=revision.desc&limit=30'+(cursor===null?'':'&revision=lt.'+encodeURIComponent(cursor)));
   if(!valid())return;
   for(const row of rows){const item=document.createElement('div');item.className='version';
    item.innerHTML='<strong>Revision '+esc(row.revision)+(Number(row.revision)===Number(currentRevision)?' · Current':'')+'</strong><small>'+esc(row.saved_by||'Writer not recorded')+' · '+esc(formatTime(row.saved_at))+'</small><button data-read>Read</button>'+(Number(row.revision)<Number(currentRevision)?'<button data-restore>Use as draft</button>':'');
    item.querySelector('[data-read]').onclick=()=>open(row,false);const restore=item.querySelector('[data-restore]');if(restore)restore.onclick=()=>open(row,true);list.append(item);
   }
   if(rows.length)cursor=rows.at(-1).revision;
   more.hidden=rows.length<30;more.textContent='Load more';status.textContent=list.children.length?'':'No saved revisions yet.';
  }catch(error){if(valid()){status.textContent=error.message;more.textContent='Retry';}}
  finally{busy=false;more.disabled=false;}
 }
 more.onclick=load;await load();
}
