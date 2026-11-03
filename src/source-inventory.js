import {activeRecord} from './current-book-brief.js';

const clueTypes=new Set(['clue','twist','secret']);
const normalized=value=>String(value??'').trim().toLowerCase();

// A source audit, not a literary classification or approval action.
export function sourceInventory(data={}){
 const events=Array.isArray(data.events)?data.events:[];
 const rows=events.map(event=>{
  const type=normalized(event.type);
  const status=normalized(event.status);
  const retired=!activeRecord(event);
  const inTwists=clueTypes.has(type);
  let classification='Unclassified';
  if(retired)classification='Superseded or retired';
  else if(status==='conflict'||status==='conflicting')classification='Conflicting';
  else if(['approved','accepted'].includes(status))classification='Approved plan';
  else if(['proposed','proposal','candidate'].includes(status))classification='Proposal';
  else if(['open','question','deferred'].includes(status))classification='Unresolved choice';
  else if(status==='written')classification='Saved prose referenced; planning approval unknown';
  const warnings=[];
  if(!event.id)warnings.push('Stable ID unavailable');
  if(!type)warnings.push('Event type not recorded');
  if(!status)warnings.push('Approval status not recorded');
  if(inTwists&&retired)warnings.push('Retired from ordinary Twists view');
  if(!inTwists&&!retired)warnings.push('Outside the Twists filter; classification is not inferred');
  if(event.supersedes&&!events.some(other=>other.id===event.supersedes))warnings.push('Superseded source link unavailable');
  return {id:event.id??null,title:event.title||event.name||'Untitled event',type:type||null,status:status||null,revision:event.revision??null,classification,inTwists,retired,warnings};
 });
 const counts={total:rows.length,active:rows.filter(r=>!r.retired).length,retired:rows.filter(r=>r.retired).length,classifiedTwists:rows.filter(r=>r.inTwists&&!r.retired).length,otherActive:rows.filter(r=>!r.inTwists&&!r.retired).length,unclassified:rows.filter(r=>r.classification==='Unclassified').length,conflicts:rows.filter(r=>r.classification==='Conflicting').length};
 return {counts,rows};
}
