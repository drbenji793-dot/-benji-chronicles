import {createFinding,planningFingerprint,chapterSourceCurrent,normalized} from './critique-findings.js';
import {activeRecord,currentPlanning} from './current-book-brief.js';
export const REVIEW_PACKET='chronicles-review-v1';
const requireText=(v,label,max=12000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Provide '+label+' within '+max+' characters.');return v.trim();};
export async function reviewPacket(data,{bookId,branchId,revision,language},chapters){
 return {schema:REVIEW_PACKET,bookId,branchId,planningRevision:revision,exportedAt:new Date().toISOString(),writingRulesRevision:data.recordStamps?.rules?.revision??null,scope:'Saved chapters supplied here only. Empty paragraph lists mean no saved text. Unsaved edits are excluded.',planningFingerprint:await planningFingerprint(data),language,currentPlanning:currentPlanning(data),origin:'Claude review',instructions:'Return this JSON with findings filled in. Preserve source IDs, revisions and fingerprint. Each finding needs chapterId, chapterRevision, paragraph (1 based), exact quote, title, issue, impact, repair, kind, severity, confidence and recommendation. No approval or chapter edits. kind: Textual fact / Interpretation / Author preference / Research gap. severity: Minor / Major / Critical. confidence: Low / Medium / High. recommendation: Keep / Rewrite / Cut / Verify. origin: Claude review / GPT self critique / Human review. GPT self critique is not independent validation.',chapters:chapters.map(c=>({id:c.id,title:c.title,revision:c.revision,paragraphs:c.paragraphs})),findings:[]};
}
export function parseReviewPacket(raw){
 if(typeof raw!=='string'||raw.length>2000000)throw Error('Review file must be under 2 MB.');
 let packet;try{packet=JSON.parse(raw);}catch{throw Error('Choose the returned review JSON file.');}
 if(packet?.schema!==REVIEW_PACKET||!Array.isArray(packet.findings)||!packet.findings.length||packet.findings.length>100)throw Error('Expected a review packet with 1 to 100 findings.');
 if(!['Claude review','GPT self critique','Human review'].includes(packet.origin))throw Error('The report must identify its review source.');
 return packet;
}
export async function importReview(data,packet,selected,context,chapters){
 if(packet.bookId!==context.bookId||packet.branchId!==context.branchId||packet.language!==context.language)throw Error('Review belongs to another book, planning path or language.');
 if(packet.planningFingerprint!==await planningFingerprint(data))throw Error('Planning source changed. Export a current review packet.');
 if(!selected.length||new Set(selected).size!==selected.length)throw Error('Select findings to import.');
 let next=structuredClone(data);
 for(const index of selected){
  if(!Number.isInteger(index)||!packet.findings[index])throw Error('Invalid finding selection.');
  const input=packet.findings[index],chapter=chapters.find(c=>c.id===input.chapterId);
  if(!chapter||chapter.revision!==input.chapterRevision)throw Error('Chapter source changed or unavailable. Recheck the returned review.');
  next=await createFinding(next,{...input,origin:packet.origin},{...context,chapter,paragraphs:chapter.paragraphs});
  const saved=next.editorialFindings.at(-1);saved.importSource={schema:packet.schema,planningRevision:packet.planningRevision,origin:packet.origin};
 }
 return next;
}
async function currentFinding(data,id,context){
 const f=(data.editorialFindings||[]).find(f=>f.id===id);
 if(!f||f.bookId!==context.bookId||f.branchId!==context.branchId)throw Error('Finding unavailable in this planning path.');
 if(!chapterSourceCurrent(f,context.chapters)||f.planningFingerprint!==await planningFingerprint(data))throw Error('Source changed. Recheck this finding before continuing.');
 return f;
}
export async function linkFinding(data,id,{kind,targetId,note},context){
 await currentFinding(data,id,context);
 const rows=kind==='question'?data.workshop?.questions:kind==='event'?data.events:null;
 if(!rows?.some(r=>r.id===targetId&&activeRecord(r)))throw Error('Select an existing current question or event.');
 const out=structuredClone(data),f=out.editorialFindings.find(f=>f.id===id);
 if((f.links||[]).some(l=>l.kind===kind&&l.id===targetId))throw Error('This record is already linked.');
 f.links=[...(f.links||[]),{kind,id:targetId,note:requireText(note,'link reason',2000),at:context.at||new Date().toISOString(),writer:context.writer}];return out;
}
export async function createFindingQuestion(data,id,{title,note},context){
 const f=await currentFinding(data,id,context);
 if(f.status!=='accepted')throw Error('Accept the finding for proposal first.');
 title=requireText(title,'specific author question',500);note=requireText(note,'decision reason',4000);
 const rows=data.workshop?.questions||[];
 if(rows.some(q=>q.sourceFindingId===id))throw Error('A decision was already created for this finding. Open its existing link or review its history.');
 if((f.links||[]).some(l=>l.kind==='question'))throw Error('This finding already links to a decision. Review that decision first.');
 if(rows.some(q=>normalized(q.title).toLocaleLowerCase()===normalized(title).toLocaleLowerCase()))throw Error('A question with this wording already exists. Link the existing decision or review its history.');
 const at=context.at||new Date().toISOString(),questionId=crypto.randomUUID(),out=structuredClone(data);
 const question={id:questionId,title,note,status:'open',answer:'',answerNotes:'',options:[],eventIds:(f.links||[]).filter(l=>l.kind==='event').map(l=>l.id),characterIds:[],sourceFindingId:id,sourceChapterId:f.chapterId,sourceChapterRevision:f.chapterRevision,sourceParagraph:f.paragraph,sourceQuote:f.quote,sourceBranchRevision:context.revision,sourcePlanningFingerprint:f.planningFingerprint,updatedBy:context.writer,updatedAt:at};
 out.workshop={...(out.workshop||{}),questions:[...structuredClone(rows),question]};
 const target=out.editorialFindings.find(x=>x.id===id);
 target.links=[...(target.links||[]),{kind:'question',id:questionId,note,at,writer:context.writer}];
 // Creating an unanswered question changes planning context, not story facts.
 // Retain the prior fingerprint and identify this exact bookkeeping transition.
 target.sourceTransitions=[...(target.sourceTransitions||[]),{fromFingerprint:f.planningFingerprint,reason:'Created linked unanswered decision',questionId,at,writer:context.writer}];
 target.planningFingerprint=await planningFingerprint(out);
 return out;
}
export async function proposeRepair(data,id,input,context){
 const f=await currentFinding(data,id,context);
 if(f.status!=='accepted')throw Error('Accept the finding for proposal first.');
 const chapter=context.chapters.find(c=>c.id===f.chapterId),before=requireText(input.before,'current passage'),after=requireText(input.after,'proposed passage'),reason=requireText(input.reason,'repair reason',4000);
 if(!chapter.paragraphs?.includes(before)||!normalized(before).includes(normalized(f.quote)))throw Error('Before must be the complete saved paragraph containing the finding quote.');
 if(before===after)throw Error('The proposed passage must differ from the saved passage.');
 const out=structuredClone(data),target=out.editorialFindings.find(f=>f.id===id);
 if((target.repairs||[]).some(r=>['proposed','approved'].includes(r.status)))throw Error('Review the existing pending repair before creating another.');
 target.repairs=[...(target.repairs||[]),{id:crypto.randomUUID(),before,after,reason,status:'proposed',chapterRevision:chapter.revision,planningFingerprint:f.planningFingerprint,createdAt:context.at||new Date().toISOString(),writer:context.writer,history:[]}];return out;
}
export async function decideRepair(data,id,repairId,{status,note},context){
 const f=await currentFinding(data,id,context),r=(f.repairs||[]).find(r=>r.id===repairId);
 if(!r||r.status!=='proposed'||!['approved','rejected','deferred'].includes(status))throw Error('Choose a decision for a pending repair.');
 if(f.status!=='accepted')throw Error('The finding must still be accepted before a repair decision.');
 const out=structuredClone(data),target=out.editorialFindings.find(f=>f.id===id).repairs.find(r=>r.id===repairId);
 target.status=status;target.history.push({status,note:requireText(note,'decision reason',4000),writer:context.writer,at:context.at||new Date().toISOString()});
 target.scope='Repair decision only. Not applied to manuscript.';return out;
}
export async function verifyRepair(data,id,repairId,context){
 const f=(data.editorialFindings||[]).find(f=>f.id===id),r=f?.repairs?.find(r=>r.id===repairId);
 if(!f||f.bookId!==context.bookId||f.branchId!==context.branchId||!r||r.status!=='approved'||f.status!=='accepted')throw Error('An accepted finding and approved repair are required.');
 if(r.planningFingerprint!==await planningFingerprint(data))throw Error('Planning changed. Recheck the repair before verification.');
 const chapter=context.chapters.find(c=>c.id===f.chapterId);
 if(!chapter||chapter.revision<=r.chapterRevision||chapter.paragraphs?.filter(p=>p===r.after).length!==1)throw Error('The approved passage is not uniquely present in a newer saved chapter. Repair remains unverified.');
 const out=structuredClone(data),target=out.editorialFindings.find(f=>f.id===id).repairs.find(r=>r.id===repairId);
 target.status='verified';target.verification={chapterId:chapter.id,chapterRevision:chapter.revision,writer:context.writer,at:context.at||new Date().toISOString(),method:'Exact approved paragraph matched in saved manuscript; broader editorial consequences still require review'};
 target.history.push({status:'verified',...target.verification});return out;
}
