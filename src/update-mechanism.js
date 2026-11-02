// Shared planning write contract. Historical values stay in database revision history.
export const MECHANISM_VERSION=1;
const metadata=new Set(['revision','updatedAt','updatedBy','savedAt','timezone','sourceBranchRevision','supersedesRevision','changeNote']);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const content=r=>Object.fromEntries(Object.entries(r||{}).filter(([k])=>!metadata.has(k)));
const active=r=>r&&!r.archived&&!['superseded','archived'].includes(r.recordStatus)&&!['superseded','archived'].includes(r.status);
const collections=['characters','relationships','places','decisions','events','links','objects','editorialFindings'];
const internal=new Set(['recordStamps','currentUpdate','sourceDocument','source','base_snapshot','history','snapshots']);
export function stampUpdate(before,after,{writer,revision,note,bookId=null,branchId=null,at=new Date().toISOString()}={}){
 if(!Number.isInteger(revision)||revision<0)throw Error('A current source revision is required.');
 if(!writer||!String(note||'').trim())throw Error('Writer and change note are required.');
 if(!Number.isFinite(Date.parse(at)))throw Error('A valid save time is required.');
 const data=structuredClone(after),changed=[],affected=new Set();
 const stamp=(old)=>({revision:Number(old?.revision||0)+1,updatedAt:at,savedAt:at,timezone:'UTC',updatedBy:writer,sourceBranchRevision:revision,supersedesRevision:old?.revision??null,changeNote:note});
 function rows(kind,oldRows=[],newRows=[]){
  const oldById=new Map(oldRows.map(r=>[r.id,r]));
  const seen=new Set();
  const result=newRows.map(row=>{
   if(!row.id||seen.has(row.id))throw Error('Missing or duplicate record ID in '+kind);seen.add(row.id);
   const old=oldById.get(row.id);
   if(equal(content(old),content(row)))return structuredClone(old);
   changed.push({kind,id:row.id,action:!old?'created':active(old)&&!active(row)?'retired':'updated',previousRevision:old?.revision??null,replacementId:row.replacedBy||row.supersededBy||null});
   return {...row,...stamp(old),...(!row.sourceId?{sourceRevision:revision+1}:{})};
  });
  for(const row of oldRows)if(!seen.has(row.id))changed.push({kind,id:row.id,action:'removed',previousRevision:row.revision??null,replacementId:null});
  return result;
 }
 for(const key of collections){if(Array.isArray(data[key]))data[key]=rows(key,before[key]||[],data[key]);else if(Array.isArray(before[key]))rows(key,before[key],[]);}
 if(Array.isArray(data.workshop?.questions))data.workshop.questions=rows('questions',before.workshop?.questions||[],data.workshop.questions);
 data.recordStamps=structuredClone(before.recordStamps||{});
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
  if(internal.has(key)||collections.includes(key)||equal(before[key],after[key]))continue;
  changed.push({kind:key,action:key in after?'updated':'removed'});
  data.recordStamps[key]=stamp(before.recordStamps?.[key]);
 }
 if(!changed.length)return structuredClone(before);
 // Compare both versions so renames and removed dependencies still flag their old connections.
 for(const d of [before,data]){
  for(const change of changed){
   if(change.kind==='events')affected.add(change.id);
   const row=(d[change.kind]||[]).find?.(r=>r.id===change.id);
   if(change.kind==='links'&&row){affected.add(row.from);affected.add(row.to);}
   for(const id of row?.eventIds||[])affected.add(id);
   if(change.kind==='characters'&&row){
    const names=[row.name,...(Array.isArray(row.aliases)?row.aliases:[])].filter(Boolean).map(n=>n.toLocaleLowerCase());
    for(const e of d.events||[])if(String(e.characters||'').split(/[,،;؛\n]/u).some(n=>names.includes(n.trim().toLocaleLowerCase())))affected.add(e.id);
   }
  }
 }
 const links=[...(before.links||[]),...(data.links||[])].filter(active);
 let expanded=true;while(expanded){expanded=false;for(const l of links)if(affected.has(l.from)&&!affected.has(l.to)){affected.add(l.to);expanded=true;}}
 const eventIds=(data.events||[]).filter(active).filter(e=>affected.has(e.id)).map(e=>e.id);
 const chapterIds=[...new Set([...(before.events||[]),...(data.events||[])].filter(e=>affected.has(e.id)&&e.sourceId).map(e=>e.sourceId))];
 const editedEvents=new Set(changed.filter(c=>c.kind==='events').map(c=>c.id));
 data.workshop={...(data.workshop||{}),reviewEventIds:[...new Set([...(data.workshop?.reviewEventIds||[]),...eventIds.filter(id=>!editedEvents.has(id))])],synopsisNeedsReview:!!data.workshop?.synopsisNeedsReview||(affected.size>0&&before.summary===data.summary)};
 if(!equal(before.workshop,data.workshop))data.recordStamps.workshop=stamp(before.recordStamps?.workshop);
 data.currentUpdate={id:(branchId||'planning')+':'+(revision+1),mechanismVersion:MECHANISM_VERSION,bookId,branchId,at,savedAt:at,timezone:'UTC',revision:revision+1,writer,updatedBy:writer,baseRevision:revision,sourceRevision:revision,note,changed,
  approval:{status:'Not inferred',source:'Explicit planning Save by selected writer; not verified identity',at},
  implementation:'planning saved',verification:{status:'Structural checks passed; editorial review pending'},
  dependencies:{eventIds,chapterIds,coverage:'Recorded links only; other consequences require review'},
  pending:['Review affected records and chapter prose before publication'],
  recovery:{sourceRevision:revision,storage:'chronicles_dsl_history'},
  prose:'Requires editorial review where affected',publication:'Not implied by planning save'};
 return data;
}
