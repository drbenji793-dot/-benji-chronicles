import {currentPlanning,activeRecord} from './current-book-brief.js';
import {planningFingerprint} from './critique-findings.js';
import {saveQuestionAnswer,protectedDecision,questionState,validateQuestionSelection} from './question-lifecycle.js';
import {loadCurrentWritingStandard} from './writing-standards.js';
const format='chronicles-questions-v1';
const chapterEvidence=rows=>rows.map(c=>({id:c.id,revision:c.revision,title:c.title,chapter:c.chapter_number})).sort((a,b)=>a.id.localeCompare(b.id));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function scope(context){if(!context.bookId||!context.branchId||!Number.isInteger(context.baseRevision)||!['ar','en'].includes(context.language))throw Error('A current book, path, revision and language are required.');}
export async function questionPackage(data,context,chapters){
 scope(context);if(!Array.isArray(chapters))throw Error('Load saved chapter sources before exporting.');
 return {format,version:1,packageId:crypto.randomUUID(),...context,exportedAt:new Date().toISOString(),planningFingerprint:await planningFingerprint(data),chapters:chapterEvidence(chapters),writingStandard:await loadCurrentWritingStandard(context.language),currentPlanning:currentPlanning(data),questions:(data.workshop?.questions||[]).filter(activeRecord).map(q=>({id:q.id,title:q.title,status:questionState(q),answer:q.answer||'',note:q.note||'',decisionKind:q.decisionKind||null,urgency:q.urgency||null,blocksWriting:q.blocksWriting??null,options:q.options||[],selectionMode:q.selectionMode||'compatible',eventIds:q.eventIds||[],characterIds:q.characterIds||[],sourceScope:q.sourceScope||'linked',sourceChapterId:q.sourceChapterId||null,sourceChapterRevision:q.sourceChapterRevision??null,sourceFindingId:q.sourceFindingId||null,sourceBriefSnapshot:q.sourceBriefSnapshot||null,revision:q.revision??null,protected:protectedDecision(q)})),origin:'Human review',instructions:'Fill responses with questionId, answer, notes, selected (exact option strings), written, and reason. Choose origin Human review, GPT proposal or Claude proposal. Keep IDs, source revision and fingerprint. Responses are proposals only. Do not answer protected decisions; propose a linked revision on the site. Defer unresolved choices. No story edits or approval are inferred.',responses:[]};
}
export function parseQuestionPackage(raw){
 if(typeof raw!=='string'||raw.length>4000000)throw Error('Choose a question JSON package under 4 MB.');let p;try{p=JSON.parse(raw);}catch{throw Error('Choose valid question package JSON.');}
 if(p?.format!==format||p.version!==1||!p.packageId||!Array.isArray(p.responses)||!p.responses.length||p.responses.length>100)throw Error('Expected a question package with 1 to 100 responses.');
 if(!['Human review','GPT proposal','Claude proposal'].includes(p.origin))throw Error('Identify the response author or source.');return p;
}
export async function validateQuestionResponses(data,p,context,chapters){
 scope(context);parseQuestionPackage(JSON.stringify(p));if(p.bookId!==context.bookId||p.branchId!==context.branchId||p.language!==context.language)throw Error('Responses belong to another book, path or language.');
 if(p.baseRevision!==context.baseRevision||p.planningFingerprint!==await planningFingerprint(data))throw Error('Planning changed. Export a current question package.');
 if(!Array.isArray(chapters)||!same(p.chapters,chapterEvidence(chapters)))throw Error('Chapter sources changed or are unavailable. Export a current package.');
 const seen=new Set();return p.responses.map(r=>{
  if(!r.questionId||seen.has(r.questionId))throw Error('Missing or duplicate question response.');seen.add(r.questionId);
  const q=data.workshop?.questions?.find(q=>q.id===r.questionId&&activeRecord(q));if(!q||protectedDecision(q))throw Error('Question is missing or protected. Use its linked revision workflow.');
  for(const key of ['answer','reason'])if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>12000)throw Error('Each response needs an answer and reason within 12000 characters.');
  if(r.notes!==undefined&&(typeof r.notes!=='string'||r.notes.length>12000))throw Error('Response notes are too long or invalid.');
  if(!Array.isArray(r.selected)||r.selected.some(x=>!q.options?.includes(x))||new Set(r.selected).size!==r.selected.length)throw Error('Use distinct current answer options.');
  if(q.selectionMode==='single'&&r.selected.length>1)throw Error('This question permits one option only.');
  validateQuestionSelection(q,{selected:r.selected,written:r.written});
  if(typeof r.written!=='string'||r.written.length>12000||r.answer!==[...r.selected,...(r.written?[r.written]:[])].join('\n'))throw Error('Answer must match the selected options and written response.');
  return {...r,title:q.title,currentAnswer:q.answer||'',questionSnapshot:structuredClone(q)};
 });
}
export async function importQuestionResponses(data,p,selected,context,chapters){
 const rows=await validateQuestionResponses(data,p,context,chapters);if(!selected.length||new Set(selected).size!==selected.length)throw Error('Select responses to save as proposals.');
 const d=structuredClone(data);d.workshop={...(d.workshop||{})};const proposals=d.workshop.responseProposals||[];
 for(const id of selected){const r=rows.find(r=>r.questionId===id);if(!r)throw Error('Selected question is unavailable.');if(proposals.some(x=>(x.packageId===p.packageId||x.status==='proposed')&&x.questionId===id))throw Error('This response was already imported.');proposals.push({...r,id:crypto.randomUUID(),packageId:p.packageId,bookId:p.bookId,branchId:p.branchId,language:p.language,sourceRevision:p.baseRevision,planningFingerprint:p.planningFingerprint,chapters:p.chapters,origin:p.origin,status:'proposed',importedBy:context.writer,importedAt:new Date().toISOString()});}
 d.workshop.responseProposals=proposals;return d;
}
export async function reviewQuestionResponse(data,id,action,context,chapters){
 if(!['accept','reject','defer','reopen'].includes(action))throw Error('Choose a response review action.');
 const p=data.workshop?.responseProposals?.find(x=>x.id===id&&(x.status==='proposed'||action==='reopen'&&x.status==='deferred'));if(!p||p.bookId!==context.bookId||p.branchId!==context.branchId||p.language!==context.language)throw Error('Response unavailable in this book or path.');
 let d=structuredClone(data);
 if(action==='accept'){
  const q=data.workshop?.questions?.find(q=>q.id===p.questionId&&activeRecord(q));
  if(!q||protectedDecision(q)||!same(q,p.questionSnapshot)||p.planningFingerprint!==await planningFingerprint(data)||!same(p.chapters,chapterEvidence(chapters)))throw Error('Response sources changed. Export a current package before adopting this answer.');
  d=saveQuestionAnswer(data,q.id,{answer:p.answer,notes:p.notes||'',parts:{selected:p.selected,written:p.written},writer:context.writer});
 }
 const next=d.workshop.responseProposals.find(x=>x.id===id);next.status=action==='reopen'?'proposed':action==='accept'?'answer-saved':action==='reject'?'rejected':'deferred';next.reviewedBy=context.writer;next.reviewedAt=new Date().toISOString();return d;
}
