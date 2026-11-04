import {activeRecord} from './current-book-brief.js';
import {recordedNameCandidates} from './story-name-review.js';
import {escapeHTML as h} from './dsl-engine.js';

const kindMap={event:'events',events:'events',character:'characters',characters:'characters',question:'questions',questions:'questions',decision:'decisions',fact:'decisions'};
const records=(data,kind)=>kind==='questions'?data.workshop?.questions||[]:data[kind]||[];
const recordStatus=record=>{
 if(!record)return 'Source unavailable';
 if(!activeRecord(record))return 'Retired source';
 if(['approved','accepted','applied','resolved'].includes(record.status))return 'Approved planning';
 if(['proposal','proposed'].includes(record.status))return 'Proposal only';
 if(record.status==='conflict')return 'Conflict recorded';
 if(['open','deferred','question'].includes(record.status))return 'Unresolved choice';
 if(record.status==='written')return 'Written, planning approval unknown';
 return 'Approval unclassified';
};

export function reviewSourcePreflight(data={},chapters=[]){
 const currentChapters=new Map(chapters.filter(activeRecord).map(c=>[c.id,c]));
 const findings=(data.editorialFindings||[]).filter(activeRecord).map(f=>{
  const chapter=currentChapters.get(f.chapterId);
  const warnings=[];
  if(!chapter)warnings.push('Saved chapter metadata unavailable');
  else if(f.chapterRevision!==chapter.revision)warnings.push('Saved chapter revision changed');
  const links=(f.links||[]).map(link=>{
   const kind=kindMap[link.kind],record=records(data,kind).find(x=>x.id===link.id);
   const status=recordStatus(record);
   if(['Source unavailable','Retired source','Conflict recorded','Proposal only'].includes(status))warnings.push('Linked '+link.kind+' '+link.id+': '+status);
   return {kind:link.kind,id:link.id,label:record?.name||record?.title||link.id,status};
  });
  if(f.kind==='Research gap')warnings.push('Research claim needs independent verification');
  if(f.origin==='GPT self critique')warnings.push('Self critique is not independent validation');
  const names=recordedNameCandidates(data,f.quote,{linkedCharacterIds:links.filter(x=>kindMap[x.kind]==='characters').map(x=>x.id)});
  return {id:f.id,title:f.title||f.issue||f.id,status:f.status||'Unclassified',chapterId:f.chapterId||null,
   savedRevision:f.chapterRevision??null,currentRevision:chapter?.revision??null,warnings:[...new Set(warnings)],
   links,names};
 });
 const allEvents=data.events||[];
 const classified=allEvents.filter(activeRecord).map(e=>({id:e.id,title:e.title||e.id,status:recordStatus(e),type:e.type||'Unclassified',
  mystery:['clue','twist','secret'].includes(e.type),savedChapterId:e.sourceId||null,
  sourceState:e.sourceId&&!currentChapters.has(e.sourceId)?'Chapter source not in current review load':
   e.sourceId&&currentChapters.get(e.sourceId)?.revision!==e.sourceRevision?'Chapter source revision changed':'No chapter mismatch proven'}));
 const counts={approved:classified.filter(e=>e.status==='Approved planning').length,
  proposals:classified.filter(e=>e.status==='Proposal only').length,
  conflicts:classified.filter(e=>e.status==='Conflict recorded').length,
  unresolved:classified.filter(e=>e.status==='Unresolved choice').length,
  mysteries:classified.filter(e=>e.mystery).length,
  retired:allEvents.length-classified.length,
  findingWarnings:findings.filter(f=>f.warnings.length||f.names.length).length};
 return {counts,findings,events:classified};
}

export function reviewSourcePreflightHTML(audit){
 const c=audit.counts;
 return '<details data-review-source-preflight style="max-width:100%;overflow-wrap:anywhere"><summary>Current source checks ('+c.findingWarnings+' findings needing review)</summary>'+
  '<p>Read only planning metadata. Recorded approval does not prove literary accuracy. Missing setup or mystery timing can be intentional.</p>'+
  '<p>Approved planning '+c.approved+' · Proposals '+c.proposals+' · Conflicts '+c.conflicts+' · Unresolved '+c.unresolved+
  ' · Mystery or clue records '+c.mysteries+' · Retired '+c.retired+'</p>'+
  '<details><summary>Review finding sources ('+audit.findings.length+')</summary>'+
  audit.findings.map(f=>'<details><summary dir="auto">'+h(f.title)+' · '+h(f.status)+'</summary>'+
   '<p>Chapter '+h(f.chapterId||'Not recorded')+' · Finding source r'+h(f.savedRevision??'Unknown')+' · Current chapter r'+h(f.currentRevision??'Unavailable')+'</p>'+
   f.warnings.map(w=>'<p>'+h(w)+'</p>').join('')+
   f.links.map(link=>'<p dir="auto">'+h(link.kind)+' · '+h(link.label)+' · '+h(link.status)+'</p>').join('')+
   f.names.map(n=>'<p dir="auto">Recorded name candidate: '+h(n.matchedName)+' · Current card '+h(n.currentName)+' · '+h(n.review)+'</p>').join('')+
   (!f.warnings.length&&!f.names.length?'<p>No metadata warning identified; literary correctness is not verified.</p>':'')+'</details>').join('')+
  (!audit.findings.length?'<p>No structured findings saved.</p>':'')+'</details>'+
  '<details><summary>Event source classifications ('+audit.events.length+')</summary>'+
  audit.events.map(e=>'<p dir="auto">'+h(e.title)+' · '+h(e.type)+' · '+h(e.status)+
   (e.mystery?' · Intentional mystery not evaluated':'')+' · '+h(e.sourceState)+'</p>').join('')+
  (!audit.events.length?'<p>No recorded events in this planning path.</p>':'')+'</details>'+
  '<p>No chapter text or author decision is changed by this check.</p></details>';
}
