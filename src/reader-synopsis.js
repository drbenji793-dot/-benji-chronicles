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
  root.querySelector('[data-reader-export]')?.addEventListener('click',()=>c.download(readerSynopsisHTML(value()),'Book_Synopsis_'+language+'_'+length+'.html','text/html;charset=utf-8'));
  root.querySelector('[data-reader-copy]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text());status('Synopsis copied.');}catch{status('Copy unavailable. Use Export HTML.');}});
  root.querySelector('[data-reader-share]')?.addEventListener('click',async()=>{try{if(!navigator.share){status('Sharing unavailable. Use Copy or Export HTML.');return;}await navigator.share({title:value().title,text:text()});status('Synopsis shared.');}catch(e){status(e.name==='AbortError'?'Sharing cancelled.':'Sharing failed. Use Copy or Export HTML.');}});
  root.querySelector('[data-reader-edit]')?.addEventListener('click',()=>{
   const revision=c.branch().revision,editLanguage=language,editLength=length,v=value();
   const m=c.modal('Edit '+synopsisLengths[length].toLowerCase()+' synopsis','<form>'+c.field('title','Book title',v.title)+c.area('text','Reader synopsis',v.text,10)+'<p class="dsl-form-status" role="status"></p><button type="submit">Save synopsis</button></form>');
   if(!m)return;m.querySelector('textarea').dir=language==='ar'?'rtl':'ltr';
   c.submit(m.querySelector('form'),f=>{
    if(c.branch().revision!==revision)throw Error('The book changed. Reopen the synopsis before saving.');
    const prose=String(f.get('text')).trim();if(!prose)throw Error('Write a synopsis before saving.');
    const d=structuredClone(c.model());d.readerSynopsis={...d.readerSynopsis,[editLanguage]:{...d.readerSynopsis?.[editLanguage],title:String(f.get('title')).trim(),[editLength]:prose}};return d;
   },'Edit reader synopsis');
  });
 }
 return {html,bind};
}
