import {eventEvidence,same} from './planning-evidence.js';
import {selectedSynopsis} from './source-tools.js';
import {activeRecord} from './current-book-brief.js';
import {savedStoryBrief} from './story-brief.js';

export function synopsisText(data,view){const linked=selectedSynopsis(data,{view,scope:'plan'}).filter(s=>s.status==='approved');if(linked.length)return linked.map(s=>s.text).join('\n\n');if(view==='short')return data.summary||'';if(view==='full')return savedStoryBrief(data)||'';if(view==='chapters')return (data.storyDraft?.chapters||data.currentStory?.chapters||[]).filter(activeRecord).map((c,i)=>['Chapter '+(i+1)+' · '+(c.title||''),c.summary,...(c.points||[])].filter(Boolean).join('\n')).join('\n\n');throw Error('Unknown synopsis view.');}
export function synopsisSourceRows(data,chapters=[]){return [['event',data.events],['character',data.characters],['decision',data.workshop?.questions],['fact',data.decisions],['place',data.places],['chapter',chapters]].flatMap(([kind,rows])=>(rows||[]).filter(activeRecord).map(r=>({key:kind+':'+r.id,kind,id:r.id,label:r.title||r.name||r.prompt||r.id,status:r.status||r.recordStatus||'Unclassified',revision:r.revision??null,content:kind==='chapter'?{id:r.id,title:r.title||'',revision:r.revision??null,chapterNumber:r.chapter_number??null}:eventEvidence(r)})));}
export function synopsisReviewState(data,view,{bookId,branchId,chapters=[]}={}){
 const review=data.synopsisReviews?.[view];if(!review)return {status:'Not reviewed',changes:[],review:null};
 if((bookId&&review.bookId!==bookId)||(branchId&&review.branchId!==branchId))return {status:'Source scope mismatch',changes:[],review};
 const rows=synopsisSourceRows(data,chapters),changes=[];
 for(const [other,text] of Object.entries(review.relatedViews||{}))if(other!==view&&text!==synopsisText(data,other))changes.push({label:'Related '+other+' synopsis changed',before:text,after:synopsisText(data,other)});
 if(review.text!==synopsisText(data,view))changes.push({label:'Synopsis wording',before:review.text,after:synopsisText(data,view)});
 for(const source of review.sources||[]){const current=rows.find(r=>r.key===source.key);if(!current||!same(source.content,current.content))changes.push({key:source.key,label:current?.label||source.label,before:JSON.stringify(source.content,null,2),after:current?JSON.stringify(current.content,null,2):'Source unavailable'});}
 for(const row of rows)if(review.sourceInventory&&!review.sourceInventory.includes(row.key))changes.push({key:row.key,label:row.label+' (new source)',before:'Not present at the previous review',after:JSON.stringify(row.content,null,2)});
 if(!review.sourceInventory)changes.push({label:'Source coverage',before:'Earlier review did not record the source inventory',after:'Review current sources to establish coverage'});
 return {status:changes.length?'Needs review':review.status==='deferred'?'Deferred':'Current for selected sources',changes,review};
}
export function reviewSynopsis(data,{view,sourceKeys,note,status},{bookId,branchId,sourceRevision,writer,chapters=[],at=new Date().toISOString()}){
 if(!bookId||!branchId||!Number.isInteger(sourceRevision)||!['reviewed','deferred'].includes(status))throw Error('A current book, path and review state are required.');
 const text=synopsisText(data,view);if(!text.trim())throw Error('This synopsis view has no saved text to review.');
 if(!String(note||'').trim()||String(note).length>4000)throw Error('Record the source review reason.');
 if(!Array.isArray(sourceKeys)||!sourceKeys.length||sourceKeys.length>300||new Set(sourceKeys).size!==sourceKeys.length)throw Error('Choose the distinct source records you reviewed.');
 const available=synopsisSourceRows(data,chapters),sources=sourceKeys.map(key=>{const row=available.find(r=>r.key===key);if(!row)throw Error('A selected source is unavailable. Reload before reviewing.');return row;});
 const d=structuredClone(data);if(d.synopsisReviews?.[view])d.synopsisReviewHistory=[...(d.synopsisReviewHistory||[]),structuredClone(d.synopsisReviews[view])];d.synopsisReviews={...(d.synopsisReviews||{}),[view]:{id:'synopsis:'+view,view,scope:'Story plan only; selected sources, not saved manuscript',bookId,branchId,sourceRevision,text,sources,sourceInventory:available.map(r=>r.key),relatedViews:Object.fromEntries(['short','full','chapters'].map(v=>[v,synopsisText(data,v)])),status,note:String(note).trim(),writer,at}};
 // A section review cannot clear other sections or unknown dependencies.
 return d;
}
