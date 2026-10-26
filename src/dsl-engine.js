// Pure DSL logic: no database writes, AI calls, or manuscript mutations.
export const clone = value => JSON.parse(JSON.stringify(value));
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const TYPES = {event:'حدث',decision:'قرار',twist:'كشف أو مفاجأة',ending:'نهاية'};
export const STATES = {written:'موجود في المسودة',proposal:'مقترح',accepted:'معتمد في التخطيط',question:'سؤال مفتوح'};
export const RELATIONS = {causes:'يسبب',requires:'يمهّد لـ',reveals:'يكشف',object:'ينقل دليلًا',echo:'يربط زمنين',contradicts:'يتعارض مع'};
export function blankStory(title='قصة جديدة') {return {schema:1,title,summary:'',rules:'كل فصل يبدأ بالمكان والتاريخ. أي تغيير هنا لا يعيد كتابة الفصول.',events:[],links:[],objects:[]};}
export function activeEvents(data) {return (data?.events || []).filter(e => !e.archived);}
export function orderEvents(data, mode='reading') {
 return activeEvents(data).slice().sort((a,b) => mode==='reading' ? (Number(a.order)||0)-(Number(b.order)||0) : (a.year==null?999999:Number(a.year))-(b.year==null?999999:Number(b.year)) || String(a.date?.length===7?a.date+'-99':a.date||'9999').localeCompare(String(b.date?.length===7?b.date+'-99':b.date||'9999')) || (Number(a.order)||0)-(Number(b.order)||0));
}
export function validDay(value) {if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value;}
export function validateStory(data, chapters=[]) {
 const issues=[];const events=activeEvents(data),byId=new Map(events.map(e=>[e.id,e]));
 if(!data.summary?.trim())issues.push({kind:'warning',text:'ملخص القصة فارغ. أضف فقرة يستطيع شريك الكتابة البدء منها.'});
 const allIds=(data.events||[]).map(e=>e.id);if(new Set(allIds).size!==allIds.length)issues.push({kind:'error',text:'معرّفات أحداث مكررة.'});
 const orders=new Map();
 for(const e of events){
  if(!e.title?.trim())issues.push({kind:'error',id:e.id,text:'حدث بلا عنوان.'});
  if(e.precision==='day'&&!validDay(e.date))issues.push({kind:'error',id:e.id,text:e.title+': تاريخ اليوم غير صالح.'});
  if(e.precision==='day'&&validDay(e.date)&&Number(e.date.slice(0,4))!==Number(e.year))issues.push({kind:'error',id:e.id,text:e.title+': سنة الحدث لا تطابق تاريخ اليوم.'});
  if(e.precision!=='day')issues.push({kind:'warning',id:e.id,text:e.title+': اليوم الكامل غير محدد. لا نضع تاريخًا افتراضيًا.'});
  if(!e.summary?.trim())issues.push({kind:'warning',id:e.id,text:e.title+': وصف الحدث فارغ.'});
  if(orders.has(e.order))issues.push({kind:'warning',id:e.id,text:e.title+': يشترك في ترتيب القراءة مع حدث آخر.'});orders.set(e.order,e.id);
  if(e.sourceId){const c=chapters.find(c=>c.id===e.sourceId);if(!c)issues.push({kind:'warning',id:e.id,text:e.title+': الفصل المرتبط غير موجود في القراءة الحالية.'});else if(c.revision!==e.sourceRevision)issues.push({kind:'warning',id:e.id,text:e.title+': تغيّر الفصل منذ استيراد الحدث. يلزم مقارنة النص، لا تحديث صامت.'});}
  if(e.type==='twist'&&!e.truth?.trim())issues.push({kind:'warning',id:e.id,text:e.title+': حدد الحقيقة المخفية والتمهيد قبل اعتماد المفاجأة.'});
 }
 for(const l of data.links||[]){const a=byId.get(l.from),b=byId.get(l.to);if(!a||!b){issues.push({kind:'error',text:'رابط يشير إلى حدث غير متاح: '+(l.label||l.id)});continue;}
  if(l.from===l.to)issues.push({kind:'error',id:a.id,text:'الرابط يحتاج حدثين مختلفين.'});
  if(['causes','requires'].includes(l.kind)&&!l.crossTime&&a.precision==='day'&&b.precision==='day'&&validDay(a.date)&&validDay(b.date)&&a.date>b.date)issues.push({kind:'warning',id:b.id,text:'سبب مؤرّخ بعد نتيجته: '+a.title+' ← '+b.title+'. وثّق العبور الزمني إن كان مقصودًا.'});
 }
 return issues;
}
function semanticEvent(e){const c={...e};delete c.updatedAt;delete c.updatedBy;delete c.comments;return JSON.stringify(c);}
export function compareStories(before,after){
 const a=new Map((before?.events||[]).map(e=>[e.id,e])),b=new Map((after?.events||[]).map(e=>[e.id,e]));
 const added=[],changed=[],removed=[];
 for(const [id,e]of b){if(!a.has(id))added.push(e);else if(semanticEvent(a.get(id))!==semanticEvent(e))changed.push({before:a.get(id),after:e});}
 for(const [id,e]of a)if(!b.has(id))removed.push(e);
 const metadata=['title','summary','rules','hypothesis','objects','links'].filter(k=>JSON.stringify(before?.[k])!==JSON.stringify(after?.[k]));
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
export function readableStory(data,bookId){
 const h=escapeHTML;const rows=orderEvents(data);return '<section class="dsl-readable"><h2>'+h(data.title||'القصة')+'</h2><p class="dsl-lead">'+h(data.summary)+'</p>'+rows.map(e=>'<article><div class="dsl-meta">'+h(e.dateLabel||'التاريخ يحتاج تحديدًا')+' · '+h(STATES[e.status]||e.status)+'</div><h3>'+h(e.title)+'</h3><p>'+h(e.summary)+'</p>'+(e.outcome?'<p><strong>النتيجة:</strong> '+h(e.outcome)+'</p>':'')+(e.sourceChapter?'<a href="#book='+encodeURIComponent(bookId)+'&chapter='+Number(e.sourceChapter)+'">الفصل '+Number(e.sourceChapter)+'</a>':'<small>حدث تخطيطي بلا فصل مكتوب مرتبط</small>')+'</article>').join('')+'</section>';
}
export function aiBrief(data,meta={}){return 'DSL · ملف عمل للكاتب المساعد\n'+JSON.stringify({purpose:'راجع المنطق واقترح تعديلات فقط. لا تعتبر المقترحات حقائق معتمدة، ولا تعد كتابة الفصول دون موافقة.',...meta,story:data},null,2);}
export function safeFilename(title){return String(title||'DSL').replace(/[^\p{L}\p{N}_ ]/gu,'').slice(0,70)||'DSL';}
