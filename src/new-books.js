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
    return '<section class="chronicles-extra-books" aria-label="كتب إضافية"><h2>كتبنا الجديدة</h2><div class="chronicles-books-grid">'
      +books.map(b=>`<a class="chronicles-new-card" href="#book=${esc(b.id)}">
        <div class="chronicles-new-cover">
          <span class="chronicles-book-label">BENJI CHRONICLES · NEW BOOK</span>
          <strong dir="auto">${esc(b.title)}</strong>
          <small>${b.collaboration==='shared'?'حكاية مشتركة':'رواية مستقلة'}</small>
        </div>
        <div class="chronicles-new-info"><strong dir="auto">${esc(b.title)}</strong>
          <p dir="auto">${esc(b.description||'مساحة جديدة للكتابة والمغامرات.')}</p>
          <small><span class="${b.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(b.primary_writer)}</span> · كتاب بالعربية</small>
          <span class="chronicles-new-open">افتح الكتاب ↖</span>
        </div>
      </a>`).join('')+'</div></section>';
  }

  function modal(title,html){
    const dialog=$('#modal');
    dialog.dir='rtl';
    $('#modal-title').textContent=title;
    $('#modal-content').innerHTML=html;
    if(!dialog.open)dialog.showModal();
  }
  function showCreateModal(){
    const selected=getWriter()==='Ahmed'?'Ahmed':'Benji';
    modal('＋ كتاب جديد · New Book',`<form id="chronicles-create-book" class="chronicles-book-form">
      <label>اسم الكتاب<input name="title" maxlength="160" required dir="auto" placeholder="اسم الرواية الجديدة"></label>
      <label>اسم الكاتب الأساسي<select name="writer" required><option value="Benji" ${selected==='Benji'?'selected':''}>Benji · بنجي</option><option value="Ahmed" ${selected==='Ahmed'?'selected':''}>Ahmed · أحمد</option></select></label>
      <label>نوع الكتاب<select name="collaboration"><option value="shared">كتابة مشتركة · Benji & Ahmed</option><option value="solo">كتاب مستقل</option></select></label>
      <label>فكرة الكتاب (اختياري)<textarea name="description" rows="3" maxlength="2000" dir="auto"></textarea></label>
      <p class="reference-note">كل الكتب هنا بالعربية. القواعد العامة ثابتة، وكل كتاب جديد له صفحة قواعد مستقلة وفصول وسجل نسخ خاص به.</p>
      <button class="primary" type="submit">＋ إنشاء الكتاب</button>
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
        if(!b?.id)throw Error('لم يتم تأكيد إنشاء الكتاب.');
        await load();
        $('#modal').close();
        say('تم إنشاء الكتاب. قواعده الخاصة جاهزة للتحرير.');
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
    if(status)status.textContent='مسودة لم تُحفظ';
  }
  function allowLeave(){
    if(busy){say('جارٍ الحفظ، لا تغلق الصفحة الآن.',true);return false}
    if(!hasChanges())return true;
    backup();
    return confirm('تسيب الصفحة؟ تعديلاتك غير المحفوظة هتفضل محفوظة على الجهاز ده.');
  }
  function leave(){editing=false;active=null;}

  async function render(params){
    const id=params.get('book');
    if(!uuid.test(id))throw Error('رابط الكتاب غير صالح.');
    book=books.find(b=>b.id===id);
    if(!book){await load();book=books.find(b=>b.id===id);}
    if(!book)throw Error('الكتاب غير موجود.');
    const loaded=await api('chronicles_book_entries?book_id=eq.'+id+'&select=*&order=chapter_number.asc.nullslast');
    entries=loaded;
    const rules=params.get('rules')==='1';
    const no=Number(params.get('chapter'));
    if(rules||params.has('chapter')){
      active=rules?entries.find(e=>e.kind==='rules'):entries.find(e=>e.kind==='chapter'&&e.chapter_number===no);
      if(!active)throw Error('الصفحة المطلوبة غير موجودة.');
      editing=false;
      renderEntry();
    }else{active=null;editing=false;renderOverview();}
  }

  function header(){
    return `<nav class="crumb" dir="rtl"><a href="#">المكتبة</a><span>/</span><a href="${link(book.id)}" dir="auto">${esc(book.title)}</a></nav>`;
  }
  function renderOverview(){
    const list=chapterList();
    $('#main').innerHTML=header()+`<section class="reference-page chronicles-book-home" dir="rtl">
      <div class="eyebrow">BENJI CHRONICLES · كتاب مستقل</div>
      <h1 dir="auto">${esc(book.title)}</h1>
      <p class="reference-intro" dir="auto">${esc(book.description||'مساحة لكتابة حكاية جديدة.')}</p>
      <p class="reference-note">الكاتب الأساسي: <strong class="${book.primary_writer==='Ahmed'?'chronicles-writer-ahmed':'chronicles-writer-benji'}">${esc(book.primary_writer)}</strong>
         · ${book.collaboration==='shared'?'مساحة كتابة مشتركة':'كتاب مستقل'} · العربية</p>
      <div class="chronicles-book-actions">
        <button id="chronicles-add-chapter" class="primary">＋ فصل جديد</button>
        <a href="${link(book.id)}&rules=1" class="reference-link">قواعد هذا الكتاب</a>
        <a href="#writing-rules" class="reference-link">القواعد العامة · _zkalam4</a>
      </div>
      <h2>فصول الكتاب <small>(${list.length})</small></h2>
      ${list.length?'<div class="chronicles-chapter-cards">'+list.map(c=>`<a class="chronicles-chapter-card" href="${entryLink(c)}">
         <strong>الفصل ${c.chapter_number} · <span dir="auto">${esc(c.title)}</span></strong>
         <small>نسخة ${c.revision} · ${esc(c.updated_by)} · ${date(c.updated_at)}</small>
       </a>`).join('')+'</div>':'<div class="guide-card"><p>الكتاب جديد، ولسه مفيش فصول. ابدأ الفصل الأول من الزر فوق.</p></div>'}
    </section><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    $('#chronicles-add-chapter').onclick=showCreateChapter;
  }
  function showCreateChapter(){
    const next=Math.max(0,...chapterList().map(c=>c.chapter_number))+1;
    modal('＋ فصل جديد',`<form id="chronicles-create-chapter" class="chronicles-book-form">
      <label>رقم الفصل<input name="number" type="number" min="1" max="999" value="${next}" required></label>
      <label>عنوان الفصل<input name="title" required maxlength="200" dir="auto" value="الفصل ${next}"></label>
      <p class="reference-note">سيُضاف الفصل لهذا الكتاب فقط. تقدر تبدأ الكتابة مباشرة بعد إنشائه.</p>
      <button class="primary" type="submit">إنشاء الفصل</button>
    </form>`);
    const form=$('#chronicles-create-chapter');
    form.onsubmit=async event=>{
      event.preventDefault();
      const f=new FormData(form),b=form.querySelector('button[type=submit]');b.disabled=true;
      try{
        const number=Number(f.get('number')),title=String(f.get('title')||'').trim();
        if(!Number.isInteger(number)||number<1||number>999||!title)throw Error('راجع رقم الفصل وعنوانه.');
        const rows=await api('chronicles_book_entries',{
          method:'POST',headers:{Prefer:'return=representation'},
          body:JSON.stringify({book_id:book.id,kind:'chapter',chapter_number:number,title,body:'',updated_by:getWriter()})
        });
        if(!rows?.[0]?.id)throw Error('لم نتمكن من إنشاء الفصل.');
        $('#modal').close();
        await navigate(link(book.id)+'&chapter='+number);
        if(active?.id===rows[0].id)beginEdit();
      }catch(err){say(err.message,true)}finally{b.disabled=false}
    };
  }

  function renderEntry(){
    if(!active)return;
    const c=active,list=chapterList(),rules=c.kind==='rules';
    const selected=rules?'قواعد الكتاب':'الفصل '+c.chapter_number;
    $('#main').innerHTML=header()+`<div class="workspace chronicles-workspace">
      <aside class="sidebar" dir="rtl">
        <h2>${esc(book.title)}</h2>
        <div class="chapter-list">
          <a class="chapter-link ${rules?'active':''}" href="${link(book.id)}&rules=1">قواعد الكتاب</a>
          ${list.map(x=>`<a class="chapter-link ${x.id===c.id?'active':''}" href="${entryLink(x)}">${x.chapter_number} · ${esc(x.title)}</a>`).join('')}
        </div>
        <a class="reference-link" href="${link(book.id)}">كل الفصول</a>
      </aside>
      <section class="editor-area" dir="rtl">
        <div class="eyebrow">${esc(selected)} · ${rules?'Book Rules':'Chapter'}</div>
        <div class="chronicles-book-actions">
          <a class="reference-link" href="${link(book.id)}">فهرس الكتاب</a>
          <a class="reference-link" href="#writing-rules">القواعد العامة</a>
          <a class="reference-link" href="${link(book.id)}&rules=1">قواعد هذا الكتاب</a>
        </div>
        ${rules?'<p class="reference-note">القواعد العامة مشتركة. قواعد هذا الكتاب تخصه وحده، ولا تغير الفصول المحفوظة تلقائيًا.</p>':''}
        <div class="toolbar">
          <button id="chronicles-edit">تعديل</button>
          <button id="chronicles-save" class="primary" disabled>حفظ</button>
          <button id="chronicles-cancel" hidden>إلغاء</button>
          <span class="protected" id="chronicles-entry-status">محمي</span>
          <button id="chronicles-copy">نسخ</button>
          <button id="chronicles-history">المساهمات والنسخ</button>
          <button id="chronicles-print">طباعة</button>
        </div>
        <div id="chronicles-save-warning"></div>
        <div class="eyebrow">${esc(book.title)} · ${esc(selected)}</div>
        <h1 class="chapter-title" id="chronicles-reading-title" dir="auto">${esc(c.title)}</h1>
        <input id="chronicles-entry-title" class="chapter-title-input" maxlength="200" dir="auto" hidden>
        <div class="save-meta">نسخة ${c.revision} · <span class="${writerLabel(c)}">${esc(c.updated_by)}</span> · ${date(c.updated_at)}</div>
        ${!c.body.trim()&&!rules?'<p class="notice">الفصل لسه فاضي. اضغط تعديل وابدأ الكتابة.</p>':''}
        <article id="chronicles-entry-body" class="prose" lang="ar" dir="rtl" contenteditable="false">${clean(c.body)}</article>
        <details class="notes"><summary>ملاحظات الكتابة <span id="chronicles-note-count"></span></summary>
          <div id="chronicles-notes"></div>
          <textarea id="chronicles-note-body" rows="3" dir="auto" placeholder="ملاحظة أو فكرة نرجعلها..."></textarea>
          <button class="primary" id="chronicles-add-note">أضف ملاحظة</button>
        </details>
      </section></div><footer>Benji Chronicles · Benji &amp; Almostasherq</footer>`;
    $('#chronicles-edit').onclick=()=>beginEdit();
    $('#chronicles-save').onclick=save;
    $('#chronicles-cancel').onclick=cancel;
    $('#chronicles-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#chronicles-reading-title').textContent+'\n\n'+$('#chronicles-entry-body').innerText);say('اتنسخ النص.')}catch{say('اختار النص وانسخه يدويًا.',true)}};
    $('#chronicles-history').onclick=()=>showHistory().catch(e=>say(e.message,true));
    $('#chronicles-print').onclick=()=>window.print();
    $('#chronicles-add-note').onclick=addNote;
    const saved=storage.get(draftKey(c.id));let d;
    try{d=saved?JSON.parse(saved):null}catch{}
    if(d&&d.title!==undefined){
      $('#chronicles-save-warning').innerHTML='<div class="notice">في مسودة غير محفوظة على الجهاز ده. <button id="chronicles-recover">استرجاع المسودة</button><button id="chronicles-discard">حذف المسودة</button></div>';
      $('#chronicles-recover').onclick=()=>{beginEdit(d);if(d.revision!==c.revision)say('نسخة الكتاب اتغيرت بعد المسودة دي. راجع التغييرات الأول.',true)};
      $('#chronicles-discard').onclick=()=>{if(confirm('تمسح المسودة من الجهاز؟')){storage.remove(draftKey(c.id));$('#chronicles-save-warning').innerHTML=''}};
    }
    loadNotes(c.id).catch(e=>say(e.message,true));workflow.mount({...c,language:'ar'},'extra',book.title,()=>editing);
  }
  function beginEdit(d){
    if(!active||editing)return;
    editing=true;
    $('#chronicles-edit').disabled=true;
    $('#chronicles-save').disabled=false;
    $('#chronicles-cancel').hidden=false;
    $('#chronicles-entry-status').textContent='تعديل';
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
    if(hasChanges()&&!confirm('تلغي التعديلات غير المحفوظة؟'))return;
    editing=false;storage.remove(draftKey(active.id));renderEntry();
  }
  async function save(){
    if(!editing||busy||!active)return;
    const title=$('#chronicles-entry-title').value.trim(),body=clean($('#chronicles-entry-body').innerHTML),plain=$('#chronicles-entry-body').textContent.trim();
    if(!title||!plain){say('اكتب عنوان ومحتوى قبل الحفظ.',true);return}
    backup();busy=true;$('#chronicles-save').disabled=true;$('#chronicles-entry-body').contentEditable='false';
    try{
      const rows=await api('chronicles_book_entries?id=eq.'+active.id+'&revision=eq.'+active.revision,{
        method:'PATCH',headers:{Prefer:'return=representation'},
        body:JSON.stringify({title,body,updated_by:getWriter()})
      });
      if(!rows?.length){
        say('نسخة أحدث اتحفظت من حد تاني. المسودة المحلية موجودة، راجع أحدث نسخة قبل الحفظ.',true);
        $('#chronicles-save-warning').innerHTML='<div class="notice">في نسخة أحدث اتحفظت. مسودتك موجودة على الجهاز. انسخها أو افتح أحدث نسخة للمراجعة.</div>';
        return;
      }
      active=rows[0];entries=entries.map(x=>x.id===active.id?active:x);
      storage.remove(draftKey(active.id));editing=false;renderEntry();
      say('اتحفظ. النسخة السابقة محفوظة في السجل.');
    }catch(err){say('الحفظ ما اكتملش. المسودة محفوظة على جهازك. '+err.message,true)}
    finally{busy=false;if(editing&&$('#chronicles-save')){$('#chronicles-save').disabled=false;$('#chronicles-entry-body').contentEditable='true'}}
  }
  async function showHistory(){
    if(!active)return;
    const id=active.id;
    modal('المساهمات وسجل النسخ','<div class="loading">بنحمّل سجل النسخ…</div>');
    const versions=await api('chronicles_book_versions?entry_id=eq.'+id+'&select=*&order=revision.desc&limit=1000');
    if(active?.id!==id)return;
    $('#modal-content').innerHTML='<p class="reference-note">النسخ محفوظة بوقتها واسم الكاتب. استرجاع نسخة قديمة يبدأ مسودة جديدة ولا يحذف أي نسخة أحدث.</p>'
      +versions.map((v,i)=>`<div class="version">
        <strong>نسخة ${v.revision} ${i===0?'· الحالية':''}</strong>
        <small class="${writerLabel({updated_by:v.saved_by})}">${esc(v.saved_by)} · ${date(v.saved_at)}</small>
        <button data-new-version="${i}">قراءة</button>
        ${i>0?`<button data-new-restore="${i}">استخدم كمسودة</button>`:''}
      </div>`).join('')+'<div id="chronicles-version-preview"></div>';
    document.querySelectorAll('[data-new-version]').forEach(b=>b.onclick=()=>{
      const v=versions[Number(b.dataset.newVersion)];
      $('#chronicles-version-preview').innerHTML=`<div class="preview" dir="rtl"><h2 dir="auto">${esc(v.title)}</h2><article class="prose">${clean(v.body)}</article></div>`;
    });
    document.querySelectorAll('[data-new-restore]').forEach(b=>b.onclick=()=>{
      if(editing&&hasChanges()&&!confirm('تستبدل المسودة الحالية؟'))return;
      if(editing){editing=false;renderEntry();}
      $('#modal').close();
      beginEdit(versions[Number(b.dataset.newRestore)]);
      backup();
      say('اترجعت نسخة قديمة كمسودة. اضغط حفظ لإنشاء نسخة جديدة.');
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
      say('اتضافت الملاحظة.');
    }catch(e){say(e.message,true)}finally{if($('#chronicles-add-note'))$('#chronicles-add-note').disabled=false}
  }
  return {load,isBookRoute,cards,showCreateModal,render,hasChanges,allowLeave,leave,backup};
}

