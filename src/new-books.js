import {chapterBottomControls} from './technical-footer.js';
import {writingStandardReference} from './writing-standards.js';
import {HQ} from './hq-protocol.js';
import {notesShell,mountChapterNotes} from './chapter-notes.js';
import {renderStoryWorkspace} from './story-workspace.js';
import {saveBookRelation} from './record-save.js';
import {saveNoteResolution} from './note-save.js';
import {chapterWritingStamp,mountChapterHistory} from './chapter-history.js';
import {technicalPanel,formatTime} from './revision-stamp.js';
import {revisionStamp} from './revision-stamp.js';
import {currentPlanning} from './current-book-brief.js';
import {bookNavigation,selectedBookTool} from './book-navigation.js';
import {LAST_HOUR_BOOK,lastHourLinks,renderLastHourBible} from './last-hour.js';
import {handoffText,handoffCSS} from './handoff-format.js';
import {savedStoryBrief} from './story-brief.js';
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
    const method=$('#chapter-writing-method').value.trim()||'unknown';
    return {...current,method,style_version:method==='Manual'?'':$('#chapter-style-version').value.trim(),variant:method==='Manual'?'':$('#chapter-style-variant').value.trim()};
  }
  function fillWriting(meta={}){
    $('#chapter-writing-method').value=meta.method==='unknown'?'':meta.method||'';
    $('#chapter-style-version').value=meta.style_version||'';
    $('#chapter-style-variant').value=meta.variant||'';
  }
  const $=selector=>document.querySelector(selector);
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const draftKey=id=>'chronicles-book-draft:'+id;
  let books=[],book=null,entries=[],active=null,editing=false,busy=false,parts=[],selectedPart=null;

  const chapterList=()=>entries.filter(e=>e.kind==='chapter').sort((a,b)=>a.chapter_number-b.chapter_number);
  const link=id=>'#book='+id+(id===IBN_BOOK&&new URLSearchParams(location.hash.slice(1)).get('archive')==='1'?'&archive=1':'');
  const entryLink=entry=>link(entry.book_id)+(entry.kind==='rules'?'&rules=1':'&chapter='+entry.chapter_number);

  const illustratedBook='824a4e1d-dc55-5876-88e4-4da32082c55b';
  let illustratedCount=0;
  const illustratedCover=b=>`<div class="story-cover-art bellwether-cover" role="img" aria-label="${esc(b.title)} cover: a passenger train at a snowy Midwest station at night"><div class="cover-lettering"><h2>${esc(b.title)}</h2><small>AMERICAN ADAPTATION · 1951</small></div><div class="cover-credit">Benji &amp; Almostasherq</div></div>`;
  async function load(){books=(await api('chronicles_books?select=id,title,language,primary_writer,collaboration,related_work,created_at,revision&order=created_at.asc')).filter(b=>!planningStory(b.id));if(books.some(b=>b.id===illustratedBook))illustratedCount=(await api('chronicles_book_entries?book_id=eq.'+illustratedBook+'&kind=eq.chapter&select=id')).length;}
  function illustratedCards(language){return books.filter(b=>b.language===language&&b.id===illustratedBook).map(b=>`<a class="story-card collection-story" href="${link(b.id)}">${illustratedCover(b)}<div class="card-body"><h2>${esc(b.title)}</h2><small>${illustratedCount} chapters · _zk5e</small><span>Open story</span></div></a>`).join('');}
  function isBookRoute(params){return params.has('book');}
  // Book Cover T001: one full portrait cover, sharing the Lost Files dimensions.
  const bookArtwork={
    [LAST_HOUR_BOOK]:{subtitle:'1966 · 1996 · 2026',className:'last-hour-cover'},
    '43d580d7-a4bd-4d19-bd1c-0cad57b2e105':{image:'/artwork/angels-and-robots-cover-v1.webp',subtitle:'ANGELS & ROBOTS',title:'ملائكة وروبوتات',className:'angels-robots-cover'},
    '66739f5d-2bac-4d75-a4fd-6df93da8ac7e':{image:'/artwork/ibn-al-jabal-cover-v1.webp',subtitle:'IBN AL JABAL'}
  };
  function fullBookCover(b,extraClass=''){
    const art=bookArtwork[b.id===REVIEW_BOOK?IBN_BOOK:b.id];
    return `<a class="collection-cover chronicles-new-card full-book-cover ${art?.className||''} ${extraClass}" href="${link(b.id)}" aria-label="Open ${esc(b.title)}" ${art?.image?`style="background-image:url('${art.image}')"`:''}>
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
    if(status)status.textContent='Saved on this device only';
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
      // Review and export must use the same current manuscript as Chapters.
      // The original nine chapters remain reachable only through explicit archive links.
      if(['critique','export'].includes(view)){
        const target=new URLSearchParams(params);target.set('book',REVIEW_BOOK);
        history.replaceState(history.state,'',location.pathname+location.search+'#'+target.toString());await render(target);return;
      }
      if(!view||['chapters','originals','contents','cover'].includes(view)||params.get('storytab')==='manuscript'){
        const draft=params.get('draftchapter'),number=draft?.match(/ch-(\d+)$/)?.[1];
        const target='#book='+REVIEW_BOOK+(number?'&chapter='+number:view==='contents'?'&view=contents':view==='cover'?'&view=cover':'');history.replaceState(history.state,'',location.pathname+location.search+target);await render(new URLSearchParams(target.slice(1)));return;
      }
    }
    if(id===REVIEW_BOOK&&params.get('view')==='chapters'){const target='#book='+REVIEW_BOOK;history.replaceState(history.state,'',location.pathname+location.search+target);await render(new URLSearchParams(target.slice(1)));return;}
    if(!uuid.test(id))throw Error('Invalid book link.');
    book=books.find(b=>b.id===id);
    if(!book){await load();book=books.find(b=>b.id===id);}
    if(!book)throw Error('Book not found.');const currentBook=await api('chronicles_books?id=eq.'+id+'&select=*&limit=1');if(currentBook.find(b=>b.id===id))book=currentBook.find(b=>b.id===id);const footerRules=document.querySelector('.footer-rules [data-book-rules]');if(footerRules){footerRules.hidden=false;footerRules.textContent='Book Rules';footerRules.href=link(book.id)+'&rules=1';}
    const manuscriptOverview=book.language==='en'&&params.get('view')==='chapters'&&!params.has('dslview')&&!params.has('dslbranch')&&!params.has('storytab')&&!params.has('draftchapter');
    if(!manuscriptOverview&&['dsl','storyline','chapters'].includes(params.get('view'))){
      active=null;editing=false;const nav=document.querySelector('.book-navigation');
      if(nav){nav.hidden=false;nav.innerHTML='<div class="ink-tabs">'+bookNavigation(link(book.id),selectedBookTool(params),book.id===IBN_BOOK?'#book='+REVIEW_BOOK:link(book.id))+'</div><div class="story-aux-nav"><a href="'+(book.id===IBN_BOOK?'#book='+REVIEW_BOOK:link(book.id))+'">Back to chapters</a><a href="#library&lang='+book.language+'">Library</a></div>';}
      await renderDSL($('#main'),api,book.id===REVIEW_BOOK?IBN_BOOK:book.id,params.get('view'));return;
    }
    const loaded=await api('chronicles_book_entries?book_id=eq.'+id+'&select=id,book_id,kind,chapter_number,title,revision,updated_at,updated_by,writing_meta&order=chapter_number.asc.nullslast');
    entries=loaded;
    const missing=params.has('chapter')?entries.filter(e=>e.kind==='chapter'&&e.chapter_number===Number(params.get('chapter'))&&!e.writing_meta?.method):[];
    if(missing.length){
      const matches=missing.map(e=>'and(entry_id.eq.'+e.id+',revision.eq.'+e.revision+')').join(',');
      const meta=await api('chronicles_book_versions?select=entry_id,revision,writing_meta&or=('+matches+')');
      entries=entries.map(e=>({...e,writing_meta:e.writing_meta?.method?e.writing_meta:meta.find(v=>v.entry_id===e.id&&v.revision===e.revision)?.writing_meta||{}}));
    }
    planningData=null;
    parts=await api("chronicles_book_parts?book_id=eq."+id+"&select=id,title,start_chapter,planned_chapters,revision,updated_by,updated_at&order=start_chapter.asc");
    selectedPart=parts.find(p=>p.id===params.get("part"))||null;
    const nav=document.querySelector('.book-navigation');
    if(nav){
      const base=link(book.id),view=params.get('view');
      const selected=params.has('chapter')?'chapters':params.get('dsltool')==='blend'?'blender':params.get('dslview')==='characters'?'characters':view||(params.has('rules')?'rules':'chapters');
      const tabs=[['brief','Story','&view=dsl&dslview=synopsis'],['chapters','Chapters',book.id===IBN_BOOK?'&view=chapters':''],['critique','Review','&view=critique']];
      nav.hidden=false;nav.dir='ltr';
      nav.innerHTML='<div class="ink-tabs">'+tabs.filter(([id])=>!['dsl','blender','workbook'].includes(id)).map(([id,label,suffix])=>'<a href="'+(book.id===IBN_BOOK&&id==='chapters'?'#book='+REVIEW_BOOK:base+suffix)+'"'+((selected===id||(id==='brief'&&['dsl','characters'].includes(selected)))?' class="selected" aria-current="page"':'')+'>'+label+'</a>').join('')+'</div><div class="story-aux-nav"><a href="'+base+'&view=cover">'+(book.id===LAST_HOUR_BOOK?'Cover':esc(book.title))+'</a><a href="#library&lang='+book.language+'">'+(book.language==='en'?'English':'Arabic')+' Library</a></div>';
      if(book.id===IBN_BOOK||book.id===REVIEW_BOOK){
       nav.classList.add('ibn-navigation');
       const back=document.createElement('nav');back.className='current-back';back.innerHTML='<a href="#library&lang='+book.language+'">'+(book.language==='en'?'English':'Arabic')+' Library</a><a href="'+base+'&view=cover">'+esc(book.title)+'</a>';
       nav.querySelector('.story-aux-nav')?.remove();nav.prepend(back);
      }else nav.classList.remove('ibn-navigation');
    }
    if(book.id===LAST_HOUR_BOOK&&params.get('view')==='bible'){active=null;editing=false;renderLastHourBible($('#main'),{clean,esc});return;}
    if(params.get('view')==='brief'){active=null;editing=false;await renderStoryWorkspace($('#main'),api,{bookId:book.id===REVIEW_BOOK?IBN_BOOK:book.id,title:book.title,language:book.language,root:link(book.id),branchId:params.get('dslbranch'),extraLinks:book.id===LAST_HOUR_BOOK?'<a href="'+link(book.id)+'&view=bible">Story Bible</a>':''});return;}
    if(['export','brief'].includes(params.get('view'))){active=null;editing=false;await renderExportPage(params.get('view')==='brief');return;}
    if(params.get('view')==='cover'){active=null;editing=false;renderOverview(true);return;}
    if(params.get('view')==='contents'){active=null;editing=false;$('#main').innerHTML=storyContents(book.title,chapterList(),null,{root:link(book.id),language:book.language,parts,rulesUrl:link(book.id)+'&rules=1',notesUrl:link(book.id)+'&view=dsl',notesLabel:'Planning Notes'});return;}
    if(params.get('view')==='critique'){active=null;editing=false;await renderCritique($('#main'),api,{bookId:book.id===REVIEW_BOOK?IBN_BOOK:book.id,language:book.language,title:book.title,sourceLabel:book.id===IBN_BOOK?'Original archived manuscript':book.id===REVIEW_BOOK?'Current manuscript':'Saved manuscript',sourcePath:'chronicles_book_entries?book_id=eq.'+book.id+'&kind=eq.chapter&select=id,chapter_number,title,body,revision,updated_at&order=chapter_number.asc'});return;}
    if(params.get('view')==='references'){const branches=await api('chronicles_dsl_branches?book_id=eq.'+book.id+'&archived=eq.false&select=data->references&order=updated_at.desc&limit=1');$('#main').innerHTML=header()+'<section class="reference-page"><h1>References</h1><h2>Images &amp; Media</h2><p class="reference-note">Artwork and media developed for this book, with original sources and earlier versions preserved.</p>'+renderBookMedia(book.id,bookArtwork[book.id],esc)+'<h2>Research &amp; Notes</h2><p style="white-space:pre-wrap">'+esc(branches[0]?.references||'Research notes are not recorded yet.')+'</p></section>';return;}
    const rules=params.get('rules')==='1';
    const no=Number(params.get('chapter'));
    if(rules||params.has('chapter')){
      active=rules?entries.find(e=>e.kind==='rules'):entries.find(e=>e.kind==='chapter'&&e.chapter_number===no);
      if(!active)throw Error('Page not found.');
      const rows=await api('chronicles_book_entries?id=eq.'+active.id+'&book_id=eq.'+book.id+'&select=*&limit=1');
      if(!rows[0])throw Error('Page no longer available.');active=rows[0];entries=entries.map(e=>e.id===active.id?active:e);
      if(id===REVIEW_BOOK){try{const rows=await api('chronicles_dsl_branches?book_id=eq.'+IBN_BOOK+'&archived=eq.false&select=data->storyDraft,data->events&order=updated_at.desc&limit=1');planningData=rows[0]||null;}catch{say('Planning links unavailable. Chapter text is available.',true);}}
      selectedPart=partFor(active.chapter_number);
      editing=false;
      renderEntry();
    }else{active=null;editing=false;if(selectedPart)renderPartHome();else renderOverview();}
  }

  function partFor(number){return [...parts].reverse().find(p=>number>=p.start_chapter)||null;}
  function partChapters(p){return chapterList().filter(c=>partFor(c.chapter_number)?.id===p?.id);}
  function partOrdinal(p){return 'Part '+(parts.indexOf(p)+1);}
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
  function partsUI(){return `${partStyles()}<div class="book-parts compact-book-parts" dir="${book.language==='ar'?'rtl':'ltr'}"><div class="book-part-picker"><select id="book-part-select" aria-label="Part"><option value="">Choose part</option>${parts.map(p=>`<option value="${p.id}" ${selectedPart?.id===p.id?'selected':''}>${esc(partName(p))}</option>`).join('')}</select><button class="part-circle" lang="en" dir="ltr" aria-label="Edit part name" id="rename-part" ${selectedPart?'':'disabled'}>Edit</button><button class="part-circle part-add" id="add-part" aria-label="Add part" title="Add part">＋</button></div><div class="part-management">${selectedPart?`<p class="part-count" lang="en" dir="ltr">${partChapters(selectedPart).length} written chapters${selectedPart.planned_chapters?' · '+selectedPart.planned_chapters+' planned chapters':''}</p>${technicalPanel('<p>'+esc(revisionStamp(selectedPart))+' · '+esc(selectedPart.updated_by||'Writer not recorded')+'</p>')}`:''}</div></div>`;}
  function bindParts(){
    $('#book-part-select').onchange=async e=>{const p=parts.find(x=>x.id===e.target.value);if(!p)return;const c=partChapters(p)[0];await navigate(c?entryLink(c):link(book.id)+'&part='+p.id);};
    $('#rename-part').onclick=()=>editPart(selectedPart);
    $('#add-part').onclick=()=>editPart(null);
  }
  function editPart(p){
    if(editing){say('Save or cancel chapter edits first.',true);return;}
    const next=Math.max(1,...parts.map(x=>x.start_chapter+(x.planned_chapters||1)),...chapterList().map(x=>x.chapter_number+1));
    modal(p?'Edit part':'New part',`<form id="part-form" dir="ltr"><label>Part title<input name="title" dir="auto" required maxlength="160" value="${esc(p?.title||'')}"></label>${p?'':`<label>First chapter number<input name="start" type="number" min="1" max="999" required value="${next}"></label><label>Planned chapter count (optional)<input name="count" type="number" min="1" max="999"></label>`}<button type="submit">Save</button><p id="part-error" role="alert"></p></form>`);
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
    const lastHour=book.id===LAST_HOUR_BOOK;
    const drafted=list.filter(c=>['full_chapter','revised_full_chapter'].includes(c.writing_meta?.draft_status)).length;
    const cards=rows=>chapterCards(rows,{esc,root:link(book.id),date,language:book.language});
    const unassigned=parts.length?list.filter(c=>!partFor(c.chapter_number)):list;
    const overviewCards=parts.length
      ? (unassigned.length?cards(unassigned):'')+parts.map(p=>{
          const rows=partChapters(p);
          return rows.length?`<h2>${esc(partName(p))}</h2>`+cards(rows).replace(/<h2>.*?<\/h2>/,''):'';
        }).join('')
      : cards(list);
    $('#main').innerHTML=(lastHour&&showCover?'':header())+`<section class="reference-page chronicles-book-home" dir="${book.language==='en'?'ltr':'rtl'}">
      ${showCover?(book.id===illustratedBook?'<a class="bellwether-entrance" href="'+link(book.id)+'">'+illustratedCover(book)+'</a>':fullBookCover(book,'book-overview-cover')):''}
      <div class="eyebrow">BENJI CHRONICLES · ${book.id===illustratedBook?'American adaptation':'Independent book'}</div>
      ${lastHour&&showCover?'':`<h1 dir="auto">${esc(book.title)}</h1>`}
      <p class="reference-intro" dir="auto">${lastHour?`${drafted} ${drafted===1?'chapter':'chapters'} drafted`:esc(book.description||'A space to write a new story.')}</p>
      <p class="reference-note">Primary writer: <strong class="${book.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(book.primary_writer)}</strong>
         · ${book.collaboration==='shared'?'Shared writing workspace':'Independent book'} · ${book.language==='en'?'English':'Arabic'}</p>
      <div class="chronicles-book-actions">
        <button id="chronicles-add-chapter" class="primary">+ New chapter</button>

        <a href="${link(book.id)}&view=dsl&dslview=synopsis" class="reference-link">Story</a>

      </div>
      ${partStyles()}<nav class="book-part-list" dir="${book.language==='ar'?'rtl':'ltr'}" aria-label="Book parts"><div class="book-part-heading"><span>Parts</span><button type="button" class="part-circle part-add" id="overview-add-part" aria-label="Add part" title="Add part">＋</button></div>${parts.map(p=>`<div class="book-part-row"><a href="${partChapters(p)[0]?entryLink(partChapters(p)[0]):link(book.id)+'&part='+p.id}"><small>${esc(partOrdinal(p))}</small><strong>${esc(p.title)}</strong></a><button type="button" class="part-circle" lang="en" dir="ltr" data-edit-overview-part="${p.id}" aria-label="Edit ${esc(p.title)}">Edit</button></div>`).join('')}</nav>${overviewCards}${lastHour?`<details class="last-hour-story-notes"><summary>Story Notes</summary>${lastHourLinks(book.id)}</details>`:''}${technicalPanel(list.map(c=>`<p><bdi>${esc(c.title)}</bdi> · ${version(c.revision)} · ${esc(c.updated_by||'Writer not recorded')} · ${esc(formatTime(c.updated_at))}</p>`).join(''))}${book.id===REVIEW_BOOK?`<details><summary>Archive</summary><a href="#book=${IBN_BOOK}&archive=1&view=originals">Previous manuscript</a></details>`:''}
    </section><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    $('#overview-add-part').onclick=()=>editPart(null);document.querySelectorAll('[data-edit-overview-part]').forEach(el=>el.onclick=()=>editPart(parts.find(p=>p.id===el.dataset.editOverviewPart)));
    $('#chronicles-add-chapter').onclick=showCreateChapter;
  }
  const relatedRoute=key=>key.startsWith('story:')?('#story='+key.split(':')[1]+'&lang='+key.split(':')[2]):'#book='+key;
  function relatedLinks(key){const direct=books.find(b=>b.id===key)?.related_work;const links=[...(direct?[{key:direct,title:books.find(b=>b.id===direct)?.title||'Related story'}]:[]),...books.filter(b=>b.related_work===key).map(b=>({key:b.id,title:b.title}))];return links.map(x=>`<a class="reference-link" href="${relatedRoute(x.key)}">Related Story · ${esc(x.title)}</a>`).join('');}
  function editRelation(){modal('Related Story',`<form id="related-form"><p>A connection is optional. Each work keeps its own chapters and approval.</p><label>Connect to<select name="related"><option value="">None · Independent work</option>${books.filter(b=>b.id!==book.id&&b.language!==book.language).map(b=>`<option value="${b.id}">${esc(b.title)}</option>`).join('')}${book.language==='en'?['قطار الليل','الدور الرابع','ثلاث شقق في وسط البلد','ترجمة ناقصة','الساعة اللي وقفت','شقة بالإيجار القديم','البصمة الغلط','نهر بلا شهود','الراجل اللي بلّغ عن نفسه','فندق الجيزة ١٩٧٣','رسالة من بكرة','شرخ زمني'].map((t,i)=>`<option value="story:${i+1}:ar">${esc(t)}</option>`).join(''):'<option value="story:12:en">A Fracture in Time</option>'}</select></label><button>Save Connection</button></form>`);$('#related-form select').value=book.related_work||'';$('#related-form').onsubmit=async e=>{e.preventDefault();try{const related=new FormData(e.target).get('related')||null;book=await saveBookRelation(api,book,related,getWriter());await load();$('#modal').close();renderOverview();say('Story connection saved.')}catch(e){say(e.message,true)}};}
  function showCreateChapter(){
    const next=selectedPart?Math.max(selectedPart.start_chapter,...partChapters(selectedPart).map(c=>c.chapter_number+1)):Math.max(0,...chapterList().map(c=>c.chapter_number))+1;
    modal('+ New chapter',`<form id="chronicles-create-chapter" class="chronicles-book-form">
      ${selectedPart?`<p>${esc(partName(selectedPart))}</p>`:''}
      <label>Chapter number<input name="number" type="number" min="1" max="999" value="${next}" required></label>
      <label>Chapter title<input name="title" required maxlength="200" dir="auto" value="${'Chapter '}${next}"></label>
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

  function chapterPlan(entry){
    return planningData?.storyDraft?.chapters?.find(p=>p.manuscriptEntryId===entry.id);
  }
  function planningNotes(entry){
    const p=chapterPlan(entry);if(!p)return '';
    const points=Array.isArray(p.points)?p.points:[];
    return '<details class="notes chapter-planning-notes"><summary lang="en" dir="ltr">Planning notes</summary><div dir="rtl">'+
      (p.summary?'<p>'+esc(p.summary).replace(/\\n/g,'<br>')+'</p>':'')+
      (points.length?'<ul>'+points.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'')+
      (p.turn?'<p><strong>Purpose</strong><br>'+esc(p.turn)+'</p>':'')+
      (p.next?'<p><strong>Next</strong><br>'+esc(p.next)+'</p>':'')+
      '<small>Planning only · '+esc(writingStandardReference('ar')?.code||'Guide unrecorded')+' · _am</small></div></details>';
  }
  function renderEntry(){
    if(!active)return;
    const c=active,rules=c.kind==='rules';selectedPart=rules?null:partFor(c.chapter_number);const list=selectedPart?partChapters(selectedPart):chapterList();
    const selected=rules?'Book Rules':'Chapter '+c.chapter_number;
    const bookReading=!rules&&book.language==='en';
    $('#main').innerHTML=`<nav class="crumb" style="position:relative"><strong dir="auto">${esc(book.title)}</strong><a href="${book.id===IBN_BOOK?'#book='+REVIEW_BOOK:link(book.id)}" aria-label="${esc(book.title)} · Chapters" style="position:absolute;inset:0"></a></nav><p class="collection-caption">${book.id===REVIEW_BOOK?'Chapters · Drafts for review':book.language==='ar'?'Arabic Original':'English Original'}</p><div class="workspace chronicles-workspace${bookReading?' book-reading-layout':''}">
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
          <button hidden id="chronicles-exit">Exit · Chapters</button><button hidden id="chronicles-library">Exit · Library</button><button id="chronicles-edit">Edit</button>
          <button id="chronicles-save" class="primary" disabled>Save</button>
          <button id="chronicles-cancel" hidden>Cancel</button>
          <span class="protected" id="chronicles-entry-status">Protected</span>
          <button id="chronicles-copy">Copy</button>
          <button id="chronicles-history">History</button>
          ${bookReading?'':'<button id="chronicles-print">Print</button>'}
          ${rules?'':'<button id="extra-export">PDF / HTML</button>'}${rules||bookReading?'':'<button id="extra-print-all">Print all</button><button id="extra-add-chapter">+ New Chapter</button>'}
          <button id="extra-smaller" aria-label="Smaller text">A−</button><button id="extra-larger" aria-label="Larger text">A+</button>
        </div>
        <div id="chronicles-save-warning"></div>${book.id===REVIEW_BOOK?`<nav class="chapter-links" dir="rtl"><a href="#book=${IBN_BOOK}&view=dsl">Chapter events</a> · <a href="https://benji-ink.vercel.app/#book=b81d1e63-6cae-445f-b8e4-a472ea5451d9">Ink edition</a>${(planningData?.storyDraft?.chapters?.find(p=>p.manuscriptEntryId===c.id)?.eventIds||[]).map(id=>`<a class="reference-link" href="#book=${IBN_BOOK}&view=dsl&dslview=map&focuskind=event&focusid=${id}">${esc(planningData.events.find(e=>e.id===id)?.title||'Event')}</a>`).join('')}</nav>`:''}

        ${selectedPart?`<p class="chapter-part">${esc(partName(selectedPart))}</p>`:''}
        ${bookReading?`<p class="book-reading-number">Chapter ${String(c.chapter_number).padStart(2,'0')}</p>`:''}
        <h1 class="chapter-title" id="chronicles-reading-title" dir="auto">${rules||bookReading?'':String(c.chapter_number).padStart(2,'0')+' · '}${esc(c.title)}</h1>
        ${!rules&&book.id===REVIEW_BOOK?planningNotes(c):''}
        <input id="chronicles-entry-title" class="chapter-title-input" maxlength="200" dir="auto" hidden>
        ${technicalPanel(`<section class="chapter-stamp" aria-label="Saved writing stamp" dir="ltr">
          ${chapterWritingStamp(c,{esc,language:book.language,version,date})}
          <fieldset class="chapter-writing-settings" id="chapter-writing-settings" disabled hidden>
            <legend>Writing stamp for this revision</legend>
            <label>Method<input id="chapter-writing-method" maxlength="40" placeholder="Unrecorded" spellcheck="false"></label>
            <label>Guide version<input id="chapter-style-version" maxlength="40" placeholder="Unrecorded" spellcheck="false"></label>
            <label>Variant<input id="chapter-style-variant" maxlength="40" placeholder="Unrecorded" spellcheck="false"></label>
            ${book.language==='ar'?'<div class="chapter-variant-choices"><button type="button" data-writing-variant="_am">_am · <span lang="ar">العامية</span></button><button type="button" data-writing-variant="_f">_f · <span lang="ar">المثقفة</span></button></div>':''}
            <a class="chapter-current-guide" href="${HQ}/standards/${book.language==='ar'?'Arabic_Voice_ZK7_v001.html':'English_Voice_v007.html'}">Current guide in HQ</a>
          </fieldset>
        </section><div class="save-meta" dir="ltr">${rules?`Book Rules ${version(c.revision)} · ${esc(c.updated_by)} · ${esc(date(c.updated_at))}`:''}${c.writing_meta?.origin?`<p>${esc(c.writing_meta.origin)}</p>`:''}</div><div class="chapter-word-count" dir="ltr">${countWords(clean(c.body).replace(/<[^>]*>/g,' '))} words</div>`)}
        ${!c.body.trim()&&!rules?'<p class="notice" dir="ltr">Chapter text · Not written yet. Press Edit to begin.</p>':''}
        <hr class="chapter-story-divider" aria-hidden="true"><article id="chronicles-entry-body" class="prose" lang="${book.language}" dir="${book.language==='en'?'ltr':'rtl'}" contenteditable="false">${clean(c.body)}</article>
        ${chapterBottomControls({rules,previous:list.indexOf(c)>0,next:list.indexOf(c)<list.length-1})}
        ${notesShell()}
      </section></div><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    fillWriting(c.writing_meta);
    const settings=$('#chapter-writing-settings');
    settings.oninput=backup;
    settings.querySelectorAll('[data-writing-variant]').forEach(button=>button.onclick=()=>{
      $('#chapter-style-variant').value=button.dataset.writingVariant;
      backup();
    });
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
    const printChapter=$('#chronicles-print');if(printChapter)printChapter.onclick=()=>window.print();
    const sizeKey=bookReading?'chronicles-english-book-size':'chronicles-size';
    let readingSize=Number(storage.get(sizeKey))||(bookReading?16:17);
    const size=()=>{$('#chronicles-entry-body').style.fontSize=readingSize+'px';storage.set?.(sizeKey,String(readingSize));};size();
    if(bookReading){
      const paragraphs=[...$('#chronicles-entry-body').children];
      for(const node of paragraphs){
        if(node.tagName!=='P')continue;
        if(node.textContent.trim()==='⁂')node.classList.add('reading-scene-break');
        if(/^voice memo\b/i.test(node.firstElementChild?.textContent||'')&&node.querySelector('br'))node.classList.add('reading-voice-memo');
        if(/^sam['’]s (?:call )?sheet\b/i.test(node.firstElementChild?.textContent||'')&&node.nextElementSibling?.tagName==='OL')node.classList.add('reading-call-sheet');
      }
    }
    $('#extra-smaller').onclick=()=>{readingSize=Math.max(16,readingSize-1);size()};$('#extra-larger').onclick=()=>{readingSize=Math.min(30,readingSize+1);size()};
    if(!rules){
      bindParts();
      $('#edit-chapter-name').onclick=editChapterName;
      $('#picker-add-chapter').onclick=()=>{if(editing){say('Save or cancel chapter edits first.',true);return;}showCreateChapter();};
      $('#extra-chapter-select').onchange=e=>navigate(link(book.id)+'&chapter='+e.target.value);
      $('#extra-prev').onclick=()=>{const prev=list[list.indexOf(c)-1];if(prev)navigate(entryLink(prev))};
      $('#extra-next').onclick=()=>{const next=list[list.indexOf(c)+1];if(next)navigate(entryLink(next))};
      $('#extra-export').onclick=()=>showExport(c);
      if(!bookReading){
        $('#extra-add-chapter').onclick=showCreateChapter;
        $('#extra-print-all').onclick=()=>printEntries(chapterList());
      }
    }


    const saved=storage.get(draftKey(c.id));let d;
    try{d=saved?JSON.parse(saved):null}catch{}
    if(d&&d.title!==undefined){
      $('#chronicles-save-warning').innerHTML='<div class="notice">An unsaved draft is available on this device. <button id="chronicles-recover">Recover draft</button><button id="chronicles-discard">Discard draft</button></div>';
      $('#chronicles-recover').onclick=()=>{beginEdit(d);if(d.revision!==c.revision)say('The saved version changed after this draft. Review it before saving.',true)};
      $('#chronicles-discard').onclick=()=>{if(confirm('Discard this local draft?')){storage.remove(draftKey(c.id));$('#chronicles-save-warning').innerHTML=''}};
    }
    
    mountChapterNotes(document.querySelector('[data-note-panel]'),{api,esc,getWriter,chapter:c,language:book.language,bookURL:link(book.id)}).catch(e=>say(e.message,true));workflow.mount({...c,language:book.language},'extra',book.title,()=>editing);const technical=$('.reading-details');if(technical){technical.open=false;$('.editor-area').append(technical);}
  }
  async function renderExportPage(briefOnly=false){
    $('#main').innerHTML=header()+'<p>Loading export…</p>';
    const [rows,branches]=await Promise.all([api('chronicles_book_entries?book_id=eq.'+book.id+'&kind=eq.chapter&select=*&order=chapter_number.asc'),api('chronicles_dsl_branches?book_id=eq.'+(book.id===REVIEW_BOOK?IBN_BOOK:book.id)+'&archived=eq.false&select=id,name,data,revision,updated_at&order=updated_at.desc')]);
    $('#main').innerHTML=header()+`<style>.book-navigation .ink-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.book-navigation .ink-tabs a{min-width:0;font-size:13px;padding:8px}.book-navigation .ink-tabs a.garden-entrance{order:3}.book-navigation .ink-tabs a:nth-child(1){order:1}.book-navigation .ink-tabs a:nth-child(2){order:2}.book-navigation .ink-tabs a:nth-child(3){order:4}.book-navigation .ink-tabs a:nth-child(4){order:5}.book-navigation .ink-tabs a:nth-child(5){order:6}.book-export-page{width:100%;max-width:760px;min-width:0;margin:auto;padding:16px;box-sizing:border-box}.book-export-page form,.book-export-page label,.book-export-page span{min-width:0;max-width:100%;box-sizing:border-box}.book-export-page select{display:block;width:100%;max-width:100%;min-width:0;font-size:16px;text-overflow:ellipsis}.book-export-page input[type=checkbox]{width:18px;min-width:18px;flex:0 0 18px}.book-export-page button{font-size:13px;min-height:38px;padding:8px 12px}.handoff-actions{display:flex;flex-wrap:wrap;gap:8px}.handoff-actions button{flex:0 1 auto;max-width:100%;white-space:normal}.book-export-page small{font-size:12px}.book-export-page h1{font-size:28px}.book-export-page p{font-size:14px}.book-export-page dl{overflow-wrap:anywhere}.book-export-page dd{margin-inline:12px}.book-export-page iframe{box-sizing:border-box;max-width:100%}.synopsis-reading{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;font-size:17px;margin:16px 0}</style><section class="reference-page book-export-page"><h1>${briefOnly?'Story Brief':'Export'}</h1><p>${briefOnly?'Saved synopsis, written chapter summaries, proposed events and open decisions':'One HTML file for a new author or Claude'}</p><div class="handoff-actions"><button type="button" id="read-export-synopsis">Read Story Brief</button><button type="button" id="full-story-package">Full Story Package</button><button type="button" id="copy-story-brief">Copy Brief</button></div><p>Full Story Package creates one HTML file from saved chapters and planning. On iPhone, use Open file, then Share → Save to Files.</p><details><summary>Story Brief guide</summary><p>A complete brief covers the opening, setting, character motives and relationships, cause and effect, parts and timeline, intended ending, written versus planned events, approved decisions and open questions. Each book keeps its own brief and writing rules.</p></details><section id="export-synopsis-reading" hidden dir="${book.language==='ar'?'rtl':'ltr'}"><h2>Story Brief</h2><div class="synopsis-reading"></div></section><form id="book-export-form"><label>Planning version<select name="branch">${branches.map((b,i)=>`<option value="${i}">${esc(b.name||'Planning')}</option>`).join('')}</select></label>${[['synopsis','Story Brief','الحكاية كاملة من البداية إلى النهاية'],['storyline','Storyline','الأحداث والأجزاء وتسلسل الزمن'],['chapters','Chapters','النص الكامل للفصول'],['characters','Characters','الشخصيات والعلاقات'],['rules','Writing rules','قواعد الكتاب والأسلوب']].map(([id,label,ar])=>`<label style="display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0"><input type="checkbox" name="${id}" checked><span>${label}</span></label>`).join('')}<label>Chapters<select name="scope"><option value="all">All</option><option value="selected">Select</option></select></label><div id="export-chapter-selection" hidden>${rows.map(r=>`<label style="display:block"><input type="checkbox" name="chapter" value="${r.id}" checked> ${r.chapter_number} · ${esc(r.title)}</label>`).join('')}</div><p>Exports saved chapter titles and text. Planning drafts remain labelled as drafts.</p><div style="display:flex;gap:8px;margin:16px 0"><button class="primary" type="submit">Download HTML</button><button type="button" id="preview-book-export">Preview</button></div></form><p id="export-message" role="status"></p><div id="export-file-links" class="handoff-actions"></div><iframe id="book-export-preview" title="Export preview" sandbox="" hidden style="width:100%;height:65vh;border:1px solid var(--line)"></iframe></section>`;
    const briefText=savedStoryBrief;
    const form=$('#book-export-form');const requestedBranch=new URLSearchParams(location.hash.slice(1)).get('dslbranch');if(requestedBranch){const i=branches.findIndex(b=>b.id===requestedBranch);if(i<0)throw Error('Selected planning path is unavailable. Reopen Story before exporting.');form.elements.branch.value=String(i);}const showSynopsis=()=>{const data=branches[Number(form.elements.branch.value)||0]?.data||{};$('#export-synopsis-reading .synopsis-reading').textContent=briefText(data);$('#export-synopsis-reading').hidden=false;};$('#read-export-synopsis').onclick=showSynopsis;$('#copy-story-brief').onclick=async()=>{showSynopsis();try{await navigator.clipboard.writeText($('#export-synopsis-reading .synopsis-reading').textContent);$('#copy-story-brief').textContent='Copied';}catch{say('Copy unavailable. Use Full Story Package to download HTML.',true);}};form.elements.branch.onchange=()=>{if(!$('#export-synopsis-reading').hidden)showSynopsis();};form.elements.scope.onchange=()=>$('#export-chapter-selection').hidden=form.elements.scope.value==='all';
    const documentHTML=()=>{const f=new FormData(form),data=currentPlanning(branches[Number(f.get('branch'))||0]?.data||{}),story=data.storyDraft||data.currentStory||{},chosen=f.get('scope')==='all'?rows:rows.filter(r=>f.getAll('chapter').includes(r.id));
      if(!['synopsis','storyline','chapters','characters','rules'].some(k=>f.has(k)))throw Error('Choose at least one section.');if(f.has('chapters')&&rows.length&&!chosen.length)throw Error('Choose at least one chapter.');
      const text=t=>handoffText(t,esc),section=(id,title,body)=>'<section id="'+id+'"><h2>'+title+'</h2>'+body+'</section>',missing='<p>Not recorded in this planning version.</p>';let out='';
      if(f.has('synopsis'))out+=section('synopsis','Story Brief',text(briefText(data)));
      if(f.has('storyline'))out+=section('storyline','Storyline',(story.treatment?text(story.treatment):missing)+text(story.parts||[])+(story.chapters||[]).map((c,i)=>'<h3>'+esc(c.title||String(i+1))+'</h3>'+text(c.summary||'')+text(c.points||[])+(c.developmentStatus==='excluded-needs-redesign'?'<p><strong>This chapter is excluded and needs redesign. Review the current notes and decisions.</strong></p>':'')).join('')+'<h3>Events</h3>'+text(data.events||[]));
      if(f.has('characters'))out+=section('characters','Characters',text(data.characters||[])+text(data.relationships||[])+section('places','Places',text(data.places||[]))+section('decisions','Current decisions',text(data.decisions||[]))+section('work-status','Pending implementation',text(data.workStatus||{})));
      if(f.has('rules'))out+=section('rules','Writing rules',data.storyBrief?.styleGuide?text(data.storyBrief.styleGuide):(data.rules?text(data.rules):missing));
      if(f.has('chapters')&&!rows.length)out+=section('chapter-status','Chapter status','<p>No chapters drafted. Planning only.</p>');
      if(f.has('chapters'))out+=section('chapters','Chapters',chosen.map(r=>'<article dir="'+(book.language==='ar'?'rtl':'ltr')+'" lang="'+book.language+'"><h3>'+r.chapter_number+' · '+esc(r.title)+'</h3>'+clean(r.body)+'</article>').join(''));
      const exportedAt=new Date().toISOString(),source=branches[Number(f.get('branch'))||0]||{};
      return '<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(book.title)+'</title><style>'+handoffCSS+'</style></head><body><h1 dir="auto">'+esc(book.title)+'</h1><nav>'+[['synopsis','Story Brief'],['storyline','Storyline'],['chapters','Chapters'],['characters','Characters'],['rules','Writing Rules']].filter(([k])=>f.has(k)).map(([k,label])=>'<a href="#'+k+'">'+label+'</a>').join('')+'</nav><p>Planning: '+esc(data.storyDraft?'Draft for review':'Saved planning')+'. Chapter text is exported separately from planning summaries.</p>'+out+technicalPanel('<p>Exported '+esc(exportedAt)+' · UTC</p><p>Planning source: '+esc(revisionStamp(source))+'</p>'+(f.has('chapters')?chosen.map(r=>'<p><bdi>'+esc(r.title)+'</bdi> · '+esc(r.updated_by||'Writer not recorded')+' · '+esc(revisionStamp(r))+'</p>').join(''):''))+'</body></html>';
    };
    $('#preview-book-export').onclick=()=>{try{const frame=$('#book-export-preview');frame.srcdoc=documentHTML();frame.hidden=false;$('#export-message').textContent='Preview ready.';}catch(e){$('#export-message').textContent=e.message;}};
    let exportURL=null;
    const prepareDownload=()=>{try{
      const html=documentHTML(),filename=book.title+'.html';
      const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
      if(exportURL)URL.revokeObjectURL(exportURL);exportURL=url;
      const links=$('#export-file-links');links.replaceChildren();
      const download=document.createElement('a');download.className='reference-link primary';download.href=url;download.download=filename;download.textContent='Download HTML';
      const open=document.createElement('a');open.className='reference-link';open.href=url;open.target='_blank';open.rel='noopener';open.textContent='Open file';
      links.append(download,open);
      $('#export-message').textContent='HTML file created. If no download appears, tap Download HTML or Open file. On iPhone: Share → Save to Files.';
      download.click();
    }catch(err){$('#export-message').textContent='Could not create file: '+err.message;}};
    $('#full-story-package').onclick=()=>{['synopsis','storyline','chapters','characters','rules'].forEach(k=>form.elements[k].checked=true);form.elements.scope.value='all';$('#export-chapter-selection').hidden=true;prepareDownload();};
    if(briefOnly){showSynopsis();form.hidden=true;$('#read-export-synopsis').hidden=true;}
    form.onsubmit=e=>{e.preventDefault();prepareDownload();};
  }
  function exportHTML(rows){const exportedAt=new Date().toISOString();return '<!doctype html><html lang="en" dir="ltr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(book.title)+'</title><style>'+handoffCSS+'article{break-before:page}</style><h1 dir="auto">'+esc(book.title)+'</h1>'+rows.map(c=>'<article lang="'+book.language+'" dir="'+(book.language==='ar'?'rtl':'ltr')+'"><h2>'+c.chapter_number+' · '+esc(c.title)+'</h2>'+clean(c.body)+'</article>').join('')+technicalPanel('<p>Book export v2 · Exported '+esc(exportedAt)+' · UTC</p>'+rows.map(c=>'<p>Chapter '+c.chapter_number+' · '+esc(revisionStamp(c))+' · '+esc(c.updated_by)+' · '+esc(writingLabel(c.writing_meta))+'</p>').join(''))+'</html>';}

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
    for(const node of $('#chronicles-entry-body').querySelectorAll('.reading-scene-break,.reading-voice-memo,.reading-call-sheet')){
      node.classList.remove('reading-scene-break','reading-voice-memo','reading-call-sheet');
      if(!node.className)node.removeAttribute('class');
    }
    const settings=$('#chapter-writing-settings');
    settings.disabled=false;settings.hidden=false;settings.closest('details').open=true;fillWriting(d?.writing_meta||active.writing_meta);
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
    if(keepPosition)$('#chapter-writing-method').focus({preventScroll:true});
    else $('#chronicles-entry-body').focus();
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
    const id=active.id,currentRevision=active.revision,language=book.language;
    modal('Revision History','<div data-chapter-history></div>');
    const root=$('[data-chapter-history]'),dialog=$('#modal');
    await mountChapterHistory({root,api,entryId:id,currentRevision,esc,clean,language,version,date,
      isCurrent:()=>active?.id===id&&dialog.open&&dialog.contains(root),
      onRestore:async saved=>{
        if(editing&&hasChanges()&&!confirm('Replace the current draft?'))return;
        if(editing){editing=false;renderEntry();}
        dialog.close();beginEdit(saved);backup();
        say('Restored as a draft. Save to create a new revision.');
      }});
  }
  async function loadNotes(id){
    const notes=await api('chronicles_book_notes?entry_id=eq.'+id+'&select=*&order=created_at.asc');
    if(active?.id!==id||!$('#chronicles-notes'))return;
    $('#chronicles-note-count').textContent='('+notes.length+')';
    $('#chronicles-notes').innerHTML=notes.map(n=>`<div class="note ${n.author==='Ahmed'?'ahmed':n.author==='Guest'?'guest':n.author==='Guest 2'?'guest2':'zee'}">
      <small><strong>${esc(n.author)}</strong> · ${date(n.created_at)}</small>${n.quote_text?`<blockquote dir="auto">${esc(n.quote_text)}</blockquote><small>Chapter revision when noted: ${n.source_revision||''}</small>`:''}<p dir="auto">${esc(n.body)}</p><button data-resolve-note="${n.id}">${n.resolved_at?'Reopen note':'Resolved'}</button>${n.resolved_at?`<small>Resolved by ${esc(n.resolved_by)} · ${date(n.resolved_at)}</small>`:''}
    </div>`).join('');
    document.querySelectorAll('[data-resolve-note]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const n=notes.find(n=>n.id===b.dataset.resolveNote);await saveNoteResolution(api,n,id,getWriter());await loadNotes(id);}catch(e){say(e.message,true);b.disabled=false;}});
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
  async function renderWithRetry(params){
    const requestHash=typeof location==='undefined'?null:location.hash;
    try{await render(params);}catch(error){
      if(requestHash!==null&&location.hash!==requestHash)return;
      const root=$('#main');root.querySelectorAll('.loading').forEach(x=>x.remove());root.querySelector('[data-load-error]')?.remove();
      const box=document.createElement('section');box.dataset.loadError='1';box.className='notice';box.setAttribute('role','alert');
      const text=document.createElement('p');text.textContent='Could not load this section. '+error.message;
      const retry=document.createElement('button');retry.textContent='Retry';
      retry.onclick=()=>{retry.disabled=true;renderWithRetry(params);};box.append(text,retry);root.prepend(box);
    }
  }
  return {load,isBookRoute,cards,illustratedCards,relatedLinks,showCreateModal,render:renderWithRetry,hasChanges,allowLeave,leave,backup};
}


