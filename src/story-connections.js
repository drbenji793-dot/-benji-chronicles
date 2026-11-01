import {activeRecord} from './current-book-brief.js';
import {appearsIn} from './dsl-master.js';
export const eventChangeFields=[['trustBefore','Trust before'],['trustAfter','Trust after'],['knowledgeBefore','Knowledge before'],['knowledgeAfter','Knowledge after'],['goalBefore','Goals before'],['goalAfter','Goals after'],['relationshipBefore','Relationships before'],['relationshipAfter','Relationships after']];
export const eventParticipants=(data,event)=>(data.characters||[]).filter(activeRecord).filter(c=>appearsIn(event,c.name,c.aliases));
export function sharedEvents(data,first,second){
 const a=(data.characters||[]).find(c=>c.id===first),b=(data.characters||[]).find(c=>c.id===second);
 if(!a||!b)return [];
 return (data.events||[]).filter(activeRecord).filter(e=>appearsIn(e,a.name,a.aliases)&&appearsIn(e,b.name,b.aliases)).sort((a,b)=>(a.order||0)-(b.order||0));
}
export function eventImpact(data,id){
 const events=(data.events||[]).filter(activeRecord),byId=new Map(events.map(e=>[e.id,e]));if(!byId.has(id))return [];
 const seen=new Set([id]),queue=[id],result=[];
 while(queue.length){const from=queue.shift();for(const l of (data.links||[]).filter(activeRecord)){if(l.from!==from||seen.has(l.to)||!byId.has(l.to))continue;seen.add(l.to);queue.push(l.to);result.push({event:byId.get(l.to),from:byId.get(from),reason:l.label||l.kind||'Recorded dependency'});}}
 return result;
}
export function relationshipState(r){if(r.connectionKind==='possible')return 'Possible future connection';if(r.recordStatus==='current')return 'Established connection';return 'Connection for review';}
