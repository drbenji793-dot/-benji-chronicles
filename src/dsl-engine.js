// Pure DSL logic: no database writes, AI calls, or manuscript mutations.
export const clone = value => JSON.parse(JSON.stringify(value));
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const TYPES = {event:'Event',decision:'Decision',twist:'Twist or reveal',ending:'Ending'};
export const STATES = {written:'In written draft',proposal:'Proposed',accepted:'Approved plan',question:'Open question'};
export const RELATIONS = {causes:'Causes',requires:'Sets up',reveals:'Reveals',object:'Transfers evidence',echo:'Connects eras',contradicts:'Contradicts'};
export function blankStory(title='قصة جديدة') {return {schema:1,title,summary:'',rules:'كل فصل يبدأ بالمكان والتاريخ. أي تغيير هنا لا يعيد كتابة الفصول.',events:[],links:[],objects:[]};}
export function activeEvents(data) {return (data?.events || []).filter(e => !e.archived);}
export function orderEvents(data, mode='reading') {
 return activeEvents(data).slice().sort((a,b) => mode==='reading' ? (Number(a.order)||0)-(Number(b.order)||0) : (a.year==null?999999:Number(a.year))-(b.year==null?999999:Number(b.year)) || String(a.date?.length===7?a.date+'-99':a.date||'9999').localeCompare(String(b.date?.length===7?b.date+'-99':b.date||'9999')) || (Number(a.order)||0)-(Number(b.order)||0));
}
export function validDay(value) {if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value;}
export function validateStory(data, chapters=[]) {
 const issues=[];const events=activeEvents(data),byId=new Map(events.map(e=>[e.id,e]));
 if(!data.summary?.trim())issues.push({kind:'warning',text:'Story summary is empty. Add an opening paragraph for your collaborator.'});
 const allIds=(data.events||[]).map(e=>e.id);if(new Set(allIds).size!==allIds.length)issues.push({kind:'error',text:'Duplicate event identifiers.'});
 const orders=new Map();
 for(const e of events){
  if(!e.title?.trim())issues.push({kind:'error',id:e.id,text:'Event title is missing.'});
  if(e.precision==='day'&&!validDay(e.date))issues.push({kind:'error',id:e.id,text:e.title+': invalid calendar date.'});
  if(e.precision==='day'&&validDay(e.date)&&Number(e.date.slice(0,4))!==Number(e.year))issues.push({kind:'error',id:e.id,text:e.title+': event year does not match the date.'});
  if(e.precision!=='day')issues.push({kind:'warning',id:e.id,text:e.title+': exact day is not set. No date is invented.'});
  if(!e.summary?.trim())issues.push({kind:'warning',id:e.id,text:e.title+': event description is empty.'});
  if(orders.has(e.order))issues.push({kind:'warning',id:e.id,text:e.title+': shares its reading order with another event.'});orders.set(e.order,e.id);
  if(e.sourceId){const c=chapters.find(c=>c.id===e.sourceId);if(!c)issues.push({kind:'warning',id:e.id,text:e.title+': linked chapter is missing from the current data.'});else if(c.revision!==e.sourceRevision)issues.push({kind:'warning',id:e.id,text:e.title+': linked chapter changed after import. Compare the text before updating.'});}
  if(e.type==='twist'&&!e.truth?.trim())issues.push({kind:'warning',id:e.id,text:e.title+': define the hidden truth and setup before approving the twist.'});
 }
 for(const l of data.links||[]){const a=byId.get(l.from),b=byId.get(l.to);if(!a||!b){issues.push({kind:'error',text:'Connection points to an unavailable event: '+(l.label||l.id)});continue;}
  if(l.from===l.to)issues.push({kind:'error',id:a.id,text:'A connection needs two different events.'});
  if(['causes','requires'].includes(l.kind)&&!l.crossTime&&a.precision==='day'&&b.precision==='day'&&validDay(a.date)&&validDay(b.date)&&a.date>b.date)issues.push({kind:'warning',id:b.id,text:'Cause is dated after its result: '+a.title+' ← '+b.title+'. Record intentional time travel when relevant.'});
 }
 return issues;
}
function semanticEvent(e){const c={...e};delete c.updatedAt;delete c.updatedBy;delete c.comments;return JSON.stringify(c);}
export function compareStories(before,after){
 const a=new Map((before?.events||[]).map(e=>[e.id,e])),b=new Map((after?.events||[]).map(e=>[e.id,e]));
 const added=[],changed=[],removed=[];
 for(const [id,e]of b){if(!a.has(id))added.push(e);else if(semanticEvent(a.get(id))!==semanticEvent(e))changed.push({before:a.get(id),after:e});}
 for(const [id,e]of a)if(!b.has(id))removed.push(e);
 const metadata=['title','summary','rules','hypothesis','objects','links','characters','foundation','world','decisions','blender'].filter(k=>JSON.stringify(before?.[k])!==JSON.stringify(after?.[k]));
 return {added,changed,removed,metadata};
}
export function impactedEvents(data,ids){
 const seen=new Set(ids),queue=[...ids];
 while(queue.length){const id=queue.shift();for(const l of data.links||[])if(l.from===id&&!seen.has(l.to)){seen.add(l.to);queue.push(l.to);}}
 return activeEvents(data).filter(e=>seen.has(e.id));
}
export function impactBetween(before,after){const d=compareStories(before,after);const roots=[...d.added.map(e=>e.id),...d.changed.map(e=>e.after.id),...d.removed.map(e=>e.id)];
 const links=new Map([...(before?.links||[]),...(after?.links||[])].map(l=>[l.id,l]));if(d.metadata.includes('links'))for(const l of links.values()){roots.push(l.from,l.to);}
 if(d.metadata.includes('objects'))for(const o of [...(before?.objects||[]),...(after?.objects||[])])roots.push(...(o.eventIds||[]));if(d.metadata.includes('rules'))roots.push(...activeEvents(after).map(e=>e.id));return impactedEvents({...after,links:[...links.values()]},roots);
}
export function readableStory(data,bookId,chapterLink=n=>'#book='+encodeURIComponent(bookId)+'&chapter='+Number(n)){
 const h=escapeHTML;const rows=orderEvents(data);return '<section class="dsl-readable"><h2>'+h(data.title||'Story')+'</h2><h3>Full story synopsis</h3><div class="dsl-synopsis-text" dir="auto">'+String(data.summary||'').split(/\n\s*\n/).map(p=>'<p>'+h(p)+'</p>').join('')+'</div><details class="dsl-event-breakdown"><summary>Event breakdown · '+rows.length+' events</summary>'+rows.map(e=>'<article><div class="dsl-meta">'+h(e.dateLabel||'Date needs clarification')+' · '+h(STATES[e.status]||e.status)+'</div><h3>'+h(e.title)+'</h3><p>'+h(e.summary)+'</p>'+(e.outcome?'<p><strong>Outcome:</strong> '+h(e.outcome)+'</p>':'')+(e.sourceChapter?'<a href="'+h(chapterLink(e.sourceChapter))+'">Chapter '+Number(e.sourceChapter)+'</a>':'<small>Planning event with no written chapter linked</small>')+'</article>').join('')+'</details></section>';
}
export function aiBrief(data,meta={}){return 'DSL · ملف عمل للكاتب المساعد\n'+JSON.stringify({purpose:'راجع المنطق واقترح تعديلات فقط. لا تعتبر المقترحات حقائق معتمدة، ولا تعد كتابة الفصول دون موافقة.',...meta,story:data},null,2);}
export function safeFilename(title){return String(title||'DSL').replace(/[^\p{L}\p{N}_ ]/gu,'').slice(0,70)||'DSL';}
