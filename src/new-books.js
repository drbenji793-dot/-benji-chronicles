import {planningStory} from './collection-workspace.js';
import {renderDSL} from './dsl.js';
import {OUTSIDE_TIME_BOOK} from './outside-time.js';
import {buildPDF,downloadBlob} from './export-book.js';
// Independent language libraries. The original "شرخ زمني" records remain in chronicles_chapters.
export function createChroniclesLibrary({api,esc,clean,storage,say,getWriter,navigate,date,workflow,trackAuthors}) {
  const $=selector=>document.querySelector(selector);
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const draftKey=id=>'chronicles-book-draft:'+id;
  let books=[],book=null,entries=[],active=null,editing=false,busy=false,parts=[],selectedPart=null;

  const chapterList=()=>entries.filter(e=>e.kind==='chapter').sort((a,b)=>a.chapter_number-b.chapter_number);
  const link=id=>'#book='+id;
  const entryLink=entry=>link(entry.book_id)+(entry.kind==='rules'?'&rules=1':'&chapter='+entry.chapter_number);
  const writerLabel=e=>e.updated_by==='Ahmed'?'author-ahmed':e.updated_by==='Guest'?'author-guest':'author-benji';

  async function load(){books=(await api('chronicles_books?select=*&order=created_at.asc')).filter(b=>!planningStory(b.id));}
  function isBookRoute(params){return params.has('book');}
  function cards(language='ar'){
    if(!books.some(b=>b.language===language&&b.id!==OUTSIDE_TIME_BOOK))return '';
    return '<section class="chronicles-extra-books" aria-label="Additional books"><h2>Books & Stories</h2><div class="chronicles-books-grid">'
      +books.filter(b=>b.language===language&&b.id!==OUTSIDE_TIME_BOOK).map(b=>`<a class="chronicles-new-card" href="#book=${esc(b.id)}">
        <div class="chronicles-new-cover">
          <span class="chronicles-book-label">BENJI CHRONICLES · NEW BOOK</span>
          <strong dir="auto">${esc(b.title)}</strong>
          <small>${b.collaboration==='shared'?'Shared story':'Independent story'}</small>
        </div>
        <div class="chronicles-new-info"><strong dir="auto">${esc(b.title)}</strong>
          <p dir="auto">${esc(b.description||'A new space for writing and adventures.')}</p>
          <small><span class="${b.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(b.primary_writer)}</span> · ${b.language==='en'?'English':'Arabic'} book</small>
          <span class="chronicles-new-open">Open book ↗</span>
        </div>
      </a>`).join('')+'</div></section>';
  }

  function modal(title,html){
    const dialog=$('#modal');
    dialog.dir='ltr';
    $('#modal-title').textContent=title;
    $('#modal-content').innerHTML=html;
    if(!dialog.open)dialog.showModal();
  }
  function showCreateModal(language='ar'){
    const selected=getWriter()==='Ahmed'?'Ahmed':'Benji';
    modal('+ New Book',`<form id="chronicles-create-book" class="chronicles-book-form">
      <label>Book title<input name="title" maxlength="160" required dir="auto" placeholder="New story title"></label>
      <label>Primary writer<select name="writer" required><option value="Benji" ${selected==='Benji'?'selected':''}>Benji</option><option value="Ahmed" ${selected==='Ahmed'?'selected':''}>Ahmed</option></select></label>
      <label>Book type<select name="collaboration"><option value="shared">Shared writing · Benji & Ahmed</option><option value="solo">Independent book</option></select></label>
      <label>Book idea (optional)<textarea name="description" rows="3" maxlength="2000" dir="auto"></textarea></label>
      <p class="reference-note">This book belongs to the ${language==='en'?'English':'Arabic'} library. It can stand alone, with its own rules and chapters.</p>
      <button class="primary" type="submit">+ Create book</button>
    </form>`);
    const form=$('#chronicles-create-book');
    form.onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(form),button=form.querySelector('button[type=submit]');
      button.disabled=true;
      try{
        const created=await api('rpc/chronicles_create_library_book',{
          method:'POST',headers:{Prefer:'return=representation'},
          body:JSON.stringify({
            p_language:language,p_title:String(f.get('title')||'').trim(),
            p_description:String(f.get('description')||'').trim(),
            p_writer:String(f.get('writer')||selected),
            p_collaboration:String(f.get('collaboration')||'shared')
          })
        });
        const b=Array.isArray(created)?created[0]:created;
        if(!b?.id)throw Error('Book creation was not confirmed.');
        await load();
        $('#modal').close();
        say('Book created. Its rules are ready to edit.');
        await navigate(link(b.id));
      }catch(err){say(err.message,true)}finally{button.disabled=false}
    };
  }

  function hasChanges(){
    if(!editing||!active||!$('#chronicles-entry-title')||!$('#chronicles-entry-body'))return false;
    return $('#chronicles-entry-title').value!==active.title
      ||clean($('#chronicles-entry-body').innerHTML)!==clean(active.body);
  }
  function backup(){
    if(!editing||!active||!$('#chronicles-entry-title')||!$('#chronicles-entry-body'))return;
    storage.set(draftKey(active.id),JSON.stringify({
      title:$('#chronicles-entry-title').value,
      body:clean($('#chronicles-entry-body').innerHTML),
      revision:active.revision,
      saved_at:new Date().toISOString()
    }));
    const status=$('#chronicles-entry-status');
    if(status)status.textContent='Unsaved draft';
  }
  function allowLeave(){
    if(busy){say('Saving. Please keep this page open.',true);return false}
    if(!hasChanges())return true;
    backup();
    return confirm('Leave this page? Your unsaved draft will remain on this device.');
  }
  function leave(){editing=false;active=null;}

  async function render(params){
    const id=params.get('book');
    if(!uuid.test(id))throw Error('Invalid book link.');
    book=books.find(b=>b.id===id);
    if(!book){await load();book=books.find(b=>b.id===id);}
    if(!book)throw Error('Book not found.');const footerRules=document.querySelector('.footer-rules [data-book-rules]');if(footerRules){footerRules.hidden=false;footerRules.textContent='Book Rules';footerRules.href=link(book.id)+'&rules=1';}
    const loaded=await api('chronicles_book_entries?book_id=eq.'+id+'&select=*&order=chapter_number.asc.nullslast');
    entries=loaded;
    parts=await api("chronicles_book_parts?book_id=eq."+id+"&select=*&order=start_chapter.asc");
    selectedPart=parts.find(p=>p.id===params.get("part"))||null;
    if(['dsl','storyline'].includes(params.get('view'))){active=null;editing=false;await renderDSL($('#main'),api,book.id,params.get('view'));return;}
    const rules=params.get('rules')==='1';
    const no=Number(params.get('chapter'));
    if(rules||params.has('chapter')){
      active=rules?entries.find(e=>e.kind==='rules'):entries.find(e=>e.kind==='chapter'&&e.chapter_number===no);
      if(!active)throw Error('Page not found.');
      selectedPart=partFor(active.chapter_number);
      editing=false;
      renderEntry();
    }else{active=null;editing=false;if(selectedPart)renderPartHome();else renderOverview();}
  }

  function partFor(number){return [...parts].reverse().find(p=>number>=p.start_chapter)||null;}
  function partChapters(p){return chapterList().filter(c=>partFor(c.chapter_number)?.id===p?.id);}
  function partName(p){return (book.language==='ar'?'Part ':'Part ')+(parts.indexOf(p)+1)+' · '+p.title;}
  function partsUI(){return `<div class="book-parts" dir="${book.language==='ar'?'rtl':'ltr'}"><label for="book-part-select" lang="en">${book.language==='ar'?'Part':'Part'}</label><select id="book-part-select"><option value="">${book.language==='ar'?'Choose part':'Choose part'}</option>${parts.map(p=>`<option value="${p.id}" ${selectedPart?.id===p.id?'selected':''}>${esc(partName(p))}</option>`).join('')}</select><div class="part-management"><button id="rename-part" ${selectedPart?'':'disabled'}>Rename part</button><button id="add-part">＋ New part</button>${selectedPart?`<p class="part-count" lang="en" dir="ltr">${partChapters(selectedPart).length} written chapters${selectedPart.planned_chapters?' · '+selectedPart.planned_chapters+' planned chapters':''}</p><details><summary lang="en" dir="ltr">Part revision details</summary><p>${esc(selectedPart.updated_by)} · ${date(selectedPart.updated_at)} · Revision ${selectedPart.revision}</p>${[...(selectedPart.history||[])].reverse().map(h=>`<p>${esc(h.title)} · ${esc(h.updated_by)} · ${date(h.updated_at)} · Revision ${h.revision}</p>`).join('')}</details>`:''}</div></div>`;}
  function bindParts(){
    $('#book-part-select').onchange=async e=>{const p=parts.find(x=>x.id===e.target.value);if(!p)return;const c=partChapters(p)[0];await navigate(c?entryLink(c):link(book.id)+'&part='+p.id);};
    $('#rename-part').onclick=()=>editPart(selectedPart);
    $('#add-part').onclick=()=>editPart(null);
  }
  function editPart(p){
    if(editing){say('Save or cancel chapter edits first.',true);return;}
    const next=Math.max(1,...parts.map(x=>x.start_chapter+(x.planned_chapters||1)),...chapterList().map(x=>x.chapter_number+1));
    modal(p?'Rename part':'New part',`<form id="part-form" dir="rtl"><label>Part title<input name="title" required maxlength="160" value="${esc(p?.title||'')}"></label>${p?'':`<label>First chapter number<input name="start" type="number" min="1" max="999" required value="${next}"></label><label>Planned chapter count (optional)<input name="count" type="number" min="1" max="999"></label>`}<button type="submit">Save</button><p id="part-error" role="alert"></p></form>`);
    $('#part-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;busy=true;try{
      const title=String(f.get('title')||'').trim();if(!title)throw Error('Enter a part title.');
      const payload={title,updated_by:getWriter()};if(!p){const start=Number(f.get('start'));if(!Number.isInteger(start)||start<1||start>999||parts.some(x=>x.start_chapter>=start))throw Error('The new part must start after the beginning of the last part.');Object.assign(payload,{book_id:book.id,start_chapter:start,planned_chapters:f.get('count')?Number(f.get('count')):null});}
      const rows=await api('chronicles_book_parts'+(p?'?id=eq.'+p.id+'&revision=eq.'+p.revision:''),{method:p?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
      if(!rows?.length)throw Error('This part changed on another device. Reopen the page before saving.');
      parts=p?parts.map(x=>x.id===p.id?rows[0]:x):[...parts,rows[0]].sort((a,b)=>a.start_chapter-b.start_chapter);selectedPart=rows[0];$('#modal').close();busy=false;
      if(p){if(active)renderEntry();else renderPartHome();}else await navigate(link(book.id)+'&part='+selectedPart.id);
      say('Part saved with the writer name and edit time.');
    }catch(err){$('#part-error').textContent=err.message;}finally{busy=false;btn.disabled=false;}};
  }
  function renderPartHome(){
    $('#main').innerHTML=header()+`<section class="reference-page" dir="rtl">${partsUI()}<h1>${esc(partName(selectedPart))}</h1><p>No chapters have been written in this part yet.</p><button id="part-new-chapter">＋ New chapter</button></section>`;
    const info=document.createElement('details');info.className='reading-details';info.innerHTML='<summary lang="en" dir="ltr">Save and review details</summary>';$('.book-parts').after(info);info.append($('.part-management'));
    bindParts();$('#part-new-chapter').onclick=showCreateChapter;
  }

  function header(){
    return `<nav class="crumb" dir="${book.language==='en'?'ltr':'rtl'}"><a href="#library&lang=${book.language}">Library</a><span>/</span><a href="${link(book.id)}" dir="auto">${esc(book.title)}</a></nav>`;
  }
  function renderOverview(){
    const list=chapterList();
    $('#main').innerHTML=header()+`<section class="reference-page chronicles-book-home" dir="${book.language==='en'?'ltr':'rtl'}">
      <div class="eyebrow">BENJI CHRONICLES · Independent book</div>
      <h1 dir="auto">${esc(book.title)}</h1>
      <p class="reference-intro" dir="auto">${esc(book.description||'A space to write a new story.')}</p>
      <p class="reference-note">Primary writer: <strong class="${book.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(book.primary_writer)}</strong>
         · ${book.collaboration==='shared'?'Shared writing workspace':'Independent book'} · ${book.language==='en'?'English':'Arabic'}</p>
      <div class="chronicles-book-actions">
        <button id="chronicles-add-chapter" class="primary">+ New chapter</button>
        <a href="${link(book.id)}&rules=1" class="reference-link">Book Rules</a>
        <a href="${link(book.id)}&view=dsl" class="reference-link">DSL Studio</a>
        <a href="${book.language==='en'?'https://benji-ink.vercel.app/#styles=zenglish&lang=en&view=laws':'#writing-rules'}" class="reference-link">Global Rules</a>
      </div>
      <button id="related-book">Related Story</button>${relatedLinks(book.id)}<h2>Chapters <small>(${list.length})</small></h2>
      ${list.length?'<div class="chronicles-chapter-cards">'+list.map(c=>`<a class="chronicles-chapter-card" href="${entryLink(c)}">
         <strong>Chapter ${c.chapter_number} · <span dir="auto">${esc(c.title)}</span></strong>
         <small>Revision ${c.revision} · ${esc(c.updated_by)} · ${date(c.updated_at)}</small>
       </a>`).join('')+'</div>':'<div class="guide-card"><p>No chapters yet. Use New chapter to begin.</p></div>'}
    </section><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    $('#chronicles-add-chapter').onclick=showCreateChapter;$('#related-book').onclick=editRelation;
  }
  const relatedRoute=key=>key.startsWith('story:')?('#story='+key.split(':')[1]+'&lang='+key.split(':')[2]):'#book='+key;
  function relatedLinks(key){const direct=books.find(b=>b.id===key)?.related_work;const links=[...(direct?[{key:direct,title:books.find(b=>b.id===direct)?.title||'Related story'}]:[]),...books.filter(b=>b.related_work===key).map(b=>({key:b.id,title:b.title}))];return links.map(x=>`<a class="reference-link" href="${relatedRoute(x.key)}">Related Story · ${esc(x.title)}</a>`).join('');}
  function editRelation(){modal('Related Story',`<form id="related-form"><p>A connection is optional. Each work keeps its own chapters and approval.</p><label>Connect to<select name="related"><option value="">None · Independent work</option>${books.filter(b=>b.id!==book.id&&b.language!==book.language).map(b=>`<option value="${b.id}">${esc(b.title)}</option>`).join('')}${book.language==='en'?['قطار الليل','الدور الرابع','ثلاث شقق في وسط البلد','ترجمة ناقصة','الساعة اللي وقفت','شقة بالإيجار القديم','البصمة الغلط','نهر بلا شهود','الراجل اللي بلّغ عن نفسه','فندق الجيزة ١٩٧٣','رسالة من بكرة','شرخ زمني'].map((t,i)=>`<option value="story:${i+1}:ar">${esc(t)}</option>`).join(''):'<option value="story:12:en">A Fracture in Time</option>'}</select></label><button>Save Connection</button></form>`);$('#related-form select').value=book.related_work||'';$('#related-form').onsubmit=async e=>{e.preventDefault();try{const related=new FormData(e.target).get('related')||null;await api('chronicles_books?id=eq.'+book.id,{method:'PATCH',body:JSON.stringify({related_work:related})});book.related_work=related;await load();$('#modal').close();renderOverview();say('Story connection saved.')}catch(e){say(e.message,true)}};}
  function showCreateChapter(){
    const next=selectedPart?Math.max(selectedPart.start_chapter,...partChapters(selectedPart).map(c=>c.chapter_number+1)):Math.max(0,...chapterList().map(c=>c.chapter_number))+1;
    modal('+ New chapter',`<form id="chronicles-create-chapter" class="chronicles-book-form">
      ${selectedPart?`<p>${esc(partName(selectedPart))}</p>`:''}
      <label>Chapter number<input name="number" type="number" min="1" max="999" value="${next}" required></label>
      <label>Chapter title<input name="title" required maxlength="200" dir="auto" value="${book.language==='en'?'Chapter ':'الفصل '}${next}"></label>
      <p class="reference-note">This chapter will be added only to this book. You can start writing immediately.</p>
      <button class="primary" type="submit">Create chapter</button>
    </form>`);
    const form=$('#chronicles-create-chapter');
    form.onsubmit=async event=>{
      event.preventDefault();
      const f=new FormData(form),b=form.querySelector('button[type=submit]');b.disabled=true;
      try{
        const number=Number(f.get('number')),title=String(f.get('title')||'').trim();
        if(!Number.isInteger(number)||number<1||number>999||!title)throw Error('Check the chapter number and title.');
        if(selectedPart&&partFor(number)?.id!==selectedPart.id)throw Error('The chapter number is outside the selected part.');
        const rows=await api('chronicles_book_entries',{
          method:'POST',headers:{Prefer:'return=representation'},
          body:JSON.stringify({book_id:book.id,kind:'chapter',chapter_number:number,title,body:'',updated_by:getWriter()})
        });
        if(!rows?.[0]?.id)throw Error('Could not create the chapter.');
        $('#modal').close();
        await navigate(link(book.id)+'&chapter='+number);
        if(active?.id===rows[0].id)beginEdit();
      }catch(err){say(err.message,true)}finally{b.disabled=false}
    };
  }

  function renderEntry(){
    if(!active)return;
    const c=active,rules=c.kind==='rules';selectedPart=rules?null:partFor(c.chapter_number);const list=selectedPart?partChapters(selectedPart):chapterList();
    const selected=rules?'Book Rules':'Chapter '+c.chapter_number;
    $('#main').innerHTML=`<nav class="crumb"><strong dir="auto">${esc(book.title)}</strong></nav><p class="collection-caption">${book.language==='ar'?'Arabic Original':'English Original'}</p><div class="workspace chronicles-workspace">
      <aside class="sidebar" dir="${book.language==='en'?'ltr':'rtl'}">
        <h2>${esc(book.title)}</h2>
        <div class="chapter-list">
          <a class="chapter-link ${rules?'active':''}" href="${link(book.id)}&rules=1">Book Rules</a>
          ${list.map(x=>`<a class="chapter-link ${x.id===c.id?'active':''}" href="${entryLink(x)}">${x.chapter_number} · ${esc(x.title)}</a>`).join('')}
        </div>
        <a class="reference-link" href="${link(book.id)}">All chapters</a>
      </aside>
      <section class="editor-area" dir="${book.language==='en'?'ltr':'rtl'}">
        ${rules?'':partsUI()}
        ${rules?'<p class="reference-note">Book Rules</p>':`<div class="chapter-picker" dir="ltr"><button id="extra-prev" aria-label="Previous chapter" ${list.indexOf(c)<=0?'disabled':''}>‹</button><select id="extra-chapter-select" aria-label="Choose chapter" dir="${book.language==='ar'?'rtl':'ltr'}">${list.map(x=>`<option value="${x.chapter_number}" ${x.id===c.id?'selected':''}>${String(x.chapter_number).padStart(2,'0')} · ${esc(x.title)}</option>`).join('')}</select><button id="extra-next" aria-label="Next chapter" ${list.indexOf(c)>=list.length-1?'disabled':''}>›</button></div>`}
        <div class="toolbar" dir="ltr">
          <button id="chronicles-edit">Edit</button>
          <button id="chronicles-save" class="primary" disabled>Save</button>
          <button id="chronicles-cancel" hidden>Cancel</button>
          <span class="protected" id="chronicles-entry-status">Protected</span>
          <button id="chronicles-copy">Copy</button>
          <button id="chronicles-history">History</button>
          <button id="chronicles-print">Print</button>
          ${rules?'':'<button id="extra-export">PDF / HTML</button><button id="extra-print-all">Print all</button><button id="extra-add-chapter">+ New Chapter</button>'}
          <button id="extra-smaller" aria-label="Smaller text">A−</button><button id="extra-larger" aria-label="Larger text">A+</button>
        </div>
        <div id="chronicles-save-warning"></div>
        
        ${selectedPart?`<p class="chapter-part">${esc(partName(selectedPart))}</p>`:''}
        <h1 class="chapter-title" id="chronicles-reading-title" dir="auto">${rules?'':String(c.chapter_number).padStart(2,'0')+' · '}${esc(c.title)}</h1>
        <input id="chronicles-entry-title" class="chapter-title-input" maxlength="200" dir="auto" hidden>
        <div class="chapter-word-count" dir="ltr">${clean(c.body).replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(Boolean).length} words</div><div class="save-meta" dir="ltr">${book.id===OUTSIDE_TIME_BOOK&&c.revision===1?'GPT draft · _zkalam4 · Not approved<br>':''}Revision ${c.revision} · <span class="${writerLabel(c)}">${esc(c.updated_by)}</span> · ${date(c.updated_at)}</div>
        ${!c.body.trim()&&!rules?'<p class="notice">This chapter is empty. Press Edit to begin.</p>':''}
        <article id="chronicles-entry-body" class="prose" lang="${book.language}" dir="${book.language==='en'?'ltr':'rtl'}" contenteditable="false">${clean(c.body)}</article>
        <details class="notes"><summary>Writing notes <span id="chronicles-note-count"></span></summary>
          <div id="chronicles-notes"></div>
          <textarea id="chronicles-note-body" rows="3" dir="auto" placeholder="A note or idea to revisit…"></textarea>
          <button class="primary" id="chronicles-add-note">Add note</button>
        </details>
      </section></div><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    $('#chronicles-edit').onclick=()=>beginEdit();
    $('#chronicles-save').onclick=save;
    $('#chronicles-cancel').onclick=cancel;
    $('#chronicles-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#chronicles-reading-title').textContent+'\n\n'+$('#chronicles-entry-body').innerText);say('Text copied.')}catch{say('Select the text and copy it manually.',true)}};
    $('#chronicles-history').onclick=()=>showHistory().catch(e=>say(e.message,true));
    $('#chronicles-print').onclick=()=>window.print();
    let readingSize=Number(storage.get('chronicles-size'))||17;
    const size=()=>{$('#chronicles-entry-body').style.fontSize=readingSize+'px';storage.set?.('chronicles-size',String(readingSize));};size();
    $('#extra-smaller').onclick=()=>{readingSize=Math.max(16,readingSize-1);size()};$('#extra-larger').onclick=()=>{readingSize=Math.min(30,readingSize+1);size()};
    if(!rules){
      bindParts();
      $('#extra-chapter-select').onchange=e=>navigate(link(book.id)+'&chapter='+e.target.value);
      $('#extra-prev').onclick=()=>{const prev=list[list.indexOf(c)-1];if(prev)navigate(entryLink(prev))};
      $('#extra-next').onclick=()=>{const next=list[list.indexOf(c)+1];if(next)navigate(entryLink(next))};
      $('#extra-export').onclick=()=>showExport(c);$('#extra-add-chapter').onclick=showCreateChapter;
      $('#extra-print-all').onclick=()=>printEntries(chapterList());
    }

    $('#chronicles-add-note').onclick=addNote;
    const saved=storage.get(draftKey(c.id));let d;
    try{d=saved?JSON.parse(saved):null}catch{}
    if(d&&d.title!==undefined){
      $('#chronicles-save-warning').innerHTML='<div class="notice">An unsaved draft is available on this device. <button id="chronicles-recover">Recover draft</button><button id="chronicles-discard">Discard draft</button></div>';
      $('#chronicles-recover').onclick=()=>{beginEdit(d);if(d.revision!==c.revision)say('The saved version changed after this draft. Review it before saving.',true)};
      $('#chronicles-discard').onclick=()=>{if(confirm('Discard this local draft?')){storage.remove(draftKey(c.id));$('#chronicles-save-warning').innerHTML=''}};
    }
    loadNotes(c.id).catch(e=>say(e.message,true));workflow.mount({...c,language:book.language},'extra',book.title,()=>editing);
    const partManagement=$('.part-management'),reviewDetails=$('.editor-area .reading-details');if(partManagement&&reviewDetails)reviewDetails.append(partManagement);
  }
  function exportHTML(rows){return '<!doctype html><html lang="'+book.language+'" dir="'+(book.language==='ar'?'rtl':'ltr')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(book.title)+'</title><style>body{max-width:850px;margin:30px auto;padding:20px;font:20px/1.9 Georgia,serif}article{break-before:page}p{margin:0 0 .6em}small{font-size:13px}</style><h1>'+esc(book.title)+'</h1>'+rows.map(c=>'<article><h2>'+c.chapter_number+' · '+esc(c.title)+'</h2><small>Revision '+c.revision+' · '+esc(c.updated_by)+' · '+esc(c.updated_at)+'</small>'+clean(c.body)+'</article>').join('')+'</html>';}
  function printEntries(rows){const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';frame.title='Print book';frame.srcdoc=exportHTML(rows);frame.onload=()=>{frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print()};document.body.append(frame);}
  function showExport(c){
    modal('PDF / HTML',`<form id="extra-export-form"><label>Format<select name="format"><option value="html">HTML</option><option value="pdf">PDF</option></select></label><label>Chapters<select name="scope"><option value="current">Current chapter</option><option value="all">All chapters</option></select></label><button type="submit">Prepare file</button><p id="extra-export-status" role="status"></p></form>`);
    $('#extra-export-form').onsubmit=async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;const report=t=>$('#extra-export-status').textContent=t;try{const latest=await api('chronicles_book_entries?book_id=eq.'+book.id+'&kind=eq.chapter&select=*&order=chapter_number.asc');const rows=(form.elements.scope.value==='all'?latest:latest.filter(x=>x.id===c.id)).map(x=>({...x,language:book.language}));const format=form.elements.format.value;const blob=format==='pdf'?await buildPDF(rows,{cover:false,colors:true,language:book.language,title:book.title},{esc,clean,onProgress:report,signal:new AbortController().signal}):new Blob([exportHTML(rows)],{type:'text/html;charset=utf-8'});const url=downloadBlob(blob,book.title+'.'+format);report('File ready');setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(err){report(err.message)}finally{button.disabled=false}};
  }
  function beginEdit(d){
    if(!active||editing)return;
    editing=true;
    $('#chronicles-edit').disabled=true;
    $('#chronicles-save').disabled=false;
    $('#chronicles-cancel').hidden=false;
    $('#chronicles-entry-status').textContent='Editing';
    $('#chronicles-reading-title').hidden=true;
    $('#chronicles-entry-title').hidden=false;
    $('#chronicles-entry-title').value=d?d.title:active.title;
    $('#chronicles-entry-body').contentEditable='true';
    if(d)$('#chronicles-entry-body').innerHTML=clean(d.body);
    $('#chronicles-entry-title').oninput=backup;
    trackAuthors($('#chronicles-entry-body'),getWriter,backup);
    $('#chronicles-save-warning').innerHTML='';
    $('#chronicles-entry-body').focus();
  }
  function cancel(){
    if(hasChanges()&&!confirm('Discard unsaved edits?'))return;
    editing=false;storage.remove(draftKey(active.id));renderEntry();
  }
  async function save(){
    if(!editing||busy||!active)return;
    const title=$('#chronicles-entry-title').value.trim(),body=clean($('#chronicles-entry-body').innerHTML),plain=$('#chronicles-entry-body').textContent.trim();
    if(!title||!plain){say('Enter a title and text before saving.',true);return}
    backup();busy=true;$('#chronicles-save').disabled=true;$('#chronicles-entry-body').contentEditable='false';
    try{
      const rows=await api('chronicles_book_entries?id=eq.'+active.id+'&revision=eq.'+active.revision,{
        method:'PATCH',headers:{Prefer:'return=representation'},
        body:JSON.stringify({title,body,updated_by:getWriter()})
      });
      if(!rows?.length){
        say('Someone saved a newer revision. Your local draft is safe. Review the latest version before saving.',true);
        $('#chronicles-save-warning').innerHTML='<div class="notice">A newer revision exists. Your draft is on this device. Copy it or open the latest version to compare.</div>';
        return;
      }
      active=rows[0];entries=entries.map(x=>x.id===active.id?active:x);
      storage.remove(draftKey(active.id));editing=false;renderEntry();
      say('Saved. The previous revision remains in History.');
    }catch(err){say('Save failed. Your draft remains on this device. '+err.message,true)}
    finally{busy=false;if(editing&&$('#chronicles-save')){$('#chronicles-save').disabled=false;$('#chronicles-entry-body').contentEditable='true'}}
  }
  async function showHistory(){
    if(!active)return;
    const id=active.id;
    modal('Revision history','<div class="loading">Loading revision history…</div>');
    const versions=await api('chronicles_book_versions?entry_id=eq.'+id+'&select=*&order=revision.desc&limit=1000');
    if(active?.id!==id)return;
    $('#modal-content').innerHTML='<p class="reference-note">History keeps each revision with its writer and time. Restoring an older revision opens a draft and preserves newer versions.</p>'
      +versions.map((v,i)=>`<div class="version">
        <strong>Revision ${v.revision} ${i===0?'· Current':''}</strong>
        <small class="${writerLabel({updated_by:v.saved_by})}">${esc(v.saved_by)} · ${date(v.saved_at)}</small>
        <button data-new-version="${i}">Read</button>
        ${i>0?`<button data-new-restore="${i}">Use as draft</button>`:''}
      </div>`).join('')+'<div id="chronicles-version-preview"></div>';
    document.querySelectorAll('[data-new-version]').forEach(b=>b.onclick=()=>{
      const v=versions[Number(b.dataset.newVersion)];
      $('#chronicles-version-preview').innerHTML=`<div class="preview" dir="${book.language==='en'?'ltr':'rtl'}"><h2 dir="auto">${esc(v.title)}</h2><article class="prose">${clean(v.body)}</article></div>`;
    });
    document.querySelectorAll('[data-new-restore]').forEach(b=>b.onclick=()=>{
      if(editing&&hasChanges()&&!confirm('Replace the current draft?'))return;
      if(editing){editing=false;renderEntry();}
      $('#modal').close();
      beginEdit(versions[Number(b.dataset.newRestore)]);
      backup();
      say('Restored as a draft. Save to create a new revision.');
    });
  }
  async function loadNotes(id){
    const notes=await api('chronicles_book_notes?entry_id=eq.'+id+'&select=*&order=created_at.asc');
    if(active?.id!==id||!$('#chronicles-notes'))return;
    $('#chronicles-note-count').textContent='('+notes.length+')';
    $('#chronicles-notes').innerHTML=notes.map(n=>`<div class="note ${n.author==='Ahmed'?'ahmed':'zee'}">
      <small><strong>${esc(n.author)}</strong> · ${date(n.created_at)}</small><p dir="auto">${esc(n.body)}</p>
    </div>`).join('');
  }
  async function addNote(){
    if(!active)return;
    const input=$('#chronicles-note-body'),body=input.value.trim(),id=active.id;
    if(!body)return;
    const button=$('#chronicles-add-note');button.disabled=true;
    try{
      await api('chronicles_book_notes',{method:'POST',body:JSON.stringify({entry_id:id,author:getWriter(),body})});
      if(active?.id===id){input.value='';await loadNotes(id);}
      say('Note added.');
    }catch(e){say(e.message,true)}finally{if($('#chronicles-add-note'))$('#chronicles-add-note').disabled=false}
  }
  return {load,isBookRoute,cards,relatedLinks,showCreateModal,render,hasChanges,allowLeave,leave,backup};
}

