import {escapeHTML as h} from './dsl-engine.js';
export const synopsisLengths={short:'Short',medium:'Medium',detailed:'Detailed'};
export function readerSynopsis(data,language='ar',length='short'){
 const edition=data.readerSynopsis?.[language]||{};
 return {title:edition.title||data.title||'Book',text:edition[length]||'',language};
}
export function readerSynopsisHTML(value){
 const {title,text,language}=value,dir=language==='ar'?'rtl':'ltr';
 return '<!doctype html><html lang="'+(language==='ar'?'ar':'en')+'" dir="'+dir+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+h(title)+'</title><style>body{max-width:42rem;margin:3rem auto;padding:0 1.25rem;color:#24382e;background:#fffdf8;font:18px/1.9 Georgia,serif}h1{font-size:1.8rem}p{white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{margin:0;max-width:none;background:white}}</style></head><body><h1>'+h(title)+'</h1>'+text.split(/\n\s*\n/).filter(Boolean).map(t=>'<p>'+h(t)+'</p>').join('')+'</body></html>';
}
export function readerSynopsisUI(c){
 let length='short',language=typeof c.language==='function'?null:(c.language||'ar');
 const value=()=>readerSynopsis(c.model(),language,length);
 const text=()=>value().title+'\n\n'+value().text;
 function html(){language=language||(typeof c.language==='function'?c.language():'ar')||'ar';const v=value();return '<section data-reader-synopsis><h2>Book synopsis</h2><div class="dsl-inline">'+c.select('length','Length',synopsisLengths,length).replace('name="length"','data-reader-length')+c.select('language','Language',{ar:'Arabic',en:'English'},language).replace('name="language"','data-reader-language')+'</div><article dir="'+(language==='ar'?'rtl':'ltr')+'"><h3>'+h(v.title)+'</h3>'+(v.text?v.text.split(/\n\s*\n/).map(t=>'<p style="white-space:pre-wrap">'+h(t)+'</p>').join(''):'<p>No reader synopsis saved yet. Use Edit to write this version.</p>')+'</article><div class="dsl-inline"><button data-reader-copy '+(!v.text?'disabled':'')+'>Copy</button><button data-reader-export '+(!v.text?'disabled':'')+'>Export HTML</button><button data-reader-share '+(!v.text?'disabled':'')+'>Share</button><button data-reader-edit>Edit</button></div><p data-reader-status role="status"></p></section>';}
 function bind(root){
  const status=t=>{const p=root.querySelector('[data-reader-status]');if(p)p.textContent=t;};
  root.querySelector('[data-reader-length]')?.addEventListener('change',e=>{length=e.target.value;c.render();});
  root.querySelector('[data-reader-language]')?.addEventListener('change',e=>{language=e.target.value;c.render();});
  const panel=root.querySelector('[data-reader-synopsis]'),opened=c.branch(),openedId=opened?.id,openedRevision=opened?.revision;let preparing=false;
  async function deliver(kind){
   if(preparing)return;preparing=true;const controls=[...panel.querySelectorAll('[data-reader-export],[data-reader-copy],[data-reader-share]')];controls.forEach(b=>b.disabled=true);
   const snapshot=structuredClone(value()),selectedLanguage=language,selectedLength=length;
   const current=()=>{if(!panel.isConnected||c.isCurrent?.()===false||c.branch()?.id!==openedId||c.branch()?.revision!==openedRevision||language!==selectedLanguage||length!==selectedLength||JSON.stringify(value())!==JSON.stringify(snapshot))throw Error('Synopsis source or selection changed. Reopen and try again.');};
   try{
    current();await c.verifySource?.({bookId:c.bookId,branchId:openedId,revision:openedRevision});current();
    const plain=snapshot.title+'\n\n'+snapshot.text;if(!snapshot.text)throw Error('No reader synopsis saved.');
    if(kind==='export'){c.download(readerSynopsisHTML(snapshot),'Book_Synopsis_'+selectedLanguage+'_'+selectedLength+'.html','text/html;charset=utf-8');status('Synopsis export prepared.');}
    if(kind==='copy'){await navigator.clipboard.writeText(plain);if(panel.isConnected)status('Synopsis copied.');}
    if(kind==='share'){if(!navigator.share)throw Error('Sharing unavailable. Use Copy or Export HTML.');await navigator.share({title:snapshot.title,text:plain});if(panel.isConnected)status('Synopsis shared.');}
   }catch(e){if(panel.isConnected)status(e.name==='AbortError'?'Sharing cancelled.':e.message||'Delivery failed. Reopen and try again.');}
   finally{preparing=false;controls.forEach(b=>b.disabled=!value().text);}
  }
  for(const kind of ['export','copy','share'])root.querySelector('[data-reader-'+kind+']')?.addEventListener('click',()=>deliver(kind));
  root.querySelector('[data-reader-edit]')?.addEventListener('click',()=>{
   const branchId=c.branch().id,revision=c.branch().revision,editLanguage=language,editLength=length,v=value();
   const m=c.modal('Edit '+synopsisLengths[length].toLowerCase()+' synopsis','<form>'+c.field('title','Book title',v.title)+c.area('text','Reader synopsis',v.text,10)+'<p class="dsl-form-status" role="status"></p><button type="submit">Save synopsis</button></form>');
   if(!m)return;m.querySelector('textarea').dir=language==='ar'?'rtl':'ltr';
   c.submit(m.querySelector('form'),f=>{
    if(c.branch().id!==branchId||c.branch().revision!==revision)throw Error('The book changed. Reopen the synopsis before saving.');
    const prose=String(f.get('text')).trim();if(!prose)throw Error('Write a synopsis before saving.');
    const d=structuredClone(c.model());d.readerSynopsis={...d.readerSynopsis,[editLanguage]:{...d.readerSynopsis?.[editLanguage],title:String(f.get('title')).trim(),[editLength]:prose}};return d;
   },'Edit reader synopsis');
  });
 }
 return {html,bind};
}
