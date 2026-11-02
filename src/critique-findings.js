import {currentPlanning} from './current-book-brief.js';
export const findingStates={proposed:'Proposed',accepted:'Accepted for proposal',rejected:'Rejected',deferred:'Deferred',clarification:'Needs clarification'};
export const findingKinds=['Textual fact','Interpretation','Author preference','Research gap'];
export const findingSeverities=['Minor','Major','Critical'];
export const findingConfidences=['Low','Medium','High'];
export const findingRecommendations=['Keep','Rewrite','Cut','Verify'];
export const normalized=value=>String(value||'').replace(/\s+/gu,' ').trim();
const metadata=new Set(['revision','sourceRevision','sourceBranchRevision','updatedAt','updatedBy','savedAt','updated_at','timezone','changeNote','supersedesRevision','recordStamps','currentUpdate']);
function stable(value){
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>!metadata.has(k)).sort().map(k=>[k,stable(value[k])]));
 return value;
}
export async function planningFingerprint(data){
 const current=currentPlanning(data);
 // Review bookkeeping must not make its own source stale.
 current.workshop={questions:current.workshop.questions};delete current.workStatus;
 const bytes=new TextEncoder().encode(JSON.stringify(stable(current)));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
const required=(input,key,max=6000)=>{const value=String(input[key]||'').trim();if(!value||value.length>max)throw Error('Provide '+key+' within '+max+' characters.');return value;};
export async function createFinding(data,input,{chapter,paragraphs,bookId,branchId,revision,writer,language,at=new Date().toISOString()}){
 if(!chapter?.id||!Number.isInteger(chapter.revision)||!Number.isInteger(revision)||!bookId||!branchId)throw Error('A current saved source is required.');
 const paragraph=Number(input.paragraph),quote=required(input,'quote',3000),issue=required(input,'issue'),impact=required(input,'impact'),repair=required(input,'repair');
 if(!Number.isInteger(paragraph)||paragraph<1||!normalized(paragraphs[paragraph-1]).includes(normalized(quote)))throw Error('The quote must match the selected saved paragraph. Open the saved passage and check its paragraph number.');
 for(const [key,values] of [['kind',findingKinds],['severity',findingSeverities],['confidence',findingConfidences],['recommendation',findingRecommendations]])if(!values.includes(input[key]))throw Error('Choose a valid '+key+'.');
 if(!['Human review','GPT self critique','Claude review'].includes(input.origin))throw Error('Identify the review source.');
 const existing=data.editorialFindings||[];
 if(existing.some(f=>f.chapterId===chapter.id&&normalized(f.quote)===normalized(quote)&&normalized(f.issue).toLowerCase()===normalized(issue).toLowerCase()))throw Error('This finding already exists. Review its existing card instead of adding a duplicate.');
 const finding={id:crypto.randomUUID(),title:required(input,'title',160),chapterId:chapter.id,chapterTitle:chapter.title||'',chapterNumber:chapter.chapter_number,chapterRevision:chapter.revision,paragraph,quote,issue,impact,repair,kind:input.kind,severity:input.severity,confidence:input.confidence,recommendation:input.recommendation,origin:input.origin,status:'proposed',bookId,branchId,planningRevision:revision,planningFingerprint:await planningFingerprint(data),language,writingRules:data.rules??null,writingRulesRevision:data.recordStamps?.rules?.revision??null,createdAt:at,writer,history:[],scope:'Editorial finding only; no manuscript approval'};
 return {...structuredClone(data),editorialFindings:[...structuredClone(existing),finding]};
}
export function chapterSourceCurrent(finding,chapters){return chapters.some(c=>c.id===finding.chapterId&&c.revision===finding.chapterRevision);}
export async function decideFinding(data,id,{status,note,chapters,bookId,branchId,writer,at=new Date().toISOString()}){
 const finding=(data.editorialFindings||[]).find(f=>f.id===id);if(!finding)throw Error('Finding is unavailable. Reload Review.');
 if(finding.bookId!==bookId||finding.branchId!==branchId)throw Error('Finding belongs to another book or planning path.');
 if(!findingStates[status]||status==='proposed')throw Error('Choose a review decision.');
 if(!normalized(note))throw Error('Record the reason for this decision.');
 if(!chapterSourceCurrent(finding,chapters)||finding.planningFingerprint!==await planningFingerprint(data))throw Error('Source changed. Recheck the finding against the current chapter and planning before deciding.');
 if(status===finding.status)throw Error('This finding already has that status.');
 const out=structuredClone(data),target=out.editorialFindings.find(f=>f.id===id);
 target.history=[...(target.history||[]),{from:target.status,to:status,note:note.trim(),writer,at}];target.status=status;target.decisionNote=note.trim();target.scope='Editorial finding only; no manuscript approval';
 return out;
}
