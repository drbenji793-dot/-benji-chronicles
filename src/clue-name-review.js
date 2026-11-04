import {activeRecord} from './current-book-brief.js';
import {recordedNameCandidates} from './story-name-review.js';
import {escapeHTML as h} from './dsl-engine.js';

const fields={title:'Title',summary:'Summary',truth:'Underlying truth',belief:'Apparent reader belief',setup:'Setup evidence',outcome:'Consequence'};
// Writer-only source comparison. An alias match is not evidence of a wrong name.
export function clueNameReview(data,event){
 const ids=Array.isArray(event.characterIds)?event.characterIds:[];
 const characters=Array.isArray(data.characters)?data.characters:[];
 const linked=[...new Set(ids)].map(id=>{
  const row=characters.find(c=>c.id===id);
  return {id,name:row?.name||id,revision:row?.revision??null,status:row?.status||'Unclassified',
   available:!!row&&activeRecord(row)};
 });
 const matches=Object.entries(fields).flatMap(([key,label])=>
  recordedNameCandidates(data,typeof event[key]==='string'?event[key]:'',{linkedCharacterIds:ids})
   .map(match=>({...match,field:key,label})));
 return {eventId:event.id,revision:event.revision??null,linked,matches};
}
export function clueNameReviewHTML(audit,{href=()=>null}={}){
 const name=(id,label)=>{const url=href(id);return url?'<a dir="auto" href="'+h(url)+'">'+h(label)+'</a>':h(label);};
 return '<details data-clue-name-review><summary>Names and aliases ('+audit.matches.length+' matches)</summary>'+
  '<p>Compare saved text with linked character cards. An alternate name may be intentional; it is not an approved correction. Names and reveal timing remain unchanged.</p>'+
  '<p>Event revision: '+h(audit.revision??'Not recorded')+'</p>'+
  audit.linked.map(c=>'<p dir="auto">'+(c.available?name(c.id,c.name):h(c.name))+' · '+h(c.available?c.status:'Linked character missing or retired')+' · r'+h(c.revision??'Unknown')+'</p>').join('')+
  audit.matches.map(m=>'<p dir="auto">'+h(m.label)+': '+h(m.matchedName)+' · Current card: '+name(m.characterId,m.currentName)+' · '+h(m.review)+'</p>').join('')+
  (!audit.matches.length?'<p>No recorded alternate names matched these fields. This does not establish that every name is correct.</p>':'')+
  (!audit.linked.length?'<p>No character IDs linked to this event.</p>':'')+'</details>';
}
