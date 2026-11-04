import {activeRecord} from './current-book-brief.js';
import {questionState,protectedDecision} from './question-lifecycle.js';
import {savedStoryBrief} from './story-brief.js';
import {sourceRecord,sourceDifferences} from './source-tools.js';
import {escapeHTML as h} from './dsl-engine.js';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function clueProposalImpact(data,proposal,chapters=[]){
 if(proposal?.kind!=='clue')throw Error('Select a current clue proposal.');
 const target=(data.events||[]).find(e=>e.id===proposal.targetId&&activeRecord(e));
 if(!target)throw Error('Clue source is unavailable. Reopen the current review.');
 const before=proposal.before||target;
 const after={...before,...structuredClone(proposal.values||{})};
 const changes=Object.entries(proposal.values||{}).filter(([key,value])=>!same(before[key],value))
  .map(([key,value])=>({key,before:before[key]??null,after:value}));
 const linkedEventIds=new Set([target.id]);
 for(const link of (data.links||[]).filter(activeRecord))if(link.from===target.id&&link.to)linkedEventIds.add(link.to);else if(link.to===target.id&&link.from)linkedEventIds.add(link.from);
 for(const event of (data.events||[]).filter(activeRecord)){
  if([event.setupEventId,event.reinforcementEventId,event.revealEventId,event.replacementEventId].includes(target.id)||
   (event.knowledgeRecords||[]).some(k=>k.factEventId===target.id))linkedEventIds.add(event.id);
 }
 const connectedEvents=(data.events||[]).filter(activeRecord).filter(e=>linkedEventIds.has(e.id))
  .map(e=>({id:e.id,title:e.title||e.id,revision:e.revision??null,status:e.status||'Unclassified',direct:e.id===target.id}));
 const charIds=new Set([...(before.characterIds||[]),...(after.characterIds||[]),
   ...(proposal.sources||[]).filter(s=>s.kind==='characters').map(s=>s.id)]);
 for(const r of after.requiredKnowledge||[])if(r.characterId!=='reader')charIds.add(r.characterId);
 const characters=(data.characters||[]).filter(activeRecord).filter(c=>charIds.has(c.id))
  .map(c=>({id:c.id,name:c.name||c.id,revision:c.revision??null,status:c.status||'Unclassified'}));
 const questions=(data.workshop?.questions||[]).filter(activeRecord)
  .filter(q=>(q.eventIds||[]).some(id=>linkedEventIds.has(id))||(q.characterIds||[]).some(id=>charIds.has(id)))
  .map(q=>({id:q.id,title:q.title||q.prompt||q.id,status:questionState(q),protected:protectedDecision(q),answer:q.answer||''}));
 const beforeBrief=savedStoryBrief(data);
 const next=structuredClone(data);
 const edit=next.events.find(e=>e.id===target.id);
 Object.assign(edit,structuredClone(proposal.values||{}));
 const afterBrief=savedStoryBrief(next);
 const evidenceIssues=sourceDifferences(data,proposal.sources||[],chapters)
  .map(e=>({kind:e.kind,id:e.id,reason:e.reason}));
 return {
  targetId:target.id,sourceRevision:proposal.baseRevision??null,proposalId:proposal.id||null,
  changes,events:connectedEvents,characters,questions,
  brief:{before:beforeBrief,after:afterBrief,changed:beforeBrief!==afterBrief},
  chapterSources:(proposal.sources||[]).filter(s=>s.kind==='chapters').map(s=>({id:s.id,revision:s.revision??null})),
  evidenceIssues,
  canReview:evidenceIssues.length===0&&same(before,target)
 };
}
export function clueProposalImpactHTML(impact,{href=()=>null}={}){
 const ref=(kind,id,label)=>{const link=href(kind,id);return link?'<a href="'+h(link)+'" dir="auto">'+h(label)+'</a>':h(label);};
 const asValue=v=>v==null?'Not recorded':typeof v==='string'?v:JSON.stringify(v,null,2);
 return '<details data-clue-impact><summary>Connected impact ('+impact.events.length+' events, '+impact.characters.length+' characters, '+impact.questions.length+' questions)</summary>'+
 '<p>Planning source r'+h(impact.sourceRevision??'Unknown')+' · '+(impact.canReview?'Saved source snapshot matches':'Source changed or missing: refresh before approval')+'. No chapter prose is modified by this preview.</p>'+
 '<details><summary>Field changes ('+impact.changes.length+')</summary>'+
 impact.changes.map(change=>'<article><strong>'+h(change.key)+'</strong><div class="dsl-diff"><div><b>Current</b><pre dir="auto">'+h(asValue(change.before))+'</pre></div><div><b>Proposed</b><pre dir="auto">'+h(asValue(change.after))+'</pre></div></div></article>').join('')+'</details>'+
 '<details><summary>Connected events ('+impact.events.length+')</summary>'+
 impact.events.map(e=>'<p>'+ref('events',e.id,e.title)+' · '+h(e.status)+' · r'+h(e.revision??'Unknown')+(e.direct?' · Selected clue':'')+'</p>').join('')+'</details>'+
 '<details><summary>Linked characters ('+impact.characters.length+')</summary>'+
 impact.characters.map(c=>'<p>'+ref('characters',c.id,c.name)+' · '+h(c.status)+' · r'+h(c.revision??'Unknown')+'</p>').join('')+'</details>'+
 '<details><summary>Questions and protected decisions ('+impact.questions.length+')</summary>'+
 impact.questions.map(q=>'<p>'+ref('questions',q.id,q.title)+' · '+h(q.status)+(q.protected?' · Protected author decision':' · Pending or unclassified')+'</p>').join('')+
 (!impact.questions.length?'<p>No explicitly connected questions recorded. This does not establish that no conflict exists.</p>':'')+'</details>'+
 '<details><summary>Current and proposed Story Brief</summary><div class="dsl-diff"><div><b>Current saved planning</b><pre dir="auto">'+h(impact.brief.before)+'</pre></div><div><b>Proposed compiled planning</b><pre dir="auto">'+h(impact.brief.after)+'</pre></div></div><p>'+(impact.brief.changed?'Compiled Story Brief may change when this proposal is approved.':'Compiled Story Brief remains unchanged.')+'</p></details>'+
 '<details><summary>Linked saved chapter references ('+impact.chapterSources.length+')</summary>'+
 impact.chapterSources.map(s=>'<p>Chapter ID: '+h(s.id)+' · Source r'+h(s.revision??'Unknown')+' · Manuscript review is separate</p>').join('')+
 (!impact.chapterSources.length?'<p>No saved chapter references linked. This is not proof of manuscript coverage.</p>':'')+'</details>'+
 impact.evidenceIssues.map(e=>'<p>Source change: '+h(e.kind)+' · '+h(e.id)+' · '+h(e.reason)+'</p>').join('')+
 '</details>';
}
