import {questionGroups} from './decision-state.js';
import {escapeHTML as h} from './dsl-engine.js';
import {activeRecord,stampPlanningChanges} from './current-book-brief.js';
import {savedStoryBrief} from './story-brief.js';
import {technicalPanel,revisionStamp} from './revision-stamp.js';
import {handoffCSS} from './handoff-format.js';
const fields=['summary','hypothesis','storyBrief','currentStory','storyDraft','characters','events','workshop'];
export function storySections(data={}){
 const groups=questionGroups(data);
 return {summary:typeof data.summary==='string'?data.summary:'',full:savedStoryBrief(data),
 chapters:(data.storyDraft?.chapters||data.currentStory?.chapters||[]).filter(activeRecord),
 characters:(data.characters||[]).filter(activeRecord),
 open:groups.open,pending:groups.pending,
 deferred:groups.deferred,needsReview:!!data.workshop?.synopsisNeedsReview};
}
export function selectedStoryText(data,view='short'){
 const s=storySections(data);
 if(view==='full')return s.full||'No full synopsis saved yet.';
 if(view==='chapters')return s.chapters.map((c,i)=>['Chapter '+(i+1)+' · '+(c.title||''),c.summary,...(c.points||[])].filter(Boolean).join('\n')).join('\n\n')||'No chapter outline recorded.';
 return s.summary||'No concise story summary saved yet.';
}
export function storyViewHTML(data,view,{title,language,branch},at=new Date().toISOString()){
 const s=storySections(data),label=({short:'Short synopsis',full:'Full synopsis',chapters:'Chapter plan'})[view]||'Short synopsis';
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Story · '+h(title)+'</title><style>'+handoffCSS+'</style><body><h1 dir="auto">'+h(title)+'</h1><p>'+label+' · Story planning, not saved manuscript</p><div dir="'+(language==='ar'?'rtl':'ltr')+'" style="white-space:pre-wrap">'+h(selectedStoryText(data,view))+'</div><details><summary>Pending decisions</summary>'+[...s.open,...s.pending].map(q=>'<p dir="auto">'+h(q.title||q.prompt||'Question')+' · '+h(q.status||'open')+'</p>').join('')+'</details>'+technicalPanel('<p>Planning source '+h(branch?.id||'unavailable')+' · '+h(revisionStamp(branch||{}))+'</p><p>Exported '+h(at)+' · UTC</p><p>Source revision and export time are separate. Planning may contain unresolved proposals.</p>')+'</body></html>';
}
export async function renderStoryWorkspace(main,api,{bookId,title,language='ar',root,branchId,extraLinks=''}){
 const hash=location.hash,host=document.createElement('section');host.className='story-workspace reference-page';host.dir='ltr';main.replaceChildren(host);
 const current=()=>host.isConnected&&location.hash===hash;
 host.innerHTML='<p role="status">Loading story…</p>';
 let branch,data,dirty=false,busy=false,selectedView='short';
 const writer=()=>document.querySelector('[data-writer][aria-pressed=true]')?.dataset.writer||'Benji';
 const key=()=> 'chronicles-story-summary:'+bookId+':'+branch?.id;
 const guard=e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}};
 const leave=e=>{if((dirty||busy)&&e.target.closest?.('a[href]')&&!e.target.closest('a').hasAttribute('download')&&(busy||!confirm('Leave this story? Your unsaved summary stays on this device.'))){e.preventDefault();e.stopImmediatePropagation();}};
 window.addEventListener('beforeunload',guard);window.addEventListener('click',leave,true);
 let fileURL;const observer=new MutationObserver(()=>{if(!host.isConnected){window.removeEventListener('beforeunload',guard);window.removeEventListener('click',leave,true);if(fileURL)URL.revokeObjectURL(fileURL);observer.disconnect();}});observer.observe(main,{childList:true});
 try{
 const scope='book_id=eq.'+encodeURIComponent(bookId),selected=await api('chronicles_dsl_branches?'+scope+'&archived=eq.false'+(branchId?'&id=eq.'+encodeURIComponent(branchId):'')+'&select=id,book_id,name,revision,updated_at,updated_by&order=updated_at.asc&limit=1');
 if(!current())return;branch=selected[0];
 if(branchId&&!branch)throw Error('Selected planning path is unavailable.');
 if(branch){const rows=await api('chronicles_dsl_branches?'+scope+'&id=eq.'+branch.id+'&revision=eq.'+branch.revision+'&select='+fields.map(k=>k+':data->'+k).join(',')+'&limit=1');if(!rows[0])throw Error('Planning changed. Reopen Story.');data=rows[0].data||rows[0];}else data={};
 if(!current())return;render();
 }catch(e){if(!current())return;host.innerHTML='<p role="alert">Story could not load.</p><button data-retry>Retry</button><details><summary>Technical details</summary><p>'+h(e.message)+'</p></details>';host.querySelector('[data-retry]').onclick=()=>renderStoryWorkspace(main,api,{bookId,title,language,root,branchId,extraLinks});}
 function render(){
 const s=storySections(data),route=(view,extra='')=>root+'&view='+view+(branch?'&dslbranch='+branch.id:'')+extra;
 host.innerHTML='<h1>Story</h1><h2 dir="auto">'+h(title)+'</h2><label>Story planning view<select data-story-view><option value="short">Short synopsis</option><option value="full">Full synopsis</option><option value="chapters">Chapter plan</option></select></label><p class="muted">Planning content. Saved manuscript remains in Chapters.</p><div class="story-actions"><button data-edit '+(!branch?'disabled':'')+'>Edit</button><button data-copy>Copy</button><details class="story-export"><summary>Export</summary><button data-export>Story brief</button><a href="'+route('export')+'">Full story package</a></details></div><div data-summary dir="'+(language==='ar'?'rtl':'ltr')+'">'+h(selectedStoryText(data,selectedView))+'</div><div data-editor hidden></div>'+(s.needsReview?'<p class="story-status">Story planning needs review. Saved chapters are unchanged.</p>':'')+
 '<details data-full-planning><summary>Full synopsis and planning notes</summary><div class="story-text" dir="auto">'+h(s.full)+'</div><a href="'+route('dsl','&dslview=synopsis')+'">Review synopsis</a></details>'+
 '<details data-chapter-planning><summary>Chapter plan ('+s.chapters.length+')</summary>'+s.chapters.map((c,i)=>'<details><summary dir="auto">'+h(c.title||'Chapter '+(i+1))+'</summary><div class="story-text" dir="auto">'+h([c.summary,...(c.points||[])].filter(Boolean).join('\n'))+'</div></details>').join('')+(!s.chapters.length?'<p>No chapter outline recorded.</p>':'')+'<p>Planning summaries are separate from saved chapter text.</p></details>'+
 '<details><summary>Characters ('+s.characters.length+')</summary><div class="story-actions">'+s.characters.map(c=>'<a dir="auto" href="'+route('dsl','&dslview=characters&focuskind=character&focusid='+encodeURIComponent(c.id))+'">'+h(c.name)+'</a>').join('')+'</div></details>'+
 '<details><summary>Pending decisions ('+(s.open.length+s.pending.length)+')</summary>'+[...s.open,...s.pending].map(q=>'<p><a dir="auto" href="'+route('dsl','&dslview=decisions&focuskind=question&focusid='+encodeURIComponent(q.id))+'">'+h(q.title||q.prompt||'Open question')+'</a> · '+h(q.status||'open')+'</p>').join('')+(!s.open.length&&!s.pending.length?'<p>No pending question recorded.</p>':'')+'<a href="'+route('dsl','&dslview=decisions')+'">All decisions'+(s.deferred.length?' · '+s.deferred.length+' deferred':'')+'</a></details>'+
 '<details><summary>Help and resources</summary><p>Edit updates the concise story summary only. Full planning, chapter text and author decisions remain separate. Export uses the version displayed here.</p>'+extraLinks+'<a href="'+route('dsl','&dslview=history')+'">History</a></details><p data-status role="status"></p>'+technicalPanel('<p>'+h(revisionStamp(branch||{}))+'</p>');
 const q=x=>host.querySelector(x),text=()=>selectedStoryText(data,selectedView);
 const chooseView=()=>{q('[data-story-view]').value=selectedView;q('[data-summary]').textContent=text();q('[data-edit]').disabled=!branch||selectedView!=='short';q('[data-full-planning]').hidden=selectedView==='full';q('[data-chapter-planning]').hidden=selectedView==='chapters';};chooseView();
 q('[data-story-view]').onchange=ev=>{if(dirty||busy){ev.target.value=selectedView;q('[data-status]').textContent='Save or cancel the summary before changing views.';return;}selectedView=ev.target.value;chooseView();};
 q('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(text());q('[data-status]').textContent='Copied.';}catch{q('[data-status]').textContent='Copy unavailable. Use Export.';}};
 q('[data-export]').onclick=()=>{if(fileURL)URL.revokeObjectURL(fileURL);const html=storyViewHTML(data,selectedView,{title,language,branch});fileURL=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=fileURL;a.download='Story_'+selectedView+'_v001.html';a.textContent='Download HTML';const open=document.createElement('a');open.href=fileURL;open.target='_blank';open.rel='noopener';open.textContent='Open file';q('[data-status]').replaceChildren(a,document.createTextNode(' · '),open);a.click();};
 q('[data-edit]').onclick=()=>{q('[data-editor]').hidden=false;q('[data-summary]').hidden=true;q('[data-editor]').innerHTML='<form><label>Concise story summary<textarea name="summary" dir="auto" rows="6" required maxlength="16000"></textarea></label><button type="submit">Save</button><button type="button" data-cancel>Cancel</button></form>';const f=q('form');f.elements.summary.value=s.summary;
 try{const saved=JSON.parse(localStorage.getItem(key())||'null');if(saved){f.elements.summary.value=saved.text;dirty=true;q('[data-status]').textContent=saved.revision===branch.revision?'Recovered your unsaved summary.':'An older local summary was recovered. Compare it with the current story before saving.';}}catch{}
 f.oninput=()=>{dirty=true;try{localStorage.setItem(key(),JSON.stringify({text:f.elements.summary.value,revision:branch.revision}));}catch{q('[data-status]').textContent='Device backup unavailable. Keep this editor open.';}};
 q('[data-cancel]').onclick=()=>{if(dirty&&!confirm('Discard this unsaved summary?'))return;dirty=false;try{localStorage.removeItem(key());}catch{}render();};
 f.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const buttons=f.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{const rows=await api('chronicles_dsl_branches?book_id=eq.'+bookId+'&id=eq.'+branch.id+'&revision=eq.'+branch.revision+'&select=data,revision&limit=1');if(!rows[0])throw Error('Planning changed on another device. Your draft is preserved. Reopen Story and compare before saving.');const base=rows[0].data,next=structuredClone(base);next.summary=f.elements.summary.value;next.workshop={...next.workshop,synopsisNeedsReview:true};const stamped=stampPlanningChanges(base,next,{writer:writer(),revision:branch.revision,note:'Edit concise story summary',bookId,branchId:branch.id});const saved=await api('chronicles_dsl_branches?book_id=eq.'+bookId+'&id=eq.'+branch.id+'&revision=eq.'+branch.revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data:stamped,updated_by:writer(),change_note:'Edit concise story summary'})});if(!saved[0])throw Error('Planning changed on another device. Your draft is preserved.');branch=saved[0];data=branch.data;dirty=false;try{localStorage.removeItem(key());}catch{}if(current()){render();q('[data-status]').textContent='Summary saved for review. Chapter text unchanged.';}}catch(error){if(current())q('[data-status]').textContent=error.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);}};
 };
 }
}
