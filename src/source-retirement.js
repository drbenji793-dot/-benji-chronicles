import {activeRecord} from './current-book-brief.js';

// Explicit references only; never infer that prose mentions are safe to remove.
export function retirementDependencies(data,targetId){
 const refs=[];
 const add=(kind,row)=>refs.push({kind,id:row.id||null,title:row.title||row.name||row.id||kind});
 for(const e of (data.events||[]).filter(activeRecord)){
  if(e.id===targetId)continue;
  if(['setupEventId','reinforcementEventId','revealEventId','replacementEventId','supersedes','supersededBy'].some(k=>e[k]===targetId)||
   (e.requiredKnowledge||[]).some(k=>k.factEventId===targetId)||
   (e.knowledgeRecords||[]).some(k=>k.factEventId===targetId||k.eventId===targetId))add('events',e);
 }
 for(const link of (data.links||[]).filter(activeRecord))if(link.from===targetId||link.to===targetId)add('links',link);
 for(const [kind,rows] of [['questions',data.workshop?.questions||[]],['decisions',data.decisions||[]]]){
  for(const row of rows.filter(activeRecord))if((row.eventIds||[]).includes(targetId)||
   (row.application?.eventIds||[]).includes(targetId)||
   (row.application?.fieldClaims||[]).some(c=>c.id===targetId)||
   (row.sources||[]).some(s=>['event','events'].includes(s.kind)&&s.id===targetId))add(kind,row);
 }
 const sections=[...(data.synopsisSections||[]),...Object.entries(data.synopsisMeta||{}).map(([id,s])=>({...s,id}))];
 for(const row of sections.filter(activeRecord))if((row.sources||[]).some(s=>['event','events'].includes(s.kind)&&s.id===targetId))add('synopsis',row);
 for(const row of (data.editorialFindings||[]).filter(activeRecord))if((row.links||[]).some(s=>['event','events'].includes(s.kind)&&s.id===targetId))add('findings',row);
 return refs;
}

export function requireRetirement(data,values,targetId,verifiedReplacement){
 if(!Object.hasOwn(values,'recordStatus'))return;
 if(values.recordStatus!=='superseded'||Object.keys(values).some(k=>!['recordStatus','replacementEventId'].includes(k)))throw Error('Retirement changes only record state and replacement link. Keep fact edits in a separate proposal.');
 const replacement=(data.events||[]).find(e=>e.id===values.replacementEventId&&activeRecord(e));
 if(!replacement||replacement.id===targetId)throw Error('Choose a different current replacement event.');
 if(!verifiedReplacement(replacement))throw Error('Verify the approved replacement proposal against its current sources before retirement.');
 const dependencies=retirementDependencies(data,targetId);
 if(dependencies.length)throw Error('Current records still reference this source: '+dependencies.map(r=>r.kind+' '+r.title).join('; ')+'. Review their links before retirement; no records were changed.');
}
