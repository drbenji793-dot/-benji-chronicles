import {planningStory} from './collection-workspace.js';
export const SITE_LANGUAGE=typeof __CHRONICLES_EDITION__==='undefined'?'ar':__CHRONICLES_EDITION__;
export const SITES={ar:'https://benji-chronicles.vercel.app/',en:'https://benji-chronicles-english.vercel.app/'};
export function routeLanguage(params,books,siteLanguage=SITE_LANGUAGE){
 if(params.has('book'))return books.find(b=>b.id===params.get('book'))?.language||siteLanguage;
 if(params.get('lang')==='en'||params.get('lang')==='ar')return params.get('lang');
 if(params.get('reference')==='outside-time'||['references','storyline','characters'].some(x=>params.has(x)))return 'ar';
 return siteLanguage;
}
export function sourceKey(params){
 if(params.has('book')){const n=planningStory(params.get('book'));return n?'story:'+n+':ar':params.get('book');}
 if(params.has('story')||params.has('chapter'))return 'story:'+(Math.max(1,Math.min(12,Number(params.get('story'))||12)))+':ar';
 return null;
}
export function sourceHash(key){return key.startsWith('story:')?'#story='+key.split(':')[1]+'&lang=ar':'#book='+key;}
export function createEditionBridge({api,esc,clean,say,getWriter,canLeave}){
 let books=[],editions=[],serial=0,sendBusy=false;
 const bar=document.createElement('section');bar.className='edition-bridge';bar.dir='ltr';bar.setAttribute('aria-label','Connected language libraries');
 document.querySelector('.author-controls').after(bar);
 const q=s=>bar.querySelector(s);
 async function load(){[books,editions]=await Promise.all([api('chronicles_books?select=id,title,language,related_work'),api('chronicles_english_editions?select=*')]);}
 function rewriteLinks(){
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
   const hash=a.getAttribute('href');if(hash==='#main')return;
   const params=new URLSearchParams(hash.slice(1));const language=routeLanguage(params,books);
   if(language!==SITE_LANGUAGE){a.href=SITES[language]+hash;if(a.dataset.language)a.onclick=null;delete a.dataset.language;}
  });
 }
 // Links rendered by secondary dialogs/reading controls need the same separation.
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');if(!a||a.getAttribute('href')==='#main')return;
  const hash=a.getAttribute('href'),language=routeLanguage(new URLSearchParams(hash.slice(1)),books);
  if(language!==SITE_LANGUAGE){e.preventDefault();e.stopImmediatePropagation();if(canLeave())location.assign(SITES[language]+hash);}
 },true);
 const post=(name,body)=>api('rpc/'+name,{method:'POST',body:JSON.stringify(body)});
 const rowsFor=key=>post('chronicles_english_source_chapters',{p_source_key:key});
 function openModal(title,html){const d=document.querySelector('#modal');d.dir='ltr';document.querySelector('#modal-title').textContent=title;document.querySelector('#modal-content').innerHTML=html;if(!d.open)d.showModal();return d;}
 async function send(key,mode){
  if(!canLeave())return;
  if(getWriter()!=='Benji'){say('Select Benji to approve sending chapters.',true);return;}
  const d=openModal(mode==='translation'?'Translate to English':'Create English adaptation','<p>Loading saved Arabic chapters…</p>');
  try{
   const rows=await rowsFor(key);await load();const existing=editions.find(e=>e.source_key===key&&e.mode===mode);
   if(!d.open)return;
   const links=existing?await api('chronicles_english_sources?edition_id=eq.'+existing.id+'&select=source_id'):[];
   const already=new Set(links.map(x=>x.source_id));
   document.querySelector('#modal-content').innerHTML=`<form id="send-english" class="chronicles-book-form"><p>${mode==='translation'?'Keep the story, setting, characters and meaning in natural English.':'Develop an independent English version with your chosen setting, names and cultural changes.'}</p><label>English book title<input name="title" required maxlength="160" value="${esc(existing?books.find(b=>b.id===existing.target_book_id)?.title||'':'')}" ${existing?'readonly':''}></label><label>${mode==='translation'?'Translation notes':'Adaptation decisions'}<textarea name="instructions" maxlength="4000" rows="3" ${existing?'readonly':''}>${esc(existing?.instructions||'')}</textarea></label><p>Selected chapters arrive as empty English drafts with their Arabic source attached. English text is written and reviewed separately. Sending does not automatically translate or publish.</p><div class="edition-actions"><button type="button" id="select-source-all">Select all new chapters</button><button type="button" id="select-source-none">Clear</button></div><fieldset class="edition-chapter-list"><legend>Saved Arabic chapters</legend>${rows.map(r=>`<label><input type="checkbox" name="chapter" value="${r.id}" ${already.has(r.id)?'disabled':''}><span dir="auto">${r.chapter_number} · ${esc(r.title)} · Revision ${r.revision}${already.has(r.id)?' · Already linked':''}</span></label>`).join('')||'<p>No saved chapters yet.</p>'}</fieldset><button type="submit" class="primary">Approve and send selected chapters</button><p id="edition-send-status" role="status"></p></form>`;
   const form=document.querySelector('#send-english');
   form.querySelector('#select-source-all').onclick=()=>form.querySelectorAll('[name=chapter]:not(:disabled)').forEach(c=>c.checked=true);
   form.querySelector('#select-source-none').onclick=()=>form.querySelectorAll('[name=chapter]').forEach(c=>c.checked=false);
   form.onsubmit=async e=>{
    e.preventDefault();if(sendBusy)return;const selected=[...form.querySelectorAll('[name=chapter]:checked')].map(c=>rows.find(r=>r.id===c.value));
    const report=form.querySelector('#edition-send-status');if(!selected.length){report.textContent='Choose at least one new chapter.';return;}
    const button=form.querySelector('[type=submit]');button.disabled=true;sendBusy=true;
    try{const result=await post('chronicles_send_to_english',{p_source_key:key,p_mode:mode,p_title:form.elements.title.value.trim(),p_instructions:form.elements.instructions.value,p_chapters:selected.map(r=>({id:r.id,revision:r.revision})),p_writer:getWriter()});
     await load();report.innerHTML=`${Number(result.added)} draft chapters received. <a href="${SITES.en}#book=${encodeURIComponent(result.book_id)}">Open the English book</a>`;
     form.querySelectorAll('[name=chapter]:checked').forEach(c=>{c.checked=false;c.disabled=true;});
    }catch(error){report.textContent=error.message;}finally{button.disabled=false;sendBusy=false;}
   };
  }catch(error){document.querySelector('#modal-content').textContent=error.message;}
 }
 async function route(params){
  const token=++serial;let language=routeLanguage(params,books);
  if(params.has('book')&&!books.some(b=>b.id===params.get('book'))){await load();language=routeLanguage(params,books);}
  if(language!==SITE_LANGUAGE){location.replace(SITES[language]+location.hash);return true;}
  const opposite=SITE_LANGUAGE==='ar'?'en':'ar';
  bar.innerHTML=`<nav class="edition-actions"><span class="edition-label">${SITE_LANGUAGE==='en'?'English':'Arabic'} workspace</span><a href="${SITES[opposite]}">${opposite==='en'?'English':'Arabic'} Library ↗</a></nav>`;
  const key=sourceKey(params);
  if(SITE_LANGUAGE==='ar'&&key){
   const menu=document.createElement('details');menu.className='edition-menu';menu.innerHTML='<summary>English edition</summary><nav class="edition-actions"></nav>';const libraryLink=q('nav a');menu.querySelector('nav').append(libraryLink);bar.replaceChildren(menu);
   const actions=q('nav');actions.insertAdjacentHTML('beforeend','<button data-send="translation">Translate to English</button><button data-send="adaptation">Create English adaptation</button>');
   bar.querySelectorAll('[data-send]').forEach(b=>b.onclick=()=>send(key,b.dataset.send));
   editions.filter(e=>e.source_key===key).forEach(e=>actions.insertAdjacentHTML('beforeend',`<a href="${SITES.en}#book=${e.target_book_id}">Open English ${esc(e.mode)}</a>`));
  }
  if(SITE_LANGUAGE==='en'&&key){
   const edition=editions.find(e=>e.target_book_id===params.get('book'));
   const legacySource=params.has('book')?books.find(b=>b.id===params.get('book'))?.related_work:params.has('story')||params.has('chapter')?key:null;
   const origin=edition?.source_key||legacySource;
   if(origin)q('nav').insertAdjacentHTML('beforeend',`<a href="${SITES.ar}${sourceHash(origin)}">Arabic source ↗</a>`);
   if(edition){
    const host=document.createElement('div');host.className='edition-source';host.textContent='Checking Arabic source revisions…';bar.append(host);
    try{
     const [links,live,targets]=await Promise.all([api('chronicles_english_sources?edition_id=eq.'+edition.id+'&select=*'),rowsFor(edition.source_key),api('chronicles_book_entries?book_id=eq.'+edition.target_book_id+'&kind=eq.chapter&select=id,chapter_number')]);
     if(token!==serial)return false;
     const selected=params.get('chapter')?links.filter(l=>targets.find(t=>t.id===l.target_entry_id)?.chapter_number===Number(params.get('chapter'))):links;
     const changed=selected.filter(l=>live.find(r=>r.id===l.source_id)?.revision!==l.reviewed_revision);
     host.innerHTML=`<details><summary>${esc(edition.mode==='translation'?'Translation':'Adaptation')} source · ${changed.length?'Arabic source updated · '+changed.length+' to review':'Source versions checked'}</summary><p>${esc(edition.instructions||'Use the attached Arabic text as the source. English drafts remain independent.')}</p>${selected.map(l=>{
      const latest=live.find(r=>r.id===l.source_id),target=targets.find(t=>t.id===l.target_entry_id);
      const changed=latest&&latest.revision!==l.reviewed_revision;
      return `<details class="edition-source-chapter"><summary>English chapter ${target?.chapter_number||''} · ${esc(l.source_title)}${changed?' · Arabic source updated':!latest?' · Source unavailable':''}</summary><p>Sent revision ${l.source_revision} · Last reviewed revision ${l.reviewed_revision}. English text is never replaced automatically.</p><details><summary>Arabic source when sent</summary><article lang="ar" dir="rtl">${clean(l.source_body)}</article></details>${changed?`<details><summary>Current Arabic source · Revision ${latest.revision}</summary><article lang="ar" dir="rtl">${clean(latest.body)}</article></details><button data-review-source="${l.target_entry_id}" data-revision="${latest.revision}">Reviewed source change · Keep my English text</button>`:''}<a href="#book=${edition.target_book_id}&chapter=${target?.chapter_number||1}">Open English chapter</a></details>`;
     }).join('')}</details>`;
     host.querySelectorAll('[data-review-source]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await post('chronicles_review_english_source',{p_target_entry:button.dataset.reviewSource,p_revision:Number(button.dataset.revision),p_writer:getWriter()});await route(params);say('Source review recorded. English text is unchanged.');}catch(error){say(error.message,true);button.disabled=false;}});
    }catch(error){if(token===serial)host.textContent='Source status could not load. '+error.message;}
   }
  }
  return false;
 }
 return {load,route,rewriteLinks};
}
