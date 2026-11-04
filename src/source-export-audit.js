import {activeRecord} from './current-book-brief.js';

export function sourceClass(record){
 const status=String(record?.status||'').toLowerCase();
 if(!record||!activeRecord(record))return 'Retired';
 if(['approved','accepted','applied','resolved'].includes(status))return 'Approved planning metadata';
 if(['proposal','proposed','candidate'].includes(status))return 'Proposal only';
 if(['conflict','conflicting'].includes(status))return 'Recorded conflict';
 if(['open','question','deferred','answered'].includes(status))return 'Unresolved or pending';
 if(status==='written')return 'Written source, planning approval unknown';
 return 'Unclassified';
}
export function sourceExportAudit(data,chapters=[]){
 const collections={events:data.events||[],characters:data.characters||[],questions:data.workshop?.questions||[],decisions:data.decisions||[],chapters};
 const entries=Object.entries(collections).flatMap(([kind,records])=>records.filter(activeRecord).map(record=>({
  kind,id:record.id||null,revision:record.revision??null,classification:sourceClass(record),recordedStatus:record.status||null
 })));
 const classes=['Approved planning metadata','Proposal only','Recorded conflict','Unresolved or pending','Written source, planning approval unknown','Unclassified'];
 return {entries,groups:Object.fromEntries(classes.map(name=>[name,entries.filter(e=>e.classification===name)])),
  retiredCounts:Object.fromEntries(Object.entries(collections).map(([kind,records])=>[kind,records.filter(r=>!activeRecord(r)).length]))};
}
