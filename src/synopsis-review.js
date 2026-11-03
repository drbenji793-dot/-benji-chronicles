import {selectedSynopsis} from './source-tools.js';
import {activeRecord} from './current-book-brief.js';
import {savedStoryBrief} from './story-brief.js';
const sourceFields=['id','text','prompt','date','dateLabel','year','order','characters','goal','cause','notes','knowledgeRecords','title','name','aliases','summary','truth','setup','outcome','belief','readerKnows','role','desire','fear','arc','secret','answer','status','recordStatus','eventIds','characterIds','sourceId','sourceRevision'];
export function synopsisText(data,view){const linked=selectedSynopsis(data,{view,scope:'plan'}).filter(s=>s.status==='approved');if(linked.length)return linked.map(s=>s.text).join('\n\n');if(view==='short')return data.summary||'';if(view==='full')return savedStoryBrief(data)||'';if(view==='chapters')return (data.storyDraft?.chapters||data.currentStory?.chapters||[]).filter(activeRecord).map((c,i)=>['Chapter '+(i+1)+' · '+(c.title||''),c.summary,...(c.points||[])].filter(Boolean).join('\n')).join('\n\n');throw Error('Unknown synopsis view.');}
export function synopsisSourceRows(data){return [['event',data.events],['character',data.characters],['decision',data.workshop?.questions],['fact',data.decisions]].flatMap(([kind,rows])=>(rows||[]).filter(activeRecord).map(r=>({key:kind+':'+r.id,kind,id:r.id,label:r.title||r.name||r.prompt||r.id,status:r.status||r.recordStatus||'Unclassified',revision:r.revision??null,content:Object.fromEntries(sourceFields.filter(k=>r[k]!==undefined&&!(k==='sourceRevision'&&!r.sourceId)).map(k=>[k,r[k]]))})));}
export function synopsisReviewState(data,view,{bookId,branchId}={}){
 const review=data.synopsisReviews?.[view];if(!review)return {status:'Not reviewed',changes:[],review:null};
 if((bookId&&review.bookId!==bookId)||(branchId&&review.branchId!==branchId))return {status:'Source scope mismatch',changes:[],review};
 const rows=synopsisSourceRows(data),changes=[];
 if(review.text!==synopsisText(data,view))changes.push({label:'Synopsis wording',before:review.text,after:synopsisText(data,view)});
 for(const source of review.sources||[]){const current=rows.find(r=>r.key===source.key);if(!current||JSON.stringify(source.content)!==JSON.stringify(current.content))changes.push({key:source.key,label:current?.label||source.label,before:JSON.stringify(source.content,null,2),after:current?JSON.stringify(current.content,null,2):'Source unavailable'});}
 return {status:changes.length?'Needs review':review.status==='deferred'?'Deferred':'Current for selected sources',changes,review};
}
export function reviewSynopsis(data,{view,sourceKeys,note,status},{bookId,branchId,sourceRevision,writer,at=new Date().toISOString()}){
 if(!bookId||!branchId||!Number.isInteger(sourceRevision)||!['reviewed','deferred'].includes(status))throw Error('A current book, path and review state are required.');
 const text=synopsisText(data,view);if(!text.trim())throw Error('This synopsis view has no saved text to review.');
 if(!String(note||'').trim()||String(note).length>4000)throw Error('Record the source review reason.');
 if(!Array.isArray(sourceKeys)||!sourceKeys.length||sourceKeys.length>300||new Set(sourceKeys).size!==sourceKeys.length)throw Error('Choose the distinct source records you reviewed.');
 const available=synopsisSourceRows(data),sources=sourceKeys.map(key=>{const row=available.find(r=>r.key===key);if(!row)throw Error('A selected source is unavailable. Reload before reviewing.');return row;});
 const d=structuredClone(data);d.synopsisReviews={...(d.synopsisReviews||{}),[view]:{id:'synopsis:'+view,view,scope:'Story plan only; selected sources, not saved manuscript',bookId,branchId,sourceRevision,text,sources,status,note:String(note).trim(),writer,at}};
 // A section review cannot clear other sections or unknown dependencies.
 return d;
}
