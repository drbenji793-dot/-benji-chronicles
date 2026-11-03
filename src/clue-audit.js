import {activeRecord} from './current-book-brief.js';
const clueTypes=new Set(['twist','clue','secret']);
export const isClue=e=>clueTypes.has(e.type);
export function clueAudit(data,chapters=[]){
 const all=data.events||[],events=all.filter(activeRecord),byId=new Map(events.map(e=>[e.id,e])),byChapter=new Map(chapters.map(c=>[c.id,c]));
 return {retired:all.length-events.length,rows:events.map(e=>{
 const notices=[];const add=(code,text)=>notices.push({code,text,kind:'Recorded source check',confidence:'Deterministic metadata check'});
 if(isClue(e)){if(!e.truth?.trim())add('truth','Underlying truth is not recorded.');if(!e.setup?.trim())add('setup','Setup is not recorded.');if(!e.outcome?.trim())add('payoff','Consequence or payoff is not recorded.');}
 if(e.sourceId){const c=byChapter.get(e.sourceId);if(!c)add('chapter-missing','Linked chapter is unavailable in this source load.');else if(c.revision!==e.sourceRevision)add('chapter-stale','Saved chapter revision differs from the linked revision.');}
 for(const link of (data.links||[]).filter(activeRecord).filter(l=>l.from===e.id||l.to===e.id))if(!byId.has(link.from)||!byId.has(link.to))add('link:'+link.id,'A recorded connection points to an unavailable event.');
 const status=['accepted','approved'].includes(e.status)?'Approved plan':['proposal','proposed'].includes(e.status)?'Proposal':e.status==='question'?'Open question':e.status==='conflict'?'Conflict':e.status==='written'?'Written source, planning approval not inferred':'Unclassified';
 return {event:e,status,visible:isClue(e)||e.type==='decision'||e.status==='question',notices};})};
}
