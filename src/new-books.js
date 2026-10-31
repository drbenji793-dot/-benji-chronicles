import {countWords} from './current-story.js';
import {IBN_BOOK} from './current-story.js';
import {chapterCards} from './chapter-index.js';
import {renderBookMedia} from './book-media.js';
import {storyContents} from './contents.js';
import {renderCritique} from './critique.js';
import {planningStory} from './collection-workspace.js';
import {renderDSL} from './dsl.js';
import {OUTSIDE_TIME_BOOK} from './outside-time.js';
import {buildPDF,downloadBlob} from './export-book.js';
// Independent language libraries. The original "شرخ زمني" records remain in chronicles_chapters.
export function createChroniclesLibrary({api,esc,clean,storage,say,getWriter,navigate,date,workflow,trackAuthors}) {
  const REVIEW_BOOK='c911584d-bd5b-42fe-b41c-a2a456c64d41';
  let planningData=null;
  const version=n=>'v'+(Number(n||1)+100);
  const writingLabel=m=>!m?.method||m.method==='unknown'?'Writing method not recorded':m.method==='Manual'?'Manual · no style guide':m.method+' · '+(m.style_version||'style version not recorded')+(m.variant?' · '+m.variant:'');
  function writingInputs(){
    const current=active?.writing_meta||{};
    const method=$('#chapter-writing-method')?.value||current.method||'unknown';
    return {...current,method,style_version:method==='Manual'?'':($('#chapter-style-version')?.value||'').trim(),variant:method==='Manual'?'':($('#chapter-style-variant')?.value||'')};
  }
  function fillWriting(m={}){
    $('#chapter-writing-method').value=m.method||'unknown';$('#chapter-style-version').value=m.style_version||'';$('#chapter-style-variant').value=m.variant||'';
  }
  const $=selector=>document.querySelector(selector);
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const draftKey=id=>'chronicles-book-draft:'+id;
  let books=[],book=null,entries=[],active=null,editing=false,busy=false,parts=[],selectedPart=null;

  const chapterList=()=>entries.filter(e=>e.kind==='chapter').sort((a,b)=>a.chapter_number-b.chapter_number);
  const link=id=>'#book='+id+(id===IBN_BOOK&&new URLSearchParams(location.hash.slice(1)).get('archive')==='1'?'&archive=1':'');
  const entryLink=entry=>link(entry.book_id)+(entry.kind==='rules'?'&rules=1':'&chapter='+entry.chapter_number);
  const writerLabel=e=>e.updated_by==='Ahmed'?'author-ahmed':e.updated_by==='Guest'?'author-guest':'author-benji';

  const illustratedBook='824a4e1d-dc55-5876-88e4-4da32082c55b';
  let illustratedCount=0;
  const illustratedCover=b=>`<div class="story-cover-art bellwether-cover" role="img" aria-label="${esc(b.title)} cover: a passenger train at a snowy Midwest station at night"><div class="cover-lettering"><h2>${esc(b.title)}</h2><small>AMERICAN ADAPTATION · 1951</small></div><div class="cover-credit">Benji &amp; Almostasherq</div></div>`;
  async function load(){books=(await api('chronicles_books?select=*&order=created_at.asc')).filter(b=>!planningStory(b.id));if(books.some(b=>b.id===illustratedBook))illustratedCount=(await api('chronicles_book_entries?book_id=eq.'+illustratedBook+'&kind=eq.chapter&select=id')).length;}
  function illustratedCards(language){return books.filter(b=>b.language===language&&b.id===illustratedBook).map(b=>`<a class="story-card collection-story" href="${link(b.id)}">${illustratedCover(b)}<div class="card-body"><h2>${esc(b.title)}</h2><small>${illustratedCount} chapters · English 2</small><span>Open story</span></div></a>`).join('');}
  function isBookRoute(params){return params.has('book');}
  // Book Cover T001: one full portrait cover, sharing the Lost Files dimensions.
  const bookArtwork={
    '43d580d7-a4bd-4d19-bd1c-0cad57b2e105':{image:'/artwork/angels-and-robots-cover-v1.webp',subtitle:'ANGELS & ROBOTS',title:'ملائكة وروبوتات',className:'angels-robots-cover'},
    '66739f5d-2bac-4d75-a4fd-6df93da8ac7e':{image:'/artwork/ibn-al-jabal-cover-v1.webp',subtitle:'IBN AL JABAL'}
  };
  function fullBookCover(b,extraClass=''){
    const art=bookArtwork[b.id===REVIEW_BOOK?IBN_BOOK:b.id];
    return `<a class="collection-cover chronicles-new-card full-book-cover ${art?.className||''} ${extraClass}" href="${link(b.id)}" aria-label="Open ${esc(b.title)}" ${art?`style="background-image:url('${art.image}')"`:''}>
      <div class="collection-cover-title"><h2 dir="auto">${esc(art?.title||b.title)}</h2><p>${esc(art?.subtitle||'BENJI CHRONICLES')}</p></div>
      <div class="collection-cover-credit">Benji &amp; Almostasherq<small>${b.language==='en'?'English':'Arabic'} novel</small></div>
    </a>`;
  }
  function cards(language='ar',bookshelf=false){
    if(!books.some(b=>b.language===language&&b.id!==OUTSIDE_TIME_BOOK&&b.id!==illustratedBook&&b.id!==IBN_BOOK))return '';
    if(bookshelf)return books.filter(b=>b.language===language&&b.id!==OUTSIDE_TIME_BOOK&&b.id!==illustratedBook&&b.id!==IBN_BOOK).map(b=>fullBookCover(b)).join('');
    return '<section class="chronicles-extra-books" aria-label="Additional books"><h2>Books & Stories</h2><div class="chronicles-books-grid">'
      +books.filter(b=>b.language===language&&b.id!==OUTSIDE_TIME_BOOK&&b.id!==illustratedBook&&b.id!==IBN_BOOK).map(b=>fullBookCover(b)).join('')+'</div></section>';
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
        say('Book created. Manage its rules in HQ.');
        await navigate(link(b.id));
      }catch(err){say(err.message,true)}finally{button.disabled=false}
    };
  }

  function hasChanges(){
    if(!editing||!active||!$('#chronicles-entry-title')||!$('#chronicles-entry-body'))return false;
    return $('#chronicles-entry-title').value!==active.title
      ||clean($('#chronicles-entry-body').innerHTML)!==clean(active.body)
      ||JSON.stringify(writingInputs())!==JSON.stringify({...active.writing_meta,method:active.writing_meta?.method||'unknown',style_version:active.writing_meta?.style_version||'',variant:active.writing_meta?.variant||''});
  }
  function backup(){
    if(!editing||!active||!$('#chronicles-entry-title')||!$('#chronicles-entry-body'))return;
    storage.set(draftKey(active.id),JSON.stringify({
      title:$('#chronicles-entry-title').value,
      body:clean($('#chronicles-entry-body').innerHTML),
      writing_meta:writingInputs(),revision:active.revision,
      saved_at:new Date().toISOString()
    }));
    const status=$('#chronicles-entry-status');
    if(status)status.textContent='محفوظ على الجهاز فقط';
    const counter=$('.chapter-word-count');if(counter)counter.textContent=countWords($('#chronicles-entry-body').innerText)+' words';
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
    if(id===IBN_BOOK&&params.get('archive')!=='1'){
      const view=params.get('view');
      if(!view||['chapters','originals','contents','cover'].includes(view)||params.get('storytab')==='manuscript'){
        const draft=params.get('draftchapter'),number=draft?.match(/ch-(\d+)$/)?.[1];
        const target='#book='+REVIEW_BOOK+(number?'&chapter='+number:view==='contents'?'&view=contents':view==='cover'?'&view=cover':'');history.replaceState(history.state,'',location.pathname+location.search+target);await render(new URLSearchParams(target.slice(1)));return;
      }
    }
    if(id===REVIEW_BOOK&&params.get('view')==='chapters'){const target='#book='+REVIEW_BOOK;history.replaceState(history.state,'',location.pathname+location.search+target);await render(new URLSearchParams(target.slice(1)));return;}
    if(!uuid.test(id))throw Error('Invalid book link.');
    book=books.find(b=>b.id===id);
    if(!book){await load();book=books.find(b=>b.id===id);}
    if(!book)throw Error('Book not found.');const footerRules=document.querySelector('.footer-rules [data-book-rules]');if(footerRules){footerRules.hidden=false;footerRules.textContent='Book Rules';footerRules.href=link(book.id)+'&rules=1';}
    const loaded=await api('chronicles_book_entries?book_id=eq.'+id+'&select=*&order=chapter_number.asc.nullslast');
    entries=loaded;
    const missing=entries.filter(e=>!e.writing_meta?.method);
    if(missing.length){
      const matches=missing.map(e=>'and(entry_id.eq.'+e.id+',revision.eq.'+e.revision+')').join(',');
      const meta=await api('chronicles_book_versions?select=entry_id,revision,writing_meta&or=('+matches+')');
      entries=entries.map(e=>({...e,writing_meta:e.writing_meta?.method?e.writing_meta:meta.find(v=>v.entry_id===e.id&&v.revision===e.revision)?.writing_meta||{}}));
    }
    if(id===REVIEW_BOOK){const branches=await api('chronicles_dsl_branches?book_id=eq.'+IBN_BOOK+'&archived=eq.false&select=data&order=updated_at.desc&limit=1');planningData=branches[0]?.data;const statuses=await api('chronicles_workflow?source_id=in.('+entries.map(e=>e.id).join(',')+')&select=*');entries=entries.map(e=>{const w=statuses.find(w=>w.source_id===e.id);return {...e,wordCount:countWords(clean(e.body).replace(/<[^>]*>/g,' ')),statusLabel:w?.transferred_revision===e.revision?'نُقلت إلى Ink':w?.approved_revision===e.revision?'معتمد ولم يُنقل':w?.transferred_revision?'تعديلات لم تُعتمد':'مسودة للمراجعة'};});}
    parts=await api("chronicles_book_parts?book_id=eq."+id+"&select=*&order=start_chapter.asc");
    selectedPart=parts.find(p=>p.id===params.get("part"))||null;
    const nav=document.querySelector('.book-navigation');
    if(nav){
      const base=link(book.id),view=params.get('view');
      const selected=params.has('chapter')?'chapters':params.get('dsltool')==='blend'?'blender':params.get('dslview')==='characters'?'characters':view||(params.has('rules')?'rules':'chapters');
      const tabs=[['brief','Story Brief','&view=brief'],['chapters','Chapters',book.id===IBN_BOOK?'&view=chapters':''],['notes','Notes','&view=dsl&dslview=workbook'],['critique','Review','&view=critique'],['export','Export','&view=export']];
      nav.hidden=false;nav.dir='ltr';
      nav.innerHTML='<div class="ink-tabs">'+tabs.filter(([id])=>!['dsl','blender','workbook'].includes(id)).map(([id,label,suffix])=>'<a href="'+(book.id===IBN_BOOK&&id==='chapters'?'#book='+REVIEW_BOOK:base+suffix)+'"'+(selected===id?' class="selected" aria-current="page"':'')+'>'+label+'</a>').join('')+'</div><div class="story-aux-nav"><a href="'+base+'&view=cover">'+esc(book.title)+'</a><a href="#library&lang='+book.language+'">'+(book.language==='en'?'English':'Arabic')+' Library</a></div>';
      if(book.id===IBN_BOOK||book.id===REVIEW_BOOK){
       nav.classList.add('ibn-navigation');
       const back=document.createElement('nav');back.className='current-back';back.innerHTML='<a href="#library&lang='+book.language+'">'+(book.language==='en'?'English':'Arabic')+' Library</a><a href="'+base+'&view=cover">'+esc(book.title)+'</a>';
       nav.querySelector('.story-aux-nav')?.remove();nav.prepend(back);
       const entrance=document.createElement('a');entrance.className='current-story-entrance';entrance.href='#book='+REVIEW_BOOK;entrance.innerHTML='<strong>الفصول</strong><small>النص الكامل · التعديل · المراجعة والاعتماد</small>';entrance.setAttribute('aria-current',view==='storyline'?'page':'false');if(view==='chapters'||(!view&&book.id===REVIEW_BOOK))nav.append(entrance);
      }else nav.classList.remove('ibn-navigation');
    }
    if(['export','brief'].includes(params.get('view'))){active=null;editing=false;await renderExportPage(params.get('view')==='brief');return;}
    if(params.get('view')==='cover'){active=null;editing=false;renderOverview(true);return;}
    if(params.get('view')==='contents'){active=null;editing=false;$('#main').innerHTML=storyContents(book.title,chapterList(),null,{root:link(book.id),language:book.language,parts,rulesUrl:link(book.id)+'&rules=1',notesUrl:link(book.id)+'&view=dsl',notesLabel:'Planning Notes'});return;}
    if(params.get('view')==='critique'){active=null;editing=false;await renderCritique($('#main'),api,{bookId:book.id,title:book.title,sourcePath:'chronicles_book_entries?book_id=eq.'+book.id+'&kind=eq.chapter&select=id,chapter_number,title,body,revision&order=chapter_number.asc'});return;}
    if(params.get('view')==='references'){const branches=await api('chronicles_dsl_branches?book_id=eq.'+book.id+'&select=data&order=updated_at.asc');$('#main').innerHTML=header()+'<section class="reference-page"><h1>References</h1><h2>Images &amp; Media</h2><p class="reference-note">Artwork and media developed for this book, with original sources and earlier versions preserved.</p>'+renderBookMedia(book.id,bookArtwork[book.id],esc)+'<h2>Research &amp; Notes</h2><p style="white-space:pre-wrap">'+esc(branches[0]?.data?.references||'Research notes are not recorded yet.')+'</p></section>';return;}
    if(['dsl','storyline','chapters'].includes(params.get('view'))){active=null;editing=false;await renderDSL($('#main'),api,book.id===REVIEW_BOOK?IBN_BOOK:book.id,params.get('view'));return;}
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
  function partOrdinal(p){const n=parts.indexOf(p);return book.language==='ar'?'الجزء '+(['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'][n]||(n+1).toLocaleString('ar-EG')):'Part '+(n+1);}
  function partName(p){return partOrdinal(p)+' · '+p.title;}
  function partStyles(){return `<style>
.book-part-list{display:grid;gap:8px;margin:20px 0;max-width:480px;width:100%;margin-inline:auto}
.book-part-heading,.book-part-row{display:flex;align-items:center;gap:10px;min-width:0}
.book-part-heading{justify-content:space-between;font-size:13px;color:var(--muted)}
.book-part-row>a{display:flex;align-items:center;gap:12px;flex:1;min-width:0;min-height:48px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;text-decoration:none;color:var(--ink);background:var(--panel);box-sizing:border-box}
.book-part-row small{font-size:11px;color:var(--muted);white-space:nowrap}.book-part-row strong{font-size:15px;line-height:1.5;font-weight:600;overflow-wrap:anywhere}
#main .part-circle{display:inline-flex;align-items:center;justify-content:center;flex:0 0 44px;width:44px;height:44px;min-height:44px;padding:0;border-radius:8px;font:12px/1 system-ui;box-sizing:border-box;margin:0}
#main .part-add{font-size:20px;font-weight:400}
#main .compact-chapter-picker{display:block;margin:0 0 12px;padding:0;border:0}
#main .chapter-step-controls{display:flex;justify-content:center;gap:6px;margin:6px 0 0}
#main .chapter-step-controls button{width:44px;height:32px;min-height:32px;padding:0;font-size:18px;border-radius:8px}
#main .compact-book-parts{display:block;padding:8px 0;margin:0 0 10px}
.book-part-picker{display:flex;align-items:center;gap:6px;width:100%;min-width:0}
#main .book-part-picker select{width:0;min-width:0;flex:1;height:44px;min-height:44px;margin:0;padding:6px 8px;font-size:14px;border-radius:12px}
.book-part-picker + .part-management:empty{display:none}
@media(max-width:360px){.book-part-row>a{gap:8px;padding:8px}.book-part-row strong{font-size:14px}#main .book-part-picker select{font-size:12px}}
#main .toolbar,#main .chapter-quick-links{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px 0;margin:8px 0}
#main .toolbar button,#main .chapter-quick-links a{flex:0 0 auto;width:auto;min-height:34px;padding:6px 12px;font-size:12px;grid-column:auto}
#main .toolbar .protected{font-size:10px;width:auto;flex:0 0 auto}
#main .chronicles-chapter-card small{display:none}
#main .book-part-list{margin:12px auto;gap:6px}#main .book-part-row>a{min-height:40px;padding:6px 10px}
#main .book-technical{font-size:12px;margin-top:24px;color:var(--muted)}
@media print{.book-part-list{display:none}}
</style>`;}
  function partsUI(){return `${partStyles()}<div class="book-parts compact-book-parts" dir="${book.language==='ar'?'rtl':'ltr'}"><div class="book-part-picker"><select id="book-part-select" aria-label="Part"><option value="">${book.language==='ar'?'اختر الجزء':'Choose part'}</option>${parts.map(p=>`<option value="${p.id}" ${selectedPart?.id===p.id?'selected':''}>${esc(partName(p))}</option>`).join('')}</select><button class="part-circle" lang="en" dir="ltr" aria-label="Edit part name" id="rename-part" ${selectedPart?'':'disabled'}>Edit</button><button class="part-circle part-add" id="add-part" aria-label="Add part" title="Add part">＋</button></div><div class="part-management">${selectedPart?`<p class="part-count" lang="en" dir="ltr">${partChapters(selectedPart).length} written chapters${selectedPart.planned_chapters?' · '+selectedPart.planned_chapters+' planned chapters':''}</p><details><summary lang="en" dir="ltr">Part revision details</summary><p>${esc(selectedPart.updated_by)} · ${date(selectedPart.updated_at)} · Revision ${selectedPart.revision}</p>${[...(selectedPart.history||[])].reverse().map(h=>`<p>${esc(h.title)} · ${esc(h.updated_by)} · ${date(h.updated_at)} · Revision ${h.revision}</p>`).join('')}</details>`:''}</div></div>`;}
  function bindParts(){
    $('#book-part-select').onchange=async e=>{const p=parts.find(x=>x.id===e.target.value);if(!p)return;const c=partChapters(p)[0];await navigate(c?entryLink(c):link(book.id)+'&part='+p.id);};
    $('#rename-part').onclick=()=>editPart(selectedPart);
    $('#add-part').onclick=()=>editPart(null);
  }
  function editPart(p){
    if(editing){say('Save or cancel chapter edits first.',true);return;}
    const next=Math.max(1,...parts.map(x=>x.start_chapter+(x.planned_chapters||1)),...chapterList().map(x=>x.chapter_number+1));
    modal(p?'Edit part':'New part',`<form id="part-form" dir="rtl"><label>Part title<input name="title" required maxlength="160" value="${esc(p?.title||'')}"></label>${p?'':`<label>First chapter number<input name="start" type="number" min="1" max="999" required value="${next}"></label><label>Planned chapter count (optional)<input name="count" type="number" min="1" max="999"></label>`}<button type="submit">Save</button><p id="part-error" role="alert"></p></form>`);
    $('#part-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;busy=true;try{
      const title=String(f.get('title')||'').trim();if(!title)throw Error('Enter a part title.');
      const payload={title,updated_by:getWriter()};if(!p){const start=Number(f.get('start'));if(!Number.isInteger(start)||start<1||start>999||parts.some(x=>x.start_chapter>=start))throw Error('The new part must start after the beginning of the last part.');Object.assign(payload,{book_id:book.id,start_chapter:start,planned_chapters:f.get('count')?Number(f.get('count')):null});}
      const rows=await api('chronicles_book_parts'+(p?'?id=eq.'+p.id+'&revision=eq.'+p.revision:''),{method:p?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
      if(!rows?.length)throw Error('This part changed on another device. Reopen the page before saving.');
      parts=p?parts.map(x=>x.id===p.id?rows[0]:x):[...parts,rows[0]].sort((a,b)=>a.start_chapter-b.start_chapter);selectedPart=rows[0];$('#modal').close();busy=false;
      if(p){if(active)renderEntry();else if(new URLSearchParams(location.hash.slice(1)).has('part'))renderPartHome();else renderOverview();}else await navigate(link(book.id)+'&part='+selectedPart.id);
      say('Part saved with the writer name and edit time.');
    }catch(err){$('#part-error').textContent=err.message;}finally{busy=false;btn.disabled=false;}};
  }
  function renderPartHome(){
    $('#main').innerHTML=header()+`<section class="reference-page" dir="rtl">${partsUI()}<h1>${esc(partName(selectedPart))}</h1><p>No chapters have been written in this part yet.</p><button id="part-new-chapter">＋ New chapter</button></section>`;
    bindParts();$('#part-new-chapter').onclick=showCreateChapter;
  }

  function header(){
    return `<nav class="crumb" style="position:relative"><strong dir="auto">${esc(book.title)}</strong><a href="${link(book.id)}" aria-label="${esc(book.title)}" style="position:absolute;inset:0"></a></nav>`;
  }
  function renderOverview(showCover=false){
    const list=chapterList();
    $('#main').innerHTML=header()+`<section class="reference-page chronicles-book-home" dir="${book.language==='en'?'ltr':'rtl'}">
      ${showCover?(book.id===illustratedBook?'<a class="bellwether-entrance" href="'+link(book.id)+'">'+illustratedCover(book)+'</a>':fullBookCover(book,'book-overview-cover')):''}
      <div class="eyebrow">BENJI CHRONICLES · ${book.id===illustratedBook?'American adaptation':'Independent book'}</div>
      <h1 dir="auto">${esc(book.title)}</h1>
      <p class="reference-intro" dir="auto">${esc(book.description||'A space to write a new story.')}</p>
      <p class="reference-note">Primary writer: <strong class="${book.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(book.primary_writer)}</strong>
         · ${book.collaboration==='shared'?'Shared writing workspace':'Independent book'} · ${book.language==='en'?'English':'Arabic'}</p>
      <div class="chronicles-book-actions">
        <button id="chronicles-add-chapter" class="primary">+ New chapter</button>

        <a href="${link(book.id)}&view=dsl&dslview=garden" class="reference-link">Garden of Eden</a>

      </div>
      ${partStyles()}<nav class="book-part-list" dir="${book.language==='ar'?'rtl':'ltr'}" aria-label="Book parts"><div class="book-part-heading"><span>${book.language==='ar'?'الأجزاء':'Parts'}</span><button type="button" class="part-circle part-add" id="overview-add-part" aria-label="Add part" title="Add part">＋</button></div>${parts.map(p=>`<div class="book-part-row"><a href="${partChapters(p)[0]?entryLink(partChapters(p)[0]):link(book.id)+'&part='+p.id}"><small>${esc(partOrdinal(p))}</small><strong>${esc(p.title)}</strong></a><button type="button" class="part-circle" lang="en" dir="ltr" data-edit-overview-part="${p.id}" aria-label="Edit ${esc(p.title)}">Edit</button></div>`).join('')}</nav><button id="related-book" ${book.id===REVIEW_BOOK?'hidden':''}>Related Story</button>${book.id===REVIEW_BOOK?'':relatedLinks(book.id)}${book.id===IBN_BOOK?`<section dir="rtl"><h2>الأرشيف</h2><p>${list.reduce((n,c)=>n+countWords(clean(c.body).replace(/<[^>]*>/g,' ')),0).toLocaleString('ar-EG')} كلمة في المخطوط الأصلي</p><a href="${link(book.id)}&view=chapters">افتح الفصول للتحرير</a><p>${list.map(c=>esc(c.title)+': '+countWords(clean(c.body).replace(/<[^>]*>/g,' ')).toLocaleString('ar-EG')+' كلمة').join(' · ')}</p></section>`:''}${parts.length?parts.map(p=>{const rows=partChapters(p);return rows.length?`<h2>${esc(partName(p))}</h2>`+chapterCards(rows,{esc,root:link(book.id),date,language:book.language}).replace(/<h2>.*?<\/h2>/,''):'';}).join(''):chapterCards(list,{esc,root:link(book.id),date,language:book.language})}<details class="book-technical"><summary lang="en">Technical details</summary><p dir="rtl">إجمالي النصوص: ${list.reduce((n,c)=>n+countWords(clean(c.body).replace(/<[^>]*>/g,' ')),0).toLocaleString('ar-EG')} كلمة</p>${list.map(c=>`<p>${esc(c.title)} · ${version(c.revision)} · ${esc(c.updated_by||'')} · ${date(c.updated_at)}</p>`).join('')}</details>${book.id===REVIEW_BOOK?`<details><summary>الأرشيف</summary><a href="#book=${IBN_BOOK}&archive=1&view=originals">المخطوط السابق المحفوظ</a></details>`:''}
    </section><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    $('#overview-add-part').onclick=()=>editPart(null);document.querySelectorAll('[data-edit-overview-part]').forEach(el=>el.onclick=()=>editPart(parts.find(p=>p.id===el.dataset.editOverviewPart)));
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
          body:JSON.stringify({book_id:book.id,kind:'chapter',chapter_number:number,title,body:'',writing_meta:{method:'Manual',style_version:'',variant:''},updated_by:getWriter()})
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
    $('#main').innerHTML=`<nav class="crumb" style="position:relative"><strong dir="auto">${esc(book.title)}</strong><a href="${book.id===IBN_BOOK?'#book='+REVIEW_BOOK:link(book.id)}" aria-label="${esc(book.title)} · الفصول" style="position:absolute;inset:0"></a></nav><p class="collection-caption">${book.id===REVIEW_BOOK?'الفصول · مسودات للمراجعة':book.language==='ar'?'Arabic Original':'English Original'}</p><div class="workspace chronicles-workspace">
      <aside class="sidebar" dir="${book.language==='en'?'ltr':'rtl'}">
        <h2>${esc(book.title)}</h2>
        <div class="chapter-list">

          ${list.map(x=>`<a class="chapter-link ${x.id===c.id?'active':''}" href="${entryLink(x)}">${x.chapter_number} · ${esc(x.title)}</a>`).join('')}
        </div>
        <a class="reference-link" href="${link(book.id)}">All chapters</a>
      </aside>
      <section class="editor-area" dir="${book.language==='en'?'ltr':'rtl'}">
        ${rules?'':partsUI()}
        ${rules?'<p class="reference-note">Book Rules</p>':`<div class="chapter-picker compact-chapter-picker"><div class="book-part-picker" dir="${book.language==='ar'?'rtl':'ltr'}"><select id="extra-chapter-select" aria-label="Choose chapter" dir="${book.language==='ar'?'rtl':'ltr'}">${list.map(x=>`<option value="${x.chapter_number}" ${x.id===c.id?'selected':''}>${String(x.chapter_number).padStart(2,'0')} · ${esc(x.title)}</option>`).join('')}</select><button id="edit-chapter-name" class="part-circle" lang="en" dir="ltr" aria-label="Edit chapter name">Edit</button><button id="picker-add-chapter" class="part-circle part-add" aria-label="Add chapter" title="Add chapter">＋</button></div><div class="chapter-step-controls" dir="ltr"><button id="extra-prev" aria-label="Previous chapter" ${list.indexOf(c)<=0?'disabled':''}>‹</button><button id="extra-next" aria-label="Next chapter" ${list.indexOf(c)>=list.length-1?'disabled':''}>›</button></div></div>`}
        <div class="toolbar" dir="ltr">
          <button hidden id="chronicles-exit">Exit · الفصول</button><button hidden id="chronicles-library">Exit · المكتبة</button><button id="chronicles-edit">Edit</button>
          <button id="chronicles-save" class="primary" disabled>Save</button>
          <button id="chronicles-cancel" hidden>Cancel</button>
          <span class="protected" id="chronicles-entry-status">Protected</span>
          <button id="chronicles-copy">Copy</button>
          <button id="chronicles-history">History</button>
          <button id="chronicles-print">Print</button>
          ${rules?'':'<button id="extra-export">PDF / HTML</button><button id="extra-print-all">Print all</button><button id="extra-add-chapter">+ New Chapter</button>'}
          <button id="extra-smaller" aria-label="Smaller text">A−</button><button id="extra-larger" aria-label="Larger text">A+</button>
        </div>
        <div id="chronicles-save-warning"></div>${book.id===REVIEW_BOOK?`<nav class="chapter-links" dir="rtl"><a href="#book=${IBN_BOOK}&view=dsl">أحداث الفصل في DSL</a> · <a href="https://benji-ink.vercel.app/#book=b81d1e63-6cae-445f-b8e4-a472ea5451d9">نسخة Ink</a>${(planningData?.storyDraft?.chapters?.find(p=>p.manuscriptEntryId===c.id)?.eventIds||[]).map(id=>`<a class="reference-link" href="#book=${IBN_BOOK}&view=dsl&dslview=map&focuskind=event&focusid=${id}">${esc(planningData.events.find(e=>e.id===id)?.title||'حدث')}</a>`).join('')}</nav>`:''}

        ${selectedPart?`<p class="chapter-part">${esc(partName(selectedPart))}</p>`:''}
        <h1 class="chapter-title" id="chronicles-reading-title" dir="auto">${rules?'':String(c.chapter_number).padStart(2,'0')+' · '}${esc(c.title)}</h1>
        <input id="chronicles-entry-title" class="chapter-title-input" maxlength="200" dir="auto" hidden>
        <div class="chapter-word-count" dir="ltr">${countWords(clean(c.body).replace(/<[^>]*>/g,' '))} words</div><div class="save-meta" dir="ltr">${book.id===OUTSIDE_TIME_BOOK&&c.revision===1?'GPT draft · _zkalam4 · Not approved<br>':''}Chapter ${version(c.revision)} · <span class="${writerLabel(c)}">${esc(c.updated_by)}</span> · ${date(c.updated_at)}<p>${esc(writingLabel(c.writing_meta))}</p>${c.writing_meta?.origin?`<p>${esc(c.writing_meta.origin)}</p>`:''}</div>
        ${!c.body.trim()&&!rules?'<p class="notice">This chapter is empty. Press Edit to begin.</p>':''}
        <article id="chronicles-entry-body" class="prose" lang="${book.language}" dir="${book.language==='en'?'ltr':'rtl'}" contenteditable="false">${clean(c.body)}</article>
        <nav class="chapter-bottom-controls" aria-label="Chapter editing and navigation" dir="ltr">
          ${rules?'':`<button id="bottom-prev" aria-label="Previous chapter" ${list.indexOf(c)<=0?'disabled':''}>‹</button>`}
          <button id="bottom-edit">Edit</button><button id="bottom-save" class="primary" disabled>Save</button>
          ${rules?'':`<button id="bottom-next" aria-label="Next chapter" ${list.indexOf(c)>=list.length-1?'disabled':''}>›</button>`}
        </nav>
        <details class="notes"><summary>Writing notes <span id="chronicles-note-count"></span></summary>
          <div id="chronicles-notes"></div>
          <button id="chronicles-quote-note">ملاحظة على النص المحدد</button><p id="chronicles-note-quote" dir="auto"></p><textarea id="chronicles-note-body" rows="3" dir="auto" placeholder="A note or idea to revisit…"></textarea>
          <button class="primary" id="chronicles-add-note">Add note</button>
        </details>
      </section></div><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    const metaBlock=$('.save-meta');
    metaBlock.insertAdjacentHTML('beforeend',"<fieldset class=\"chapter-writing-settings\" id=\"chapter-writing-settings\" disabled dir=\"ltr\">\n          <legend>Writing method for this saved version</legend>\n          <label>Method<select id=\"chapter-writing-method\"><option value=\"unknown\">Not recorded</option><option value=\"Manual\">Manual</option><option value=\"zk5\">zk5</option><option value=\"zkalam4\">zkalam4</option></select></label>\n          <label>Style guide version<input id=\"chapter-style-version\" maxlength=\"40\" placeholder=\"e.g. v001\"></label>\n          <label>Variant<select id=\"chapter-style-variant\"><option value=\"\">Not specified</option><option value=\"E\">E · Egyptian</option><option value=\"F\">F · Fusha</option></select></label>\n          <p>Use Edit to change these details, then Save. Manual does not use a style guide version.</p>\n        </fieldset>");
    fillWriting(c.writing_meta);
    for(const id of ['chapter-writing-method','chapter-style-version','chapter-style-variant'])$('#'+id).onchange=()=>{if(editing)backup();};
    $('#chapter-writing-method').onchange=()=>{if($('#chapter-writing-method').value==='Manual'){$('#chapter-style-version').value='';$('#chapter-style-variant').value='';}if(editing)backup();};
    $('#chapter-style-version').oninput=()=>{if(editing)backup();};
    $('#chronicles-exit').onclick=()=>navigate(book.id===IBN_BOOK?'#book='+REVIEW_BOOK:link(book.id));
    $('#chronicles-library').onclick=()=>navigate('#library&lang='+book.language);
    $('#chronicles-edit').onclick=()=>beginEdit();
    $('#chronicles-save').onclick=save;
    $('#bottom-edit').onclick=()=>beginEdit(null,true);
    $('#bottom-save').onclick=save;
    if(!rules){
      $('#bottom-prev').onclick=()=>$('#extra-prev').click();
      $('#bottom-next').onclick=()=>$('#extra-next').click();
    }
    $('#chronicles-cancel').onclick=cancel;
    $('#chronicles-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#chronicles-reading-title').textContent+'\n\n'+$('#chronicles-entry-body').innerText);say('Text copied.')}catch{say('Select the text and copy it manually.',true)}};
    $('#chronicles-history').onclick=()=>showHistory().catch(e=>say(e.message,true));
    $('#chronicles-print').onclick=()=>window.print();
    let readingSize=Number(storage.get('chronicles-size'))||17;
    const size=()=>{$('#chronicles-entry-body').style.fontSize=readingSize+'px';storage.set?.('chronicles-size',String(readingSize));};size();
    $('#extra-smaller').onclick=()=>{readingSize=Math.max(16,readingSize-1);size()};$('#extra-larger').onclick=()=>{readingSize=Math.min(30,readingSize+1);size()};
    if(!rules){
      bindParts();
      $('#edit-chapter-name').onclick=editChapterName;
      $('#picker-add-chapter').onclick=()=>{if(editing){say('Save or cancel chapter edits first.',true);return;}showCreateChapter();};
      $('#extra-chapter-select').onchange=e=>navigate(link(book.id)+'&chapter='+e.target.value);
      $('#extra-prev').onclick=()=>{const prev=list[list.indexOf(c)-1];if(prev)navigate(entryLink(prev))};
      $('#extra-next').onclick=()=>{const next=list[list.indexOf(c)+1];if(next)navigate(entryLink(next))};
      $('#extra-export').onclick=()=>showExport(c);$('#extra-add-chapter').onclick=showCreateChapter;
      $('#extra-print-all').onclick=()=>printEntries(chapterList());
    }

    $('#chronicles-add-note').onclick=addNote;
    $('#chronicles-quote-note').onclick=()=>{const sel=window.getSelection();if(!sel?.rangeCount||!$('#chronicles-entry-body').contains(sel.anchorNode)||!$('#chronicles-entry-body').contains(sel.focusNode)||!sel.toString().trim()){say('حدد فقرة من الفصل أولًا.',true);return;}$('#chronicles-note-quote').textContent=sel.toString().slice(0,3000);$('#chronicles-note-body').focus();};
    const saved=storage.get(draftKey(c.id));let d;
    try{d=saved?JSON.parse(saved):null}catch{}
    if(d&&d.title!==undefined){
      $('#chronicles-save-warning').innerHTML='<div class="notice">An unsaved draft is available on this device. <button id="chronicles-recover">Recover draft</button><button id="chronicles-discard">Discard draft</button></div>';
      $('#chronicles-recover').onclick=()=>{beginEdit(d);if(d.revision!==c.revision)say('The saved version changed after this draft. Review it before saving.',true)};
      $('#chronicles-discard').onclick=()=>{if(confirm('Discard this local draft?')){storage.remove(draftKey(c.id));$('#chronicles-save-warning').innerHTML=''}};
    }
    
    loadNotes(c.id).catch(e=>say(e.message,true));workflow.mount({...c,language:book.language},'extra',book.title,()=>editing);const technical=$('.reading-details');if(technical){technical.open=false;$('.editor-area').append(technical);const count=$('.chapter-word-count');if(count)technical.append(count);}
  }
  async function renderExportPage(briefOnly=false){
    $('#main').innerHTML=header()+'<p>Loading export…</p>';
    const [rows,branches]=await Promise.all([api('chronicles_book_entries?book_id=eq.'+book.id+'&kind=eq.chapter&select=*&order=chapter_number.asc'),api('chronicles_dsl_branches?book_id=eq.'+(book.id===REVIEW_BOOK?IBN_BOOK:book.id)+'&archived=eq.false&select=id,name,data,updated_at&order=updated_at.desc')]);
    $('#main').innerHTML=header()+`<style>.book-navigation .ink-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.book-navigation .ink-tabs a{min-width:0;font-size:13px;padding:8px}.book-navigation .ink-tabs a.garden-entrance{order:3}.book-navigation .ink-tabs a:nth-child(1){order:1}.book-navigation .ink-tabs a:nth-child(2){order:2}.book-navigation .ink-tabs a:nth-child(3){order:4}.book-navigation .ink-tabs a:nth-child(4){order:5}.book-navigation .ink-tabs a:nth-child(5){order:6}.book-export-page{width:100%;max-width:760px;min-width:0;margin:auto;padding:16px;box-sizing:border-box}.book-export-page form,.book-export-page label,.book-export-page span{min-width:0;max-width:100%;box-sizing:border-box}.book-export-page select{display:block;width:100%;max-width:100%;min-width:0;font-size:16px;text-overflow:ellipsis}.book-export-page input[type=checkbox]{width:18px;min-width:18px;flex:0 0 18px}.book-export-page button{font-size:13px;min-height:38px;padding:8px 12px}.handoff-actions{display:flex;flex-wrap:wrap;gap:8px}.handoff-actions button{flex:0 1 auto;max-width:100%;white-space:normal}.book-export-page small{font-size:12px}.book-export-page h1{font-size:28px}.book-export-page p{font-size:14px}.book-export-page dl{overflow-wrap:anywhere}.book-export-page dd{margin-inline:12px}.book-export-page iframe{box-sizing:border-box;max-width:100%}.synopsis-reading{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;font-size:17px;margin:16px 0}</style><section class="reference-page book-export-page"><h1>${briefOnly?'Story Brief':'Export'}</h1><p>${briefOnly?'الحكاية كاملة، من البداية إلى اتجاه النهاية، وما كُتب وما يزال مخططًا':'One HTML file for a new author or Claude'}</p><div class="handoff-actions"><button type="button" id="read-export-synopsis">Read Story Brief</button><button type="button" id="full-story-package">Full Story Package</button><button type="button" id="copy-story-brief">Copy Brief</button></div><p>For a new author: Full Story Package → Download HTML. Send the downloaded file and ask them to read Story Brief first.</p><details><summary>Story Brief guide</summary><p>A complete brief covers the opening, setting, character motives and relationships, cause and effect, parts and timeline, intended ending, written versus planned events, approved decisions and open questions. Each book keeps its own brief and writing rules.</p></details><section id="export-synopsis-reading" hidden dir="${book.language==='ar'?'rtl':'ltr'}"><h2>الحكاية كاملة</h2><div class="synopsis-reading"></div></section><form id="book-export-form"><label>Planning version<select name="branch">${branches.map((b,i)=>`<option value="${i}">${esc(b.name||'Planning')}</option>`).join('')}</select></label>${[['synopsis','Story Brief','الحكاية كاملة من البداية إلى النهاية'],['storyline','Storyline','الأحداث والأجزاء وتسلسل الزمن'],['chapters','Chapters','النص الكامل للفصول'],['characters','Characters','الشخصيات والعلاقات'],['rules','Writing rules','قواعد الكتاب والأسلوب']].map(([id,label,ar])=>`<label style="display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0"><input type="checkbox" name="${id}" checked><span>${label}<small style="display:block" dir="rtl">${ar}</small></span></label>`).join('')}<label>Chapters<select name="scope"><option value="all">All</option><option value="selected">Select</option></select></label><div id="export-chapter-selection" hidden>${rows.map(r=>`<label style="display:block"><input type="checkbox" name="chapter" value="${r.id}" checked> ${r.chapter_number} · ${esc(r.title)}</label>`).join('')}</div><p>Exports saved chapter titles and text. Planning drafts remain labelled as drafts.</p><div style="display:flex;gap:8px;margin:16px 0"><button class="primary" type="submit">Download HTML</button><button type="button" id="preview-book-export">Preview</button></div><p id="export-message" role="status"></p></form><iframe id="book-export-preview" title="Export preview" sandbox="" hidden style="width:100%;height:65vh;border:1px solid var(--line)"></iframe></section>`;
    const briefText=data=>{const story=data.storyDraft||data.currentStory||{};return data.storyBrief?.text||['Full Story Brief has not been saved yet. The following is existing planning material, not a complete author handoff.',story.treatment||'',story.synopsis||'',...(story.chapters||[]).map((c,i)=>(i+1)+' · '+(c.title||'')+'\n'+(c.summary||'')+'\n'+(c.points||[]).join('\n'))].filter(Boolean).join('\n\n');};
    const form=$('#book-export-form');const showSynopsis=()=>{const data=branches[Number(form.elements.branch.value)||0]?.data||{};$('#export-synopsis-reading .synopsis-reading').textContent=briefText(data);$('#export-synopsis-reading').hidden=false;};$('#read-export-synopsis').onclick=showSynopsis;$('#copy-story-brief').onclick=async()=>{showSynopsis();try{await navigator.clipboard.writeText($('#export-synopsis-reading .synopsis-reading').textContent);$('#copy-story-brief').textContent='Copied';}catch{say('Copy unavailable. Use Full Story Package to download HTML.',true);}};form.elements.branch.onchange=()=>{if(!$('#export-synopsis-reading').hidden)showSynopsis();};form.elements.scope.onchange=()=>$('#export-chapter-selection').hidden=form.elements.scope.value==='all';
    const documentHTML=()=>{const f=new FormData(form),data=branches[Number(f.get('branch'))||0]?.data||{},story=data.storyDraft||data.currentStory||{},chosen=f.get('scope')==='all'?rows:rows.filter(r=>f.getAll('chapter').includes(r.id));
      if(!['synopsis','storyline','chapters','characters','rules'].some(k=>f.has(k)))throw Error('Choose at least one section.');if(f.has('chapters')&&!chosen.length)throw Error('Choose at least one chapter.');
      const text=t=>{if(t==null||t==='')return '';if(Array.isArray(t))return t.map(text).join('');if(typeof t==='object')return '<dl>'+Object.entries(t).filter(([k,v])=>v!=null&&v!==''&&(!['id','x','y','created_at','updated_at'].includes(k)||(k==='id'&&String(v).startsWith('ZK5.')))).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+text(v)+'</dd>').join('')+'</dl>';return '<p style="white-space:pre-wrap">'+esc(String(t))+'</p>';},section=(id,title,body)=>'<section id="'+id+'"><h2>'+title+'</h2>'+body+'</section>',missing='<p>Not recorded in this planning version.</p>';let out='';
      if(f.has('synopsis'))out+=section('synopsis','Story Brief',text(briefText(data)));
      if(f.has('storyline'))out+=section('storyline','Storyline',(story.treatment?text(story.treatment):missing)+text(story.parts||[])+(story.chapters||[]).map((c,i)=>'<h3>'+esc(c.title||String(i+1))+'</h3>'+text(c.summary||'')+text(c.points||[])+(i===26&&data.storyBrief?'<p><strong>قرار أحدث: خط استخدام المتعلمين غطاءً مستبعد؛ هذا الملخص القديم يحتاج إعادة تصميم.</strong></p>':'')).join('')+'<h3>Events</h3>'+text(data.events||[]));
      if(f.has('characters'))out+=section('characters','Characters',text(data.characters||[])+text(data.relationships||data.connections||data.links||[]));
      if(f.has('rules'))out+=section('rules','Writing rules',data.storyBrief?.styleGuide?text(data.storyBrief.styleGuide):(data.rules?text(data.rules):missing));
      if(f.has('chapters'))out+=section('chapters','Chapters',chosen.map(r=>'<article><h3>'+r.chapter_number+' · '+esc(r.title)+'</h3>'+clean(r.body)+'</article>').join(''));
      return '<!doctype html><html lang="'+book.language+'" dir="'+(book.language==='ar'?'rtl':'ltr')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(book.title)+'</title><style>body{max-width:850px;margin:30px auto;padding:20px;background:#f5ecdf;color:#29362e;font:18px/1.9 Georgia,serif}section,article{margin:32px 0}nav{display:flex;flex-wrap:wrap;gap:16px}img{max-width:100%}p{overflow-wrap:anywhere}</style></head><body><h1>'+esc(book.title)+'</h1><nav>'+['synopsis','storyline','chapters','characters','rules'].filter(k=>f.has(k)).map(k=>'<a href="#'+k+'">'+k+'</a>').join('')+'</nav><p>Planning: '+esc(data.storyDraft?'Draft for review':'Saved planning')+'. Chapter text is exported separately from planning summaries.</p>'+out+'<details><summary>Technical details</summary><p>'+esc(new Date().toISOString())+'</p>'+chosen.map(r=>'<p>'+esc(r.title)+' · '+esc(r.updated_by||'')+' · '+esc(r.updated_at||'')+' · Revision '+r.revision+'</p>').join('')+'</details></body></html>';
    };
    $('#preview-book-export').onclick=()=>{try{const frame=$('#book-export-preview');frame.srcdoc=documentHTML();frame.hidden=false;$('#export-message').textContent='Preview ready.';}catch(e){$('#export-message').textContent=e.message;}};
    $('#full-story-package').onclick=()=>{['synopsis','storyline','chapters','characters','rules'].forEach(k=>form.elements[k].checked=true);form.elements.scope.value='all';$('#export-chapter-selection').hidden=true;$('#export-message').textContent='Full Story Package selected. Use Preview or Download HTML.';};if(briefOnly){showSynopsis();$('#book-export-form').hidden=true;$('#read-export-synopsis').hidden=true;$('#full-story-package').onclick=()=>navigate(link(book.id)+'&view=export');}
    form.onsubmit=e=>{e.preventDefault();try{const html=documentHTML(),url=downloadBlob(new Blob([html],{type:'text/html;charset=utf-8'}),book.title+'.html');setTimeout(()=>URL.revokeObjectURL(url),60000);$('#export-message').textContent='HTML ready. Send this file to your new author or Claude; ask them to read Story Brief first.';}catch(err){$('#export-message').textContent=err.message;}};
  }
  function exportHTML(rows){return '<!doctype html><html lang="'+book.language+'" dir="'+(book.language==='ar'?'rtl':'ltr')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(book.title)+'</title><style>body{max-width:850px;margin:30px auto;padding:20px;font:20px/1.9 Georgia,serif}article{break-before:page}p{margin:0 0 .6em}small{font-size:13px}</style><h1>'+esc(book.title)+'</h1>'+rows.map(c=>'<article><h2>'+c.chapter_number+' · '+esc(c.title)+'</h2><small>Chapter '+version(c.revision)+' · '+esc(c.updated_by)+' · '+esc(c.updated_at)+' · '+esc(writingLabel(c.writing_meta))+'</small>'+clean(c.body)+'</article>').join('')+'</html>';}
  function printEntries(rows){const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';frame.title='Print book';frame.srcdoc=exportHTML(rows);frame.onload=()=>{frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print()};document.body.append(frame);}
  function showExport(c){
    modal('PDF / HTML',`<form id="extra-export-form"><label>Format<select name="format"><option value="html">HTML</option><option value="pdf">PDF</option></select></label><label>Chapters<select name="scope"><option value="current">Current chapter</option><option value="all">All chapters</option></select></label><button type="submit">Prepare file</button><p id="extra-export-status" role="status"></p></form>`);
    $('#extra-export-form').onsubmit=async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;const report=t=>$('#extra-export-status').textContent=t;try{const latest=await api('chronicles_book_entries?book_id=eq.'+book.id+'&kind=eq.chapter&select=*&order=chapter_number.asc');const rows=(form.elements.scope.value==='all'?latest:latest.filter(x=>x.id===c.id)).map(x=>({...x,writing_meta:x.writing_meta?.method?x.writing_meta:entries.find(e=>e.id===x.id&&e.revision===x.revision)?.writing_meta||{},language:book.language}));const format=form.elements.format.value;const blob=format==='pdf'?await buildPDF(rows,{cover:false,colors:true,language:book.language,title:book.title},{esc,clean,onProgress:report,signal:new AbortController().signal}):new Blob([exportHTML(rows)],{type:'text/html;charset=utf-8'});const url=downloadBlob(blob,book.title+'.'+format);report('File ready');setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(err){report(err.message)}finally{button.disabled=false}};
  }
  function editChapterName(){
    if(editing){say('Save or cancel chapter edits first.',true);return;}
    const chapter=active;
    modal('Edit chapter name',`<form id="chapter-name-form"><label>Chapter title<input name="title" dir="auto" required maxlength="200" value="${esc(chapter.title)}"></label><button type="submit">Save</button><p id="chapter-name-error" role="alert"></p></form>`);
    $('#chapter-name-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button'),title=String(new FormData(e.target).get('title')||'').trim();if(!title){$('#chapter-name-error').textContent='Enter a chapter title.';return;}button.disabled=true;busy=true;
      try{const rows=await api('chronicles_book_entries?id=eq.'+chapter.id+'&revision=eq.'+chapter.revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({title,updated_by:getWriter()})});if(!rows?.length)throw Error('This chapter changed on another device. Reopen the page before saving.');
        active={...chapter,...rows[0]};entries=entries.map(x=>x.id===active.id?active:x);$('#modal').close();renderEntry();say('Chapter name saved.');
      }catch(err){$('#chapter-name-error').textContent=err.message;}finally{busy=false;button.disabled=false;}
    };
  }
  function beginEdit(d,keepPosition=false){
    if(!active||editing)return;
    editing=true;
    $('#chapter-writing-settings').disabled=false;fillWriting(d?.writing_meta||active.writing_meta);
    $('#chronicles-edit').disabled=true;$('#bottom-edit').disabled=true;$('#bottom-save').disabled=false;
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
    $('#chronicles-entry-body').focus({preventScroll:keepPosition});
  }
  function cancel(){
    if(hasChanges()&&!confirm('Discard unsaved edits?'))return;
    editing=false;storage.remove(draftKey(active.id));renderEntry();
  }
  async function save(){
    if(!editing||busy||!active)return;
    const title=$('#chronicles-entry-title').value.trim(),body=clean($('#chronicles-entry-body').innerHTML),plain=$('#chronicles-entry-body').textContent.trim();
    if(!title||!plain){say('Enter a title and text before saving.',true);return}
    backup();busy=true;$('#chronicles-save').disabled=true;$('#bottom-save').disabled=true;$('#chronicles-entry-body').contentEditable='false';
    try{
      const rows=await api('chronicles_book_entries?id=eq.'+active.id+'&revision=eq.'+active.revision,{
        method:'PATCH',headers:{Prefer:'return=representation'},
        body:JSON.stringify({title,body,writing_meta:writingInputs(),updated_by:getWriter()})
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
    finally{busy=false;if(editing&&$('#chronicles-save')){$('#chronicles-save').disabled=false;$('#bottom-save').disabled=false;$('#chronicles-entry-body').contentEditable='true'}}
  }
  async function showHistory(){
    if(!active)return;
    const id=active.id;
    modal('Revision history','<div class="loading">Loading revision history…</div>');
    const versions=await api('chronicles_book_versions?entry_id=eq.'+id+'&select=*&order=revision.desc&limit=1000');
    if(active?.id!==id)return;
    $('#modal-content').innerHTML='<p class="reference-note">History keeps each revision with its writer and time. Restoring an older revision opens a draft and preserves newer versions.</p>'
      +versions.map((v,i)=>`<div class="version">
        <strong>Chapter ${version(v.revision)} ${i===0?'· Current':''}</strong>
        <small class="${writerLabel({updated_by:v.saved_by})}">${esc(v.saved_by)} · ${date(v.saved_at)} · ${esc(writingLabel(v.writing_meta))}</small>
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
      <small><strong>${esc(n.author)}</strong> · ${date(n.created_at)}</small>${n.quote_text?`<blockquote dir="auto">${esc(n.quote_text)}</blockquote><small>نسخة الفصل وقت التعليق: ${n.source_revision||''}</small>`:''}<p dir="auto">${esc(n.body)}</p><button data-resolve-note="${n.id}">${n.resolved_at?'إعادة فتح الملاحظة':'اتعالجت'}</button>${n.resolved_at?`<small>اتعالجت بواسطة ${esc(n.resolved_by)} · ${date(n.resolved_at)}</small>`:''}
    </div>`).join('');
    document.querySelectorAll('[data-resolve-note]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const n=notes.find(n=>n.id===b.dataset.resolveNote);await api('chronicles_book_notes?id=eq.'+n.id,{method:'PATCH',body:JSON.stringify({resolved_at:n.resolved_at?null:new Date().toISOString(),resolved_by:n.resolved_at?null:getWriter()})});await loadNotes(id);}catch(e){say(e.message,true);b.disabled=false;}});
  }
  async function addNote(){
    if(!active)return;
    const input=$('#chronicles-note-body'),body=input.value.trim(),id=active.id;
    if(!body)return;
    const button=$('#chronicles-add-note');button.disabled=true;
    try{
      await api('chronicles_book_notes',{method:'POST',body:JSON.stringify({entry_id:id,author:getWriter(),body,quote_text:$('#chronicles-note-quote')?.textContent||'',source_revision:active.revision})});
      if(active?.id===id){input.value='';$('#chronicles-note-quote').textContent='';await loadNotes(id);}
      say('Note added.');
    }catch(e){say(e.message,true)}finally{if($('#chronicles-add-note'))$('#chronicles-add-note').disabled=false}
  }
  return {load,isBookRoute,cards,illustratedCards,relatedLinks,showCreateModal,render,hasChanges,allowLeave,leave,backup};
}


