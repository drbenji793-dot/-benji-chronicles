import {activeRecord} from './current-book-brief.js';
import {planningFingerprint,normalized} from './critique-findings.js';
import {eventEvidence,same} from './planning-evidence.js';

function linkedSources(data,f){
 return (f.links||[]).map(l=>{const rows=l.kind==='event'?data.events:l.kind==='question'?data.workshop?.questions:[];const row=rows?.find(r=>r.id===l.id&&activeRecord(r));return {kind:l.kind,id:l.id,content:row?eventEvidence(row):null};});
}
export function findingContinuityState(data,f,chapters){
 const c=f.continuity;if(!c)return {stale:false,checked:false};
 if(!Array.isArray(chapters))return {stale:false,checked:false};
 const chapter=chapters.find(x=>x.id===f.chapterId);
 const stale=!chapter||chapter.revision!==c.chapterRevision||!same(linkedSources(data,f),c.sources)||!same(data.rules??null,c.rules);
 return {stale,checked:true};
}
export async function recheckFinding(data,id,input,context){
 const f=data.editorialFindings?.find(x=>x.id===id&&activeRecord(x));
 if(!f||f.bookId!==context.bookId||f.branchId!==context.branchId)throw Error('Finding unavailable in this book and path.');
 if(!['accepted','resolved','obsolete'].includes(input.status))throw Error('Choose still open, resolved or obsolete.');
 if(!String(input.note||'').trim())throw Error('Record the continuity evidence and reason.');
 const chapter=context.chapters?.find(c=>c.id===f.chapterId);
 if(!chapter||!Number.isInteger(chapter.revision)||!chapter.paragraphs?.some(p=>normalized(p)))throw Error('Load the current saved chapter before rechecking this finding.');
 const paragraph=Number(input.paragraph),quote=String(input.quote||'').trim();
 if(input.status!=='obsolete'&&(!Number.isInteger(paragraph)||paragraph<1||!normalized(quote)||!normalized(chapter.paragraphs[paragraph-1]).includes(normalized(quote))))throw Error('Provide a matching quote and paragraph from the current saved chapter.');
 const sources=linkedSources(data,f);if(sources.some(s=>!s.content))throw Error('A linked source is unavailable. Repair its link before completing continuity review.');
 if(input.status==='resolved'){
  if(!(f.repairs||[]).some(r=>r.status==='verified'&&r.verification?.chapterRevision===chapter.revision&&chapter.paragraphs.filter(p=>p===r.after).length===1))throw Error('Verify an approved repair against this saved chapter before resolving the finding.');
  if((f.repairs||[]).some(r=>['proposed','approved','deferred'].includes(r.status)))throw Error('A repair decision or verification remains open.');
  if(sources.some(s=>s.kind==='question'&&!['resolved','rejected'].includes(s.content.status)))throw Error('A linked author decision remains unresolved.');
 }
 const out=structuredClone(data),target=out.editorialFindings.find(x=>x.id===id),at=context.at||new Date().toISOString();
 target.sourceHistory=[...(target.sourceHistory||[]),{chapterRevision:f.chapterRevision,paragraph:f.paragraph,quote:f.quote,planningFingerprint:f.planningFingerprint,status:f.status,continuity:f.continuity??null}];
 target.status=input.status;target.decisionNote=input.note.trim();target.chapterRevision=chapter.revision;
 if(input.status!=='obsolete'){target.paragraph=paragraph;target.quote=quote;}
 target.planningFingerprint=await planningFingerprint(data);
 target.continuity={status:input.status,chapterRevision:chapter.revision,sources,rules:structuredClone(data.rules??null),note:input.note.trim(),writer:context.writer,at,scope:'Recorded human review of this saved chapter and linked planning sources only. No manuscript edits or independent automated validation.'};
 return out;
}
