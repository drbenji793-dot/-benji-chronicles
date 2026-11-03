import {activeRecord} from './current-book-brief.js';
// Compare content, not save stamps. Stamping a review must not invalidate its evidence.
const metadata=new Set(['revision','updatedAt','updatedBy','savedAt','timezone','sourceBranchRevision','supersedesRevision','changeNote','sourceRevision']);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export const eventEvidence=e=>canonical(Object.fromEntries(Object.entries(e).filter(([k])=>!metadata.has(k)||(k==='sourceRevision'&&e.sourceId))));
export const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function decisionEvidence(data,eventIds,summaryChanged){
 const ids=new Set(eventIds),links=(data.links||[]).filter(activeRecord);let more=true;
 while(more){more=false;for(const l of links)if(ids.has(l.from)&&!ids.has(l.to)){ids.add(l.to);more=true;}}
 const selectedEvents=(data.events||[]).filter(e=>ids.has(e.id)&&activeRecord(e));
 const refs=[...new Set(selectedEvents.flatMap(e=>e.characterIds||[]))].map(id=>({kind:'characters',id})).concat([...new Set(selectedEvents.flatMap(e=>[e.placeId,...(e.placeIds||[])].filter(Boolean)))].map(id=>({kind:'places',id})));
 const records=refs.map(ref=>({...ref,content:eventEvidence((data[ref.kind]||[]).find(r=>r.id===ref.id&&activeRecord(r))||{id:ref.id,missing:true})})).sort((a,b)=>(a.kind+':'+a.id).localeCompare(b.kind+':'+b.id));
 return {schema:2,records,events:[...ids].sort().map(id=>({id,content:eventEvidence((data.events||[]).find(e=>e.id===id&&activeRecord(e))||{id,missing:true})})),links:links.filter(l=>ids.has(l.from)||ids.has(l.to)).map(eventEvidence).sort((a,b)=>String(a.id).localeCompare(String(b.id))),...(summaryChanged?{summary:data.summary}:{})};
}
