// Independent Arabic book library. The original "شرخ زمني" records remain in chronicles_chapters.
export function createChroniclesLibrary({api,esc,clean,storage,say,getWriter,navigate,date,workflow,trackAuthors}) {
  const $=selector=>document.querySelector(selector);
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const draftKey=id=>'chronicles-book-draft:'+id;
  let books=[],book=null,entries=[],active=null,editing=false,busy=false;

  const chapterList=()=>entries.filter(e=>e.kind==='chapter').sort((a,b)=>a.chapter_number-b.chapter_number);
  const link=id=>'#book='+id;
  const entryLink=entry=>link(entry.book_id)+(entry.kind==='rules'?'&rules=1':'&chapter='+entry.chapter_number);
  const writerLabel=e=>e.updated_by==='Ahmed'?'author-ahmed':e.updated_by==='Guest'?'author-guest':'author-benji';

  async function load(){books=await api('chronicles_books?select=*&order=created_at.asc');}
  function isBookRoute(params){return params.has('book');}
  function cards(){
    if(!books.length)return '';
    return '<section class="chronicles-extra-books" aria-label="Additional books"><h2>Our new books</h2><div class="chronicles-books-grid">'
      +books.map(b=>`<a class="chronicles-new-card" href="#book=${esc(b.id)}">
        <div class="chronicles-new-cover">
          <span class="chronicles-book-label">BENJI CHRONICLES · NEW BOOK</span>
          <strong dir="auto">${esc(b.title)}</strong>
          <small>${b.collaboration==='shared'?'Shared story':'Independent story'}</small>
        </div>
        <div class="chronicles-new-info"><strong dir="auto">${esc(b.title)}</strong>
          <p dir="auto">${esc(b.description||'A new space for writing and adventures.')}</p>
          <small><span class="${b.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(b.primary_writer)}</span> · Arabic book</small>
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
  function showCreateModal(){
    const selected=getWriter()==='Ahmed'?'Ahmed':'Benji';
    modal('+ New Book',`<form id="chronicles-create-book" class="chronicles-book-form">
      <label>Book title<input name="title" maxlength="160" required dir="auto" placeholder="New story title"></label>
      <label>Primary writer<select name="writer" required><option value="Benji" ${selected==='Benji'?'selected':''}>Benji</option><option value="Ahmed" ${selected==='Ahmed'?'selected':''}>Ahmed</option></select></label>
      <label>Book type<select name="collaboration"><option value="shared">Shared writing · Benji & Ahmed</option><option value="solo">Independent book</option></select></label>
      <label>Book idea (optional)<textarea name="description" rows="3" maxlength="2000" dir="auto"></textarea></label>
      <p class="reference-note">New books here are in Arabic. Each has its own book rules, chapters and revision history alongside the global rules.</p>
      <button class="primary" type="submit">+ Create book</button>
    </form>`);
    const form=$('#chronicles-create-book');
    form.onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(form),button=form.querySelector('button[type=submit]');
      button.disabled=true;
      try{
        const created=await api('rpc/chronicles_create_book',{
          method:'POST',headers:{Prefer:'return=representation'},
          body:JSON.stringify({
            p_title:String(f.get('title')||'').trim(),
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
    if(!book)throw Error('Book not found.');
    const loaded=await api('chronicles_book_entries?book_id=eq.'+id+'&select=*&order=chapter_number.asc.nullslast');
    entries=loaded;
    const rules=params.get('rules')==='1';
    const no=Number(params.get('chapter'));
    if(rules||params.has('chapter')){
      active=rules?entries.find(e=>e.kind==='rules'):entries.find(e=>e.kind==='chapter'&&e.chapter_number===no);
      if(!active)throw Error('Page not found.');
      editing=false;
      renderEntry();
    }else{active=null;editing=false;renderOverview();}
  }

  function header(){
    return `<nav class="crumb" dir="rtl"><a href="#">Library</a><span>/</span><a href="${link(book.id)}" dir="auto">${esc(book.title)}</a></nav>`;
  }
  function renderOverview(){
    const list=chapterList();
    $('#main').innerHTML=header()+`<section class="reference-page chronicles-book-home" dir="rtl">
      <div class="eyebrow">BENJI CHRONICLES · Independent book</div>
      <h1 dir="auto">${esc(book.title)}</h1>
      <p class="reference-intro" dir="auto">${esc(book.description||'A space to write a new story.')}</p>
      <p class="reference-note">Primary writer: <strong class="${book.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(book.primary_writer)}</strong>
         · ${book.collaboration==='shared'?'Shared writing workspace':'Independent book'} · Arabic</p>
      <div class="chronicles-book-actions">
        <button id="chronicles-add-chapter" class="primary">+ New chapter</button>
        <a href="${link(book.id)}&rules=1" class="reference-link">Book Rules</a>
        <a href="#writing-rules" class="reference-link">Global Rules · _zkalam4</a>
      </div>
      <h2>Chapters <small>(${list.length})</small></h2>
      ${list.length?'<div class="chronicles-chapter-cards">'+list.map(c=>`<a class="chronicles-chapter-card" href="${entryLink(c)}">
         <strong>Chapter ${c.chapter_number} · <span dir="auto">${esc(c.title)}</span></strong>
         <small>Revision ${c.revision} · ${esc(c.updated_by)} · ${date(c.updated_at)}</small>
       </a>`).join('')+'</div>':'<div class="guide-card"><p>No chapters yet. Use New chapter to begin.</p></div>'}
    </section><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    $('#chronicles-add-chapter').onclick=showCreateChapter;
  }
  function showCreateChapter(){
    const next=Math.max(0,...chapterList().map(c=>c.chapter_number))+1;
    modal('+ New chapter',`<form id="chronicles-create-chapter" class="chronicles-book-form">
      <label>Chapter number<input name="number" type="number" min="1" max="999" value="${next}" required></label>
      <label>Chapter title<input name="title" required maxlength="200" dir="auto" value="الفصل ${next}"></label>
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
    const c=active,list=chapterList(),rules=c.kind==='rules';
    const selected=rules?'Book Rules':'Chapter '+c.chapter_number;
    $('#main').innerHTML=header()+`<div class="workspace chronicles-workspace">
      <aside class="sidebar" dir="rtl">
        <h2>${esc(book.title)}</h2>
        <div class="chapter-list">
          <a class="chapter-link ${rules?'active':''}" href="${link(book.id)}&rules=1">Book Rules</a>
          ${list.map(x=>`<a class="chapter-link ${x.id===c.id?'active':''}" href="${entryLink(x)}">${x.chapter_number} · ${esc(x.title)}</a>`).join('')}
        </div>
        <a class="reference-link" href="${link(book.id)}">All chapters</a>
      </aside>
      <section class="editor-area" dir="rtl">
        <div class="eyebrow">${esc(selected)} · ${rules?'Book Rules':'Chapter'}</div>
        <div class="chronicles-book-actions">
          <a class="reference-link" href="${link(book.id)}">Book contents</a>
          <a class="reference-link" href="#writing-rules">Global Rules</a>
          <a class="reference-link" href="${link(book.id)}&rules=1">Book Rules</a>
        </div>
        ${rules?'<p class="reference-note">Global rules are shared. Book rules apply only to this book and never rewrite saved chapters automatically.</p>':''}
        <div class="toolbar">
          <button id="chronicles-edit">Edit</button>
          <button id="chronicles-save" class="primary" disabled>Save</button>
          <button id="chronicles-cancel" hidden>Cancel</button>
          <span class="protected" id="chronicles-entry-status">Protected</span>
          <button id="chronicles-copy">Copy</button>
          <button id="chronicles-history">History</button>
          <button id="chronicles-print">Print</button>
        </div>
        <div id="chronicles-save-warning"></div>
        <div class="eyebrow">${esc(book.title)} · ${esc(selected)}</div>
        <h1 class="chapter-title" id="chronicles-reading-title" dir="auto">${rules?'':String(c.chapter_number).padStart(2,'0')+' · '}${esc(c.title)}</h1>
        <input id="chronicles-entry-title" class="chapter-title-input" maxlength="200" dir="auto" hidden>
        <div class="save-meta" dir="ltr">Revision ${c.revision} · <span class="${writerLabel(c)}">${esc(c.updated_by)}</span> · ${date(c.updated_at)}</div>
        ${!c.body.trim()&&!rules?'<p class="notice">This chapter is empty. Press Edit to begin.</p>':''}
        <article id="chronicles-entry-body" class="prose" lang="ar" dir="rtl" contenteditable="false">${clean(c.body)}</article>
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
    $('#chronicles-add-note').onclick=addNote;
    const saved=storage.get(draftKey(c.id));let d;
    try{d=saved?JSON.parse(saved):null}catch{}
    if(d&&d.title!==undefined){
      $('#chronicles-save-warning').innerHTML='<div class="notice">An unsaved draft is available on this device. <button id="chronicles-recover">Recover draft</button><button id="chronicles-discard">Discard draft</button></div>';
      $('#chronicles-recover').onclick=()=>{beginEdit(d);if(d.revision!==c.revision)say('The saved version changed after this draft. Review it before saving.',true)};
      $('#chronicles-discard').onclick=()=>{if(confirm('Discard this local draft?')){storage.remove(draftKey(c.id));$('#chronicles-save-warning').innerHTML=''}};
    }
    loadNotes(c.id).catch(e=>say(e.message,true));workflow.mount({...c,language:'ar'},'extra',book.title,()=>editing);
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
      $('#chronicles-version-preview').innerHTML=`<div class="preview" dir="rtl"><h2 dir="auto">${esc(v.title)}</h2><article class="prose">${clean(v.body)}</article></div>`;
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
  return {load,isBookRoute,cards,showCreateModal,render,hasChanges,allowLeave,leave,backup};
}

