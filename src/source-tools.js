import {clueAudit,clueNotices} from './clue-audit.js';
import {reviewQueue} from './planning-review.js';
import {assertNoApprovalConflicts} from './approval-conflicts.js';
import {eventEvidence,same as sameEvidence} from './planning-evidence.js';
import {activeRecord} from './current-book-brief.js';
import {savedStoryBrief} from './story-brief.js';

export {clueNotices};
const copy=x=>structuredClone(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const rows=(d,k)=>k==='questions'?(d.workshop?.questions||[]):(d[k]||[]);
export const sourceRecord=(d,ref,chapters=[])=>ref.kind==='chapters'?chapters.find(x=>x.id===ref.id):rows(d,ref.kind).find(x=>x.id===ref.id&&activeRecord(x));
export function captureSources(data,refs,chapters=[]){
 const allowed=['events','characters','decisions','questions','chapters','places'];
 const seen=new Set();
 return refs.map(ref=>{
  if(!allowed.includes(ref.kind)||!ref.id||seen.has(ref.kind+':'+ref.id))throw Error('Invalid or repeated source link.');
  seen.add(ref.kind+':'+ref.id);const row=sourceRecord(data,ref,chapters);
  if(!row)throw Error('Source unavailable: '+ref.kind+' '+ref.id);
  return {kind:ref.kind,id:ref.id,revision:row.revision??null,snapshot:copy(row)};
 });
}
export function sourceDifferences(data,sources=[],chapters=[]){
 return sources.flatMap(s=>{const now=sourceRecord(data,s,chapters);return !now?[{...s,reason:'Source unavailable',current:null}]:!same(now,s.snapshot)?[{...s,reason:'Source changed',current:copy(now)}]:[];});
}
export const clueRecords=d=>(d.events||[]).filter(activeRecord).filter(e=>['twist','clue','secret'].includes(e.type));
export function knowledgeAt(data,{characterId,readingOrder=Infinity,eventId}={}){
 const events=(data.events||[]).filter(activeRecord),out=[];
 for(const acquired of events)for(const k of acquired.knowledgeRecords||[]){
  const holderId=k.characterId,fact=events.find(e=>e.id===k.factEventId),order=k.readingOrder??acquired.order??null;
  if(characterId&&holderId!==characterId)continue;
  if(eventId&&acquired.id!==eventId)continue;
  if(Number.isFinite(readingOrder)&&(order==null||order>readingOrder))continue;
  out.push({...k,holderId,eventId:acquired.id,readingOrder:order,evidence:k.sourceNote,certainty:k.certainty||'Not recorded',factId:k.factEventId,factTitle:fact?.title||'Unavailable fact',holder:holderId==='reader'?'Reader':(data.characters||[]).find(c=>c.id===holderId)?.name||'Unavailable character',event:acquired.title,stale:!!fact&&(fact.truth||'')!==k.sourceFactTruth});
 }return out;
}
export function synopsisSections(data){
 const saved=data.synopsisSections||[];
 return [{id:'summary',view:'short',scope:'plan',text:data.summary||'',status:'unclassified',sources:[],...(data.synopsisMeta?.summary||{})},
 {id:'full',view:'full',scope:'plan',text:savedStoryBrief(data)||'',status:'unclassified',sources:[],...(data.synopsisMeta?.full||{})},
 ...(data.storyDraft?.chapters||data.currentStory?.chapters||[]).filter(activeRecord).map((c,i)=>({id:'outline:'+c.id,view:'chapters',scope:'plan',text:[c.summary,...(c.points||[])].filter(Boolean).join('\n'),title:c.title||'Chapter '+(i+1),status:c.status||'unclassified',sources:[]})),
 ...saved.filter(activeRecord)];
}
export function sectionReview(data,section,chapters=[]){
 const differences=sourceDifferences(data,section.sources,chapters);
 return {state:!section.sources?.length?'Sources not verified':differences.length?'Needs review':section.status==='approved'?'Up to date for linked sources':'Proposal',differences};
}
export function selectedSynopsis(data,{view='short',scope='plan',chapters=[]}={}){
 return synopsisSections(data).filter(s=>s.view===view&&s.scope===scope).map(s=>({...s,review:sectionReview(data,s,chapters)}));
}
const eventFields=new Set(['type','truth','belief','setup','outcome','setupEventId','reinforcementEventId','revealEventId','setupChapterId','revealChapterId','replacementEventId','characterIds','knowledgeRecords']);
function validClue(data,values,chapters=[],targetId){
 for(const key of Object.keys(values))if(!eventFields.has(key))throw Error('Unsupported clue field: '+key);
 if(values.type&&!['twist','clue','secret'].includes(values.type))throw Error('Choose twist, clue or secret.');
 for(const key of ['truth','belief','setup','outcome','setupEventId','reinforcementEventId','revealEventId','setupChapterId','revealChapterId','replacementEventId'])if(key in values&&(typeof values[key]!=='string'||values[key].length>30000))throw Error('Invalid clue field: '+key);
 for(const key of ['setupEventId','reinforcementEventId','revealEventId'])if(values[key]&&!sourceRecord(data,{kind:'events',id:values[key]}))throw Error('Choose an available event.');
 if(values.replacementEventId&&(!sourceRecord(data,{kind:'events',id:values.replacementEventId})||values.replacementEventId===targetId))throw Error('Choose a different current replacement event.');
 for(const key of ['setupChapterId','revealChapterId'])if(values[key]&&!chapters.some(c=>c.id===values[key]&&activeRecord(c)))throw Error('Choose an available saved chapter for planned placement.');
 if(values.characterIds&&(!Array.isArray(values.characterIds)||new Set(values.characterIds).size!==values.characterIds.length||values.characterIds.some(id=>!sourceRecord(data,{kind:'characters',id}))))throw Error('Choose current character IDs.');
 if(values.knowledgeRecords){
  if(!Array.isArray(values.knowledgeRecords)||values.knowledgeRecords.length>500)throw Error('Invalid knowledge list.');
  const ids=new Set();for(const k of values.knowledgeRecords){
   if(!k.id||ids.has(k.id))throw Error('Knowledge records need unique IDs.');ids.add(k.id);
   if(k.characterId!=='reader'&&!sourceRecord(data,{kind:'characters',id:k.characterId}))throw Error('Choose a knowledge holder.');
   if(!sourceRecord(data,{kind:'events',id:k.eventId}))throw Error('Choose a knowledge acquisition event.');
   if(!['knows','suspects','false_belief','possesses_unread'].includes(k.state))throw Error('Invalid knowledge state.');
   if(k.readingOrder!=null&&(!Number.isFinite(k.readingOrder)||k.readingOrder<0))throw Error('Reading order must be a nonnegative number or unknown.');
   if(!String(k.sourceNote||'').trim()||!String(k.statement||'').trim()||!sourceRecord(data,{kind:'events',id:k.factEventId}))throw Error('Knowledge needs a statement, evidence and a fact source.');
  }
 }
}
export function makeToolProposal(data,input,context,chapters=[]){
 if(!input||input.bookId!==context.bookId||input.branchId!==context.branchId||input.baseRevision!==context.baseRevision)throw Error('Wrong book, path or stale revision. Export a fresh review package.');
 if(!['clue','synopsis'].includes(input.kind)||!input.targetId||!String(input.reason||'').trim()||!String(input.author||'').trim())throw Error('Provide a target, reason and proposal author.');
 const target=input.kind==='clue'?sourceRecord(data,{kind:'events',id:input.targetId}):synopsisSections(data).find(x=>x.id===input.targetId);
 if(!target)throw Error('The target is unavailable.');
 if(input.kind==='clue')validClue(data,input.values||{},chapters,input.targetId);
 else if(typeof input.values?.text!=='string'||!input.values.text.trim()||input.values.text.length>100000||Object.keys(input.values).some(k=>k!=='text'))throw Error('Provide only the proposed synopsis text.');
 const refs=copy(input.sourceRefs||[]);
 if(!refs.length)throw Error('Link at least one current source before review.');
 if(input.kind==='clue'){
  const add=(kind,id)=>{if(id&&!refs.some(r=>r.kind===kind&&r.id===id))refs.push({kind,id});};
  add('events',target.id);
  for(const key of ['setupEventId','reinforcementEventId','revealEventId'])add('events',input.values[key]);
  add('events',input.values.replacementEventId);
  for(const key of ['setupChapterId','revealChapterId'])add('chapters',input.values[key]);
  for(const id of input.values.characterIds||[])add('characters',id);
  for(const k of input.values.knowledgeRecords||[]){add('events',k.factEventId);add('events',k.eventId);if(k.characterId!=='reader')add('characters',k.characterId);}
 }
 const sources=captureSources(data,refs,chapters);
 if(input.kind==='clue'&&input.values?.knowledgeRecords?.some(k=>k.eventId!==target.id))throw Error('Knowledge must be stored on its acquisition event.');
 if(!sources.length)throw Error('Link at least one current source before review.');
 if(input.kind==='synopsis'&&target.scope==='manuscript'&&!sources.every(s=>s.kind==='chapters'))throw Error('Saved manuscript synopsis requires chapter sources only.');
 return {id:crypto.randomUUID(),kind:input.kind,targetId:target.id,bookId:context.bookId,branchId:context.branchId,baseRevision:context.baseRevision,before:copy(target),values:copy(input.values),sources,reason:input.reason.trim(),author:input.author.trim(),status:'proposed',at:new Date().toISOString()};
}
export function storeToolProposal(data,proposal){
 if((data.workshop?.toolProposals||[]).some(p=>p.kind===proposal.kind&&p.targetId===proposal.targetId&&['proposed','deferred'].includes(p.status)&&same(p.values,proposal.values)&&same(p.sources,proposal.sources)))throw Error('This proposal is already awaiting review. Open the existing proposal.');
 const d=copy(data);d.workshop={...d.workshop,toolProposals:[...(d.workshop?.toolProposals||[]),copy(proposal)]};return d;
}
export function reviewToolProposal(data,id,action,context,chapters=[],note=''){
 const d=copy(data),p=d.workshop?.toolProposals?.find(x=>x.id===id);
 if(!p||p.bookId!==context.bookId||p.branchId!==context.branchId)throw Error('Proposal unavailable in this book and path.');
 if(!['proposed','deferred'].includes(p.status))throw Error('This proposal was already reviewed.');
 if(!['approved','rejected','deferred'].includes(action))throw Error('Invalid review action.');
 if(!String(note).trim())throw Error('Record the reason for this review.');
 if(action==='approved'){
  if(context.writer!=='Benji')throw Error('Select Benji for approval. Writer selection is not identity verification.');
  const target=p.kind==='clue'?sourceRecord(d,{kind:'events',id:p.targetId}):synopsisSections(d).find(x=>x.id===p.targetId);
  if(!same(target,p.before)||sourceDifferences(d,p.sources,chapters).length)throw Error('Target or linked sources changed. Prepare a fresh proposal.');
  assertNoApprovalConflicts(d,p.kind==='clue'?{changes:[{id:p.targetId,fields:p.values}]}:p.targetId==='summary'?{summary:p.values.text}:{});
  if(p.kind==='clue'){validClue(d,p.values,chapters,p.targetId);Object.assign(target,copy(p.values));target.toolReview={proposalId:p.id,approvedBy:context.writer,at:new Date().toISOString(),sourceRevision:context.baseRevision};target.updatedBy=context.writer;target.updatedAt=target.toolReview.at;}
  else if(p.targetId==='summary'){d.summary=p.values.text;d.synopsisMeta={...d.synopsisMeta,summary:{sources:p.sources,status:'approved'}};}
  else if(p.targetId==='full'){d.synopsisMeta={...d.synopsisMeta,full:{text:p.values.text,sources:p.sources,status:'approved'}};}
  else {const s=d.synopsisSections?.find(x=>x.id===p.targetId);if(!s)throw Error('Legacy chapter outlines are read only here. Create a linked synopsis section first.');Object.assign(s,{text:p.values.text,sources:p.sources,status:'approved'});}
  d.workshop.synopsisNeedsReview=true;
  p.resultSnapshot=copy(p.kind==='clue'?sourceRecord(d,{kind:'events',id:p.targetId}):synopsisSections(d).find(x=>x.id===p.targetId));
  p.appliedSources=captureSources(d,p.sources.map(({kind,id})=>({kind,id})),chapters);
  p.appliedRevision=context.baseRevision+1;p.verification='Awaiting saved source verification';
 }
 p.status=action;p.review={writer:context.writer,note,at:new Date().toISOString(),sourceRevision:context.baseRevision};return d;
}
export function toolProposalReview(data,p,{chapters}={}){
 const target=p.kind==='clue'?sourceRecord(data,{kind:'events',id:p.targetId}):synopsisSections(data).find(x=>x.id===p.targetId);
 if(!target||Object.entries(p.values||{}).some(([k,v])=>!same(target[k],v)))return {ready:false,stale:true,reason:'Applied values no longer match. Reopen review.'};
 const sources=p.appliedSources||p.sources||[];
 if(!sources.length)return {ready:false,reason:'Source evidence is unavailable. Prepare a fresh proposal.'};
 for(const s of sources){
  if(s.kind==='chapters'&&!Array.isArray(chapters))return {ready:false,reason:'Chapter sources need to be loaded before verification.'};
  const current=sourceRecord(data,s,chapters||[]);
  // Legacy self sources used the preapplication snapshot. Compare the recorded result instead.
  const expected=!p.appliedSources&&p.kind==='clue'&&s.kind==='events'&&s.id===p.targetId?p.resultSnapshot:s.snapshot;
  if(!current||!expected||!(s.kind==='chapters'?same(current,expected):sameEvidence(eventEvidence(current),eventEvidence(expected))))return {ready:false,stale:true,reason:'Linked sources changed or are unavailable. Prepare a fresh proposal.'};
 }
 return {ready:true,reason:p.verification?.status==='verified'?'Verified for recorded fields and linked sources':'Saved change awaiting verification'};
}
export function verifyToolProposal(data,id,context,note,chapters){
 const d=copy(data),p=d.workshop?.toolProposals?.find(x=>x.id===id);
 if(!p||p.status!=='approved'||p.bookId!==context.bookId||p.branchId!==context.branchId||!Number.isInteger(context.baseRevision)||context.baseRevision<p.appliedRevision||!String(note||'').trim())throw Error('Reload the applied source and record verification evidence.');
 const check=toolProposalReview(d,p,{chapters});if(!check.ready)throw Error(check.reason);
 p.verification={status:'verified',sourceRevision:context.baseRevision,writer:context.writer,note,at:new Date().toISOString(),scope:'Applied fields and linked source snapshots only; literary continuity requires human review'};return d;
}
export function addSynopsisSection(data,{id=crypto.randomUUID(),title,view,scope}){
 if(!['short','full','chapters'].includes(view)||!['plan','manuscript'].includes(scope)||!String(title||'').trim())throw Error('Choose a title, view and source scope.');
 const d=copy(data);if(synopsisSections(d).some(s=>s.id===id))throw Error('Section already exists.');
 d.synopsisSections=[...(d.synopsisSections||[]),{id,title,view,scope,text:'',status:'proposed',sources:[]}];return d;
}
export function sourcePackage(data,context,{kind,targetId,view='short',scope='plan',chapters=[]}={}){
 const targets=kind==='clue'?clueRecords(data):selectedSynopsis(data,{view,scope,chapters});
 const selected=targetId?targets.filter(x=>x.id===targetId):targets;
 return {format:'chronicles-source-review',version:1,...context,kind,view,scope,exportedAt:new Date().toISOString(),audience:'Writer review; contains spoilers',pendingReviews:{clues:clueAudit(data,chapters).rows.filter(r=>r.notices.length).map(r=>({eventId:r.event.id,notices:r.notices,review:r.review})),events:reviewQueue(data).map(({id,reason})=>({id,reason})),proposals:(data.workshop?.toolProposals||[]).filter(p=>p.bookId===context.bookId&&p.branchId===context.branchId&&p.status==='approved').map(p=>({id:p.id,kind:p.kind,targetId:p.targetId,review:toolProposalReview(data,p,{chapters})}))},targets:copy(selected),sources:{events:copy((data.events||[]).filter(activeRecord)),characters:copy((data.characters||[]).filter(activeRecord)),questions:copy((data.workshop?.questions||[]).filter(activeRecord)),decisions:copy((data.decisions||[]).filter(activeRecord)),chapters:copy(chapters)},instructions:'Return a proposal only. Preserve target IDs, bookId, branchId and baseRevision. Include kind, targetId, author, reason, values and sourceRefs [{kind,id}]. Do not approve, publish or modify manuscript text.'};
}
