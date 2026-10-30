export function createWorkflow({api,esc,clean,storage,say,date,getWriter,getIndex,refresh,diffHTML,supplements}) {
 const $=s=>document.querySelector(s);let controls=[];
 const rpc=(name,data)=>api('rpc/'+name,{method:'POST',body:JSON.stringify(data)});
 const keyOf=(c,kind)=>kind==='main'?(c.language==='en'?'adaptation:'+(c.story_number||12):(c.story_number||12)===12?'main':'story:'+c.story_number):c.book_id;
 const routeOf=(c,kind)=>kind==='main'?`#story=${c.story_number||12}&lang=${c.language}&chapter=${c.chapter_number}`:`#book=${c.book_id}${c.kind==='rules'?'&rules=1':'&chapter='+c.chapter_number}`;
 const text=html=>{const d=document.createElement('div');d.innerHTML=clean(html);return d.textContent};
 const show=(title,body)=>{const d=$('#modal');$('#modal-title').textContent=title;$('#modal-content').innerHTML=body;d.dir='ltr';if(!d.open)d.showModal();return d};
 async function settings(){controls=await api('chronicles_book_controls?select=*');return controls;}
 async function setBook(key,changes){await api('chronicles_book_controls?on_conflict=book_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({book_key:key,...changes})});await settings();}
 async function checkBook(key){await settings();if(!controls.find(c=>c.book_key===key)?.deleted_at)return true;$('#main').innerHTML='<section class="reference-page"><h1>This book is in Trash</h1><p>Your chapters and history are preserved.</p><a href="#">Return to Library to restore it</a></section>';return false;}
 async function remove(key,title){
 show('Delete Book',`<p>Move <strong>${esc(title)}</strong> to Trash?</p><p>Chapters and history will be kept. You can restore this book later. This does not delete its copy in Benji Ink.</p><div class="workflow-actions"><button id="delete-cancel">Cancel</button><button id="delete-continue">Continue</button></div>`);
 $('#delete-cancel').onclick=()=>$('#modal').close();
 $('#delete-continue').onclick=()=>{show('Confirm Delete Book',`<p>Book: <strong>${esc(title)}</strong></p><label>Type <strong>delete</strong> to confirm (any capitalization)<input id="delete-word" autocomplete="off" spellcheck="false" aria-label="Type DELETE"></label><div class="workflow-actions"><button id="delete-cancel">Cancel</button><button id="delete-final" class="danger" disabled>Delete Book</button></div>`);$('#delete-cancel').onclick=()=>$('#modal').close();$('#delete-word').oninput=()=>$('#delete-final').disabled=$('#delete-word').value.trim().toUpperCase()!=='DELETE';$('#delete-final').onclick=async()=>{if($('#delete-word').value.trim().toUpperCase()!=='DELETE')return;$('#delete-final').disabled=true;try{await setBook(key,{deleted_at:new Date().toISOString()});$('#modal').close();await refresh();say('Book moved to Trash. You can restore it.')}catch(e){say(e.message,true);$('#delete-final').disabled=false}};};
 }
 async function rename(key,title){show('Rename book',`<form id="rename-form"><label>Book title<input name="title" value="${esc(title)}" required maxlength="160"></label><button type="submit">Save name</button></form>`);$('#rename-form').onsubmit=async e=>{e.preventDefault();const title=new FormData(e.target).get('title').trim();if(!title)return;try{await setBook(key,{title});$('#modal').close();await refresh()}catch(e){say(e.message,true)}};}
 async function shelf(){
 const shelf=$('#main .shelf');if(!shelf)return;
 try{await settings();if(!shelf.isConnected)return;
 const cards=[...shelf.querySelectorAll('a.story-card,a.chronicles-new-card')];
 for(const card of cards){const params=new URLSearchParams(card.hash.slice(1));const key=params.get('book')||(params.get('lang')==='en'?'adaptation:'+(Number(params.get('story'))||12):(params.has('story')&&Number(params.get('story'))!==12?'story:'+Number(params.get('story')):'main'));const s=controls.find(x=>x.book_key===key);if(s?.deleted_at){card.remove();continue;}const heading=card.querySelector('.card-body h2,.chronicles-new-info>strong,.full-book-cover .collection-cover-title h2');const original=heading?.textContent||'Book';const title=s?.title||original;if(heading)heading.textContent=title;card.setAttribute('aria-label','Open '+title);
 const wrap=document.createElement('div');wrap.className='managed-book';card.before(wrap);wrap.append(card);const actions=document.createElement('div');actions.className='book-manage';actions.innerHTML=`<details><summary aria-label="Book menu">⋯</summary><button class="rename-book">Rename</button></details><button class="danger delete-book">Delete Book</button>`;wrap.append(actions);actions.querySelector('.rename-book').onclick=()=>rename(key,title);actions.querySelector('.delete-book').onclick=()=>remove(key,title);}
 const bar=document.createElement('div');bar.className='workflow-actions library-workflow';bar.innerHTML='<button id="resume-work">Continue last edited chapter</button><button id="open-trash">Trash</button>';bar.dir='ltr';shelf.append(bar);$('#open-trash').onclick=trash;
 const main=getIndex().filter(c=>!shelf.dataset.edition||c.language===shelf.dataset.edition).map(c=>({...c,source_kind:'main'}));const extra=await api('chronicles_book_entries?select=id,book_id,kind,chapter_number,title,revision,updated_at,updated_by&order=updated_at.desc&limit=50');if(!bar.isConnected)return;
 const books=await api('chronicles_books?select=id,language');const recent=[...main,...extra.map(c=>({...c,language:books.find(b=>b.id===c.book_id)?.language||'ar',source_kind:'extra'})).filter(c=>!shelf.dataset.edition||c.language===shelf.dataset.edition)].filter(c=>!controls.find(s=>s.book_key===keyOf(c,c.source_kind))?.deleted_at).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0];
 if(recent){$('#resume-work').textContent=`Continue: ${recent.language==='en'?'English':'Arabic'} · ${recent.kind==='rules'?'Book Rules':'Chapter '+recent.chapter_number} · ${recent.updated_by} · ${date(recent.updated_at)}`;$('#resume-work').onclick=()=>{location.hash=routeOf(recent,recent.source_kind)}}else $('#resume-work').disabled=true;
 }catch(e){say('Book controls could not load: '+e.message,true)}
 }
 async function trash(){await settings();const books=await api('chronicles_books?select=id,title');const removed=controls.filter(x=>x.deleted_at);show('Trash',removed.length?removed.map(x=>`<div class="version"><strong>${esc(x.title||books.find(b=>b.id===x.book_key)?.title||(x.book_key.startsWith('adaptation:')?'American Adaptation '+x.book_key.slice(11):x.book_key.startsWith('story:')?'Story '+x.book_key.slice(6):'شرخ زمني'))}</strong><small>${date(x.deleted_at)}</small><button data-restore-book="${esc(x.book_key)}">Restore book</button></div>`).join(''):'<p>Trash is empty.</p>');document.querySelectorAll('[data-restore-book]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await setBook(b.dataset.restoreBook,{deleted_at:null});$('#modal').close();await refresh();say('Book restored with its chapters and history.')}catch(e){say(e.message,true);b.disabled=false}});}
 async function mount(c,kind,title,isEditing){
 const version=n=>kind==='extra'?'v'+(Number(n||1)+100):String(n);const reviewEdition=c.book_id==='c911584d-bd5b-42fe-b41c-a2a456c64d41';const area=$('#main .editor-area');if(!area)return;const customTitle=controls.find(x=>x.book_key===keyOf(c,kind))?.title;if(customTitle){title=customTitle;document.querySelectorAll('#main>.crumb strong,.workspace-heading h2').forEach(el=>el.textContent=customTitle);}area.querySelector('.workflow-panel')?.remove();const panel=document.createElement('section');panel.className='workflow-panel';panel.dir='ltr';let details=area.querySelector('.reading-details');if(!details){details=document.createElement('details');details.className='reading-details';details.dir=c.language==='ar'?'rtl':'ltr';const summary=document.createElement('summary');summary.textContent='Save and review details';summary.lang='en';summary.dir='ltr';details.append(summary);const meta=area.querySelector('.save-meta');(meta||area.querySelector('.toolbar')).after(details);if(meta)details.append(meta);}details.append(panel);const chapterLinks=area.querySelector('.chapter-links');if(chapterLinks)details.append(chapterLinks);
 panel.innerHTML=`<p class="workflow-status" aria-live="polite">Loading approval status…</p><div class="workflow-actions"><button data-wf="review">Review Chapter</button><button data-wf="approve" disabled>Approve Chapter</button><button data-wf="transfer" disabled>Update Ink</button></div>`;
 if(reviewEdition){details.open=false;panel.querySelector('[data-wf=approve]').hidden=true;panel.querySelector('[data-wf=transfer]').hidden=true;const button=document.createElement('button');button.dataset.wf='approve-send';button.textContent='اعتماد وإرسال إلى Ink';panel.querySelector('.workflow-actions').append(button);button.onclick=()=>combinedApproval().catch(e=>say(e.message,true));}
 if(kind==='extra'){
   details.open=false;
   const tools=document.createElement('div');tools.className='workflow-actions review-extra-tools';tools.setAttribute('aria-label','History and export tools');
   for(const id of ['chronicles-history','chronicles-print','extra-export','extra-print-all','extra-add-chapter']){const button=area.querySelector('#'+id);if(button)tools.append(button);}
   details.append(tools);
   const management=area.querySelector('.part-management');if(management){const more=document.createElement('details');more.innerHTML='<summary>Part setup and history</summary>';more.append(management);details.append(more);}
   const nav=document.createElement('nav');nav.className='workflow-actions review-workspace-links';nav.setAttribute('aria-label','Planning and rules');
   document.querySelectorAll('.book-navigation .ink-tabs a').forEach(a=>nav.append(a.cloneNode(true)));
   const rules=document.createElement('a');rules.href='#book='+c.book_id+'&rules=1';rules.textContent='Book Rules';nav.append(rules);
   const hq=document.createElement('a');hq.href='https://benji-hq.dr-z01.chatgpt.site/#rules';hq.textContent='HQ · Writing styles and rules';nav.append(hq);details.append(nav);
   const technical=document.createElement('details');technical.innerHTML='<summary>Technical record</summary><p>Chapter version '+esc(version(c.revision))+' · Internal revision '+esc(c.revision)+'</p><p>Entry: '+esc(c.id)+'</p><p>Saved UTC: '+esc(c.updated_at)+'</p><p>Chapter versions start at 101. The style guide has its own version.</p>';
   details.append(technical);
 }
 const guard=()=>{if(isEditing()){say('Save or cancel your edits first. Review and approval use the saved revision.',true);return false}return true};let w;
 async function status(){
 const rows=await api('chronicles_workflow?source_id=eq.'+c.id+'&select=*');if(!panel.isConnected)return;w=rows[0];
 let approved=w?.approved_revision===c.revision;
 let originalChanged=false;if(kind==='main'&&c.language==='en'&&w){const fingerprint=await rpc('chronicles_original_snapshot',{p_story:c.story_number||12});originalChanged=w.original_snapshot!==fingerprint;approved=approved&&!originalChanged;}
 const synced=w?.transferred_revision===c.revision;
 let label=approved?`Approved revision ${version(c.revision)} · ${w.approved_by} · ${date(w.approved_at)}`:'Approve this chapter first.';
 if(originalChanged)label+=' · Original updated · Review adaptation.';
 if(synced)label+=` · This revision is in Ink · Revision ${version(w.transferred_revision)} · ${date(w.transferred_at)}`;
 else if(approved)label+=' · Ready to update this chapter in Ink.';
 if(!approved&&w?.transferred_at&&!synced)label+=` · Last sent to Ink: revision ${version(w.transferred_revision)} · ${date(w.transferred_at)}`;
 if(!panel.isConnected)return;
 panel.querySelector('.workflow-status').textContent=label;
 const approve=panel.querySelector('[data-wf=approve]');approve.disabled=approved;approve.textContent=approved?'Approved':c.kind==='rules'?'Approve Rules':'Approve Chapter';
 panel.querySelector('[data-wf=review]').textContent=c.kind==='rules'?'Review Rules':'Review Chapter';
 panel.querySelector('[data-wf=transfer]').disabled=!approved||synced;
 if(reviewEdition){const button=panel.querySelector('[data-wf=approve-send]');button.disabled=synced;button.textContent=synced?'نُقلت النسخة إلى Ink':'اعتماد وإرسال إلى Ink';}
 }

 async function combinedApproval(){
  if(!guard())return;if(getWriter()!=='Benji'){say('الاعتماد والإرسال لبنجي. أحمد والضيف يقدروا يحفظوا مسودات.',true);return;}
  const latest=(await api('chronicles_book_entries?id=eq.'+c.id+'&select=*'))[0];if(latest?.revision!==c.revision)throw Error('الفصل اتغير. افتح أحدث نسخة قبل الاعتماد.');
  await status();const map=(await api('chronicles_book_controls?book_key=eq.'+c.book_id+'&select=ink_book_id'))[0];
  const target=(await api('ink_entries?book_id=eq.'+map.ink_book_id+'&source_meta->>chronicles_source_id=eq.'+c.id+'&select=*'))[0];
  const words=t=>(String(t||'').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)||[]).length;
  const oldText=w?.approved_body?text(w.approved_body):'',newText=text(c.body);
  show('مراجعة واعتماد الفصل',`<div dir="rtl"><p>${esc(c.title)} · نسخة Chronicles ${version(c.revision)} · ${words(newText)} كلمة · فرق ${words(newText)-words(oldText)} كلمة عن آخر اعتماد</p><p>سيُسجل اعتماد Benji ووقته، وتُنقل هذه النسخة إلى الصياغة الجديدة في Ink. الأصول محفوظة.</p>${w?diffHTML(oldText,newText):clean(c.body)}${target&&w?.ink_revision&&target.revision!==w.ink_revision?'<p class="notice">نسخة Ink تغيرت منذ النقل السابق. راجع المقارنة أدناه.</p>':''}<details><summary>المقارنة مع Ink</summary>${diffHTML(text(target?.body||''),newText)}</details><label><input type="checkbox" id="reviewed-send"> راجعت النص وأوافق على اعتماده وإرساله</label><button id="confirm-approve-send" disabled>تأكيد الاعتماد والإرسال</button><p id="approve-send-status" role="status"></p></div>`);
  $('#reviewed-send').onchange=e=>$('#confirm-approve-send').disabled=!e.target.checked;
  $('#confirm-approve-send').onclick=async()=>{const b=$('#confirm-approve-send');b.disabled=true;try{await rpc('chronicles_approve_and_transfer',{p_id:c.id,p_revision:c.revision,p_expected_ink_revision:target?.revision||0,p_writer:getWriter()});const saved=(await api('chronicles_workflow?source_id=eq.'+c.id+'&select=*'))[0];const ink=(await api('ink_entries?id=eq.'+saved.ink_entry_id+'&select=*'))[0];if(ink?.body!==c.body||ink.title!==c.title)throw Error('لم يتأكد تطابق النص. أعد فحص الحالة.');$('#modal').close();await status();say('تم الاعتماد والنقل والتحقق من تطابق النص في Ink.');}catch(e){$('#approve-send-status').textContent=e.message;b.disabled=false;}};
 }
 panel.querySelector('[data-wf=review]').onclick=async()=>{if(!guard())return;try{await status();show('Review saved version '+version(c.revision),w?`<p>Changes since approved revision ${version(w.approved_revision)}. Current editor: ${esc(c.updated_by)}.</p><h3>Title</h3>${diffHTML(w.approved_title,c.title)}<h3>Text</h3><div dir="${c.language==='en'?'ltr':'rtl'}">${diffHTML(text(w.approved_body),text(c.body))}</div>`:`<p>No approved baseline yet. Review this saved chapter before approving it.</p><h3>${esc(c.title)}</h3><article class="prose" lang="${c.language}" dir="${c.language==='en'?'ltr':'rtl'}">${clean(c.body)}</article>`)}catch(e){say(e.message,true)}};
 panel.querySelector('[data-wf=approve]').onclick=()=>{if(!guard())return;if(getWriter()!=='Benji'){say('Choose Benji to approve this chapter. Ahmed and Guest can save edits.',true);return;}show('Approve this revision',`<p>${esc(title)} · ${c.language==='en'?'English':'Arabic'} · ${c.kind==='rules'?'Book Rules':'Chapter '+c.chapter_number} · Revision ${version(c.revision)}</p><p>Approval will be recorded as ${esc(getWriter())}. Later edits will need a new approval.</p><button id="confirm-approval">Approve revision ${version(c.revision)}</button>`);$('#confirm-approval').onclick=async()=>{const b=$('#confirm-approval');b.disabled=true;try{await rpc('chronicles_approve',{p_id:c.id,p_kind:kind,p_revision:c.revision,p_writer:getWriter()});$('#modal').close();await status();say('Revision approved. Ink has not been changed.')}catch(e){say(e.message,true);b.disabled=false}}};
 panel.querySelector('[data-wf=transfer]').onclick=()=>{if(getWriter()!=='Benji'){say('Choose Benji to transfer an approved chapter.',true);return;}if(guard())transfer(c,kind,status).catch(e=>say(e.message,true))};await status().catch(e=>{if(panel.isConnected)panel.querySelector('.workflow-status').textContent='Status unavailable: '+e.message});
 }
 async function transfer(c,kind,after){
 const version=n=>kind==='extra'?'v'+(Number(n||1)+100):String(n);
 const table=kind==='main'?'chronicles_chapters':'chronicles_book_entries';
 const current=(await api(table+'?id=eq.'+c.id+'&select=*'))[0];
 if(!current||current.revision!==c.revision)throw Error('This chapter changed. Reopen it and approve the latest revision.');
 const w=(await api('chronicles_workflow?source_id=eq.'+c.id+'&select=*'))[0];
 if(w?.approved_revision!==c.revision)throw Error('Approve this chapter first.');
 if(w.transferred_revision===c.revision){await after();return;}
 const id=w.ink_entry_id||c.source_entry_id;
 const target=id?(await api('ink_entries?id=eq.'+id+'&select=*'))[0]:null;
 const changed=!!target&&(text(target.body)!==text(c.body)||target.title!==c.title);
 const label=`${c.language==='en'?'English':'Arabic'} ${c.kind==='rules'?'Book Rules':'Chapter '+c.chapter_number}`;
 show('Update this chapter in Benji Ink',`<p>Update <strong>${esc(label)}</strong> in Benji Ink with approved revision <strong>${version(c.revision)}</strong>?</p><p>Only this chapter and language will change. The previous Ink version remains in History. No other chapters or supporting material will be included.</p><form id="transfer-form">${changed?`<details open><summary>Compare with current Ink version</summary><h3>Title</h3>${diffHTML(target.title,c.title)}<h3>Text</h3><div dir="${c.language==='en'?'ltr':'rtl'}">${diffHTML(text(target.body),text(c.body))}</div></details><label><input type="checkbox" name="accept"> I reviewed the differences and want this approved version in Ink.</label>`:''}<div class="workflow-actions"><button type="button" id="transfer-cancel">Cancel</button><button type="submit" class="primary">Confirm Update Ink</button></div><p id="transfer-error" role="alert"></p></form>`);
 $('#transfer-cancel').onclick=()=>$('#modal').close();
 $('#transfer-form').onsubmit=async e=>{e.preventDefault();const f=e.target,error=$('#transfer-error');if(changed&&!f.elements.accept.checked){error.textContent='Review and confirm the differences first.';return;}
 const button=f.querySelector('[type=submit]');button.disabled=true;error.textContent='Updating this chapter…';try{
 await rpc('chronicles_transfer',{p_writer:getWriter(),p_items:[{id:c.id,revision:c.revision,expected_ink_revision:target?.revision||0}],p_supplements:[]});
 $('#modal').close();await after();say(label+' updated in Benji Ink. Ink is up to date.');
 }catch(err){error.textContent=err.message;button.disabled=false}};
 }

 return {mount,shelf,checkBook};
}

