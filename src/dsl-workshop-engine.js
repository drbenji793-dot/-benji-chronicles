import {clone,activeEvents,impactedEvents,compareStories} from './dsl-engine.js';
const fields=new Set(['title','summary','outcome','truth','belief','setup','readerKnows','knowledge','characters','location','goal','notes','act']);
export function proposalBrief(data,context,request,eventIds=[]){return JSON.stringify({task:'Propose connected planning changes. Do not modify chapters or rules. Return JSON matching responseShape. Keep suggestions distinct from author decisions. Include a coherent revised full synopsis and explain each changed event.',context,request,eventIds,story:data,responseShape:{bookId:context.bookId,branchId:context.branchId,baseRevision:context.baseRevision,request,summary:'Complete revised synopsis',changes:[{id:'existing event ID',fields:{summary:'Revised event',outcome:'Revised consequence'},reason:'Why this changes'}]}},null,2);}
export function applyProposal(data,p,context){
 if(!p||p.bookId!==context.bookId||p.branchId!==context.branchId||p.baseRevision!==context.baseRevision)throw Error('This proposal belongs to another book, path or revision. Export a fresh brief before applying it.');
 if(typeof p.request!=='string'||!p.request.trim())throw Error('Describe the decision or change first.');
 if(!Array.isArray(p.changes)||p.changes.length>200)throw Error('The proposal needs a changes list.');
 if(typeof p.summary!=='string'||!p.summary.trim())throw Error('A full revised synopsis is required for a connected change.');
 const d=clone(data),seen=new Set();
 for(const change of p.changes){const e=d.events.find(e=>e.id===change.id&&!e.archived);if(!e||seen.has(change.id))throw Error('A changed event is missing or repeated.');seen.add(change.id);
 if(!change.fields||typeof change.fields!=='object'||Array.isArray(change.fields))throw Error('Each event needs named fields.');
 for(const [key,value] of Object.entries(change.fields)){if(!fields.has(key)||typeof value!=='string'||value.length>30000)throw Error('Unsupported event field: '+key);e[key]=value;}
 if(!e.title?.trim())throw Error('An event needs a title.');
 }
 d.summary=p.summary;d.workshop={...(d.workshop||{}),synopsisNeedsReview:false,lastChange:{request:p.request,eventIds:[...seen],at:context.at||new Date().toISOString(),writer:context.writer||'Benji'}};
 if(p.questionId){const q=d.workshop.questions?.find(q=>q.id===p.questionId);if(!q)throw Error('The linked question is no longer available.');q.answer=p.answer||p.request;q.status='applied';}
 const touched=new Set(seen);const affected=impactedEvents(d,[...seen]);d.workshop.reviewEventIds=[...new Set([...(d.workshop.reviewEventIds||[]).filter(id=>!touched.has(id)),...affected.filter(e=>!touched.has(e.id)).map(e=>e.id)])];
 return d;
}
export function markPlanningChanges(before,after){const d=clone(after),diff=compareStories(before,d);if((diff.changed.length||diff.added.length||diff.removed.length)&&before.summary===d.summary)d.workshop={...(d.workshop||{}),synopsisNeedsReview:true};return d;}
export function relatedEvents(data,id){return impactedEvents(data,[id]).filter(e=>e.id!==id);}
export function orderedScenes(data,mode='reading',person=''){let rows=activeEvents(data).filter(e=>!person||String(e.characters||'').includes(person));if(mode==='calendar')return rows.sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)||(a.order||0)-(b.order||0));return rows.sort((a,b)=>(a.order||0)-(b.order||0));}
