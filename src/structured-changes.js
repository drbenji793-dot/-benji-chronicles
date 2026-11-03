import {activeRecord} from './current-book-brief.js';
import {eventEvidence,same} from './planning-evidence.js';
export const recordFields={characters:['name','role','desire','fear','arc','secret','relationships','biography','tier','ageNote','firstAppearance','voice','sceneHook','continuityNotes'],places:['name','description','notes']};
export function applyRecordChanges(data,changes=[]){
 if(!Array.isArray(changes)||changes.length>200)throw Error('Provide up to 200 structured record changes.');
 const out=structuredClone(data),seen=new Set();
 for(const c of changes){
  const allowed=recordFields[c.kind],key=c.kind+':'+c.id;
  if(!allowed||!c.id||seen.has(key))throw Error('Unsupported or repeated structured record.');seen.add(key);
  const target=out[c.kind]?.find(r=>r.id===c.id&&activeRecord(r));if(!target)throw Error('Structured source is missing or retired.');
  if(!c.fields||typeof c.fields!=='object'||Array.isArray(c.fields)||!Object.keys(c.fields).length||!String(c.reason||'').trim())throw Error('Provide fields and a reason for each structured change.');
  for(const [key,value] of Object.entries(c.fields)){
   if(!allowed.includes(key)||typeof value!=='string'||value.length>30000)throw Error('Unsupported structured field: '+key);
   if(key==='name'&&!value.trim())throw Error('A record name cannot be empty.');target[key]=value;
  }
 }
 return out;
}
export function structuredEvidence(data,changes=[]){return changes.map(c=>({kind:c.kind,id:c.id,content:eventEvidence(data[c.kind]?.find(r=>r.id===c.id&&activeRecord(r))||{id:c.id,missing:true})}));}
export function structuredChanged(before,after,changes=[]){return changes.some(c=>!same(before[c.kind]?.find(r=>r.id===c.id),after[c.kind]?.find(r=>r.id===c.id)));}
export function structuredDependencies(data,changes=[]){return (data.events||[]).filter(activeRecord).filter(e=>changes.some(c=>c.kind==='characters'?(e.characterIds||[]).includes(c.id):e.placeId===c.id||(e.placeIds||[]).includes(c.id))).map(e=>e.id);}
