import {escapeHTML as h} from './dsl-engine.js';
export const retainedNoteGroups=[
 ['Mechanics and working plans',['escapeMechanics','escapeExpansion','plotRepair','escapeRepairProposal','trustLedger']],
 ['Research',['historicalResearch']],
 ['Editorial feedback',['editorialReviews','editorialAudit','claudeReviewBefore11','claudeReviewCh01to19','languageReviewDrafts']],
 ['Saved decisions',['decisions','escapeDecision','structureDecision','editorialResolution']],
 ['Original combined notes',['storyBrief','escapeMechanicsHistory']]
];
const populated=v=>v!=null&&(typeof v==='string'?v.trim().length:Array.isArray(v)?v.length:typeof v==='object'?Object.keys(v).length:true);
export function retainedPlanningNotesHTML(data={}){
 const groups=retainedNoteGroups.map(([title,fields])=>({title,fields:fields.filter(k=>populated(data[k]))})).filter(g=>g.fields.length);
 return '<details data-retained-planning-notes><summary>Planning notes by subject</summary><p>Original saved records, grouped for reading. Proposals and historical notes remain in their recorded state; grouping does not approve them or change the reader synopsis.</p>'+groups.map(g=>'<details data-note-group><summary>'+h(g.title)+' · '+g.fields.length+'</summary>'+g.fields.map(k=>'<details data-note-field="'+h(k)+'"><summary>'+h(k.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase()))+'</summary><pre dir="auto" style="white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%">'+h(typeof data[k]==='string'?data[k]:JSON.stringify(data[k],null,2))+'</pre></details>').join('')+'</details>').join('')+(!groups.length?'<p>No retained planning notes recorded for this book.</p>':'')+'</details>';
}
