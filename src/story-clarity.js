import {activeRecord} from './current-book-brief.js';
import {questionGroups} from './decision-state.js';
import {questionState} from './question-lifecycle.js';
import {escapeHTML as h} from './dsl-engine.js';

const truthyText=value=>typeof value==='string'&&value.trim()?value.trim():'';
const count=(rows)=>Array.isArray(rows)?rows.filter(activeRecord).length:0;
const sourceFields=[
 {id:'essence',label:'Story essence',destination:'Story opening',fields:['summary','storyEssence']},
 {id:'synopsis',label:'Full synopsis',destination:'Expanded Story',fields:['storyBrief.text','currentStory.synopsis','storyDraft.synopsis','currentStory.treatment','storyDraft.treatment']},
 {id:'sequence',label:'Chapter sequence',destination:'Expanded Chapter plan',fields:['storyDraft.chapters','currentStory.chapters']},
 {id:'characters',label:'Character roles',destination:'Linked character cards',fields:['characters']},
 {id:'decisions',label:'Pending decisions',destination:'Shared decision review',fields:['workshop.questions']},
 {id:'mechanics',label:'Event mechanics',destination:'Linked events and source audit',fields:['events','escapeMechanics','trustLedger']},
 {id:'research',label:'Historical or factual research',destination:'Research review',fields:['historicalResearch']},
 {id:'history',label:'Revision and review history',destination:'Collapsed History',fields:['synopsisReviewHistory','currentUpdate','editorialResolution']}
];
const valueAt=(data,path)=>path.split('.').reduce((v,k)=>v&&typeof v==='object'?v[k]:undefined,data);
const populated=value=>Array.isArray(value)?value.some(activeRecord):typeof value==='string'?!!value.trim():value&&typeof value==='object'?Object.keys(value).length>0:value!=null;

export function storySectionInventory(data={}){
 return sourceFields.map(({id,label,destination,fields})=>{
  const populatedFields=fields.filter(path=>populated(valueAt(data,path)));
  return {id,label,destination,fields,populatedFields,available:populatedFields.length>0,missing:fields.filter(path=>!populatedFields.includes(path))};
 });
}

export function storyEssenceFields(data={}){
 const root=data.storyEssence&&typeof data.storyEssence==='object'?data.storyEssence:{};
 const foundation=data.foundation&&typeof data.foundation==='object'?data.foundation:{};
 const merged={...foundation,...root};
 const definitions=[
  ['protagonist','Protagonist'],
  ['desire','Goal or desire'],
  ['loss','Loss or inciting wound'],
  ['opposition','Opposition'],
  ['stakes','Stakes']
 ];
 return definitions.map(([key,label])=>({key,label,value:truthyText(merged[key]),source:truthyText(root[key])?'storyEssence.'+key:truthyText(foundation[key])?'foundation.'+key:null}));
}

export function storyClaritySnapshot(data={}){
 const groups=questionGroups(data);
 const characters=(data.characters||[]).filter(activeRecord).map(c=>({
  id:c.id||'',name:truthyText(c.name)||'Unnamed character',
  role:truthyText(c.role),tier:truthyText(c.tier),
  sourceRevision:c.revision??null
 }));
 const source=storySectionInventory(data);
 const essence=storyEssenceFields(data);
 return {source,essence,characters,
  pendingQuestions:[...groups.open,...groups.deferred].filter(activeRecord).map(q=>({id:q.id||'',title:q.title||q.prompt||'Question',status:questionState(q)})),
  totalEvents:count(data.events),
  totalOutlineChapters:count(data.storyDraft?.chapters||data.currentStory?.chapters),
  brief:truthyText(data.summary),
  missingEssence:essence.filter(x=>!x.value).map(x=>x.key)
 };
}

export function storyClarityHTML(snapshot,{characterHref=()=>null}={}){
 return '<details data-story-clarity class="story-source-clarity" style="max-width:100%;overflow-wrap:anywhere"><summary>Story structure and sources</summary>'+
  '<p>The opening remains the saved concise story. Fields below are displayed only when explicitly recorded, not inferred from characters or plot.</p>'+
  '<details data-story-essence><summary>Story at a glance ('+(5-snapshot.missingEssence.length)+'/5 recorded)</summary>'+
  snapshot.essence.map(row=>'<p><strong>'+h(row.label)+'</strong>: <span dir="auto">'+h(row.value||'Not explicitly recorded')+'</span>'+ (row.source?'<small> · '+h(row.source)+'</small>':'')+'</p>').join('')+
  '<p>Missing fields are not automatically filled. A proposed opening must be sourced and approved separately.</p></details>'+
  '<details data-story-inventory><summary>Current section inventory ('+snapshot.source.filter(x=>x.available).length+'/'+snapshot.source.length+' populated)</summary>'+
  snapshot.source.map(section=>'<p><strong>'+h(section.label)+'</strong> · '+h(section.destination)+' · '+(section.available?'Recorded':'No current source')+
    (section.populatedFields.length?' · '+section.populatedFields.map(h).join(', '):'')+'</p>').join('')+'</details>'+
  '<details data-story-roles><summary>Essential character roles ('+snapshot.characters.length+' saved)</summary>'+
  snapshot.characters.map(c=>'<p dir="auto">'+(characterHref(c.id)?'<a href="'+h(characterHref(c.id))+'">'+h(c.name)+'</a>':h(c.name))+
   ' · '+h(c.role||'Role not recorded')+(c.tier?' · '+h(c.tier):'')+
   ' · Source revision '+h(c.sourceRevision??'Unknown')+'</p>').join('')+
  (!snapshot.characters.length?'<p>No linked characters saved.</p>':'')+
  '<p>Biographies remain on the linked character cards; no duplicated biography or automatic role inference.</p></details>'+
  '<p>Active events: '+snapshot.totalEvents+' · Chapter outline entries: '+snapshot.totalOutlineChapters+
  ' · Current pending questions: '+snapshot.pendingQuestions.length+'. Planning records and saved manuscript text are separate.</p></details>';
}
