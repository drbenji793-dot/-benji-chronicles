export const activeRecord=r=>r&&!r.archived&&!['superseded','archived'].includes(r.recordStatus)&&!['superseded','archived'].includes(r.status);
const active=activeRecord;
export const CURRENT_FIELDS=['schema','template','garden','title','summary','hypothesis','rules','characters','relationships','places','decisions','events','links','objects','world','currentStory','storyDraft','workStatus','currentUpdate','recordStamps','storyBrief','structureDecision','editorialResolution','escapeDecision','escapeMechanics','trustLedger','plotRepair','historicalResearch'];
const fields=CURRENT_FIELDS;
// The saved source is an internal comparison snapshot, not current writing guidance.
// Project a copy so stale-draft checks and recovery data remain intact in storage.
function reviewStory(story){
 if(!story||typeof story!=='object')return story;
 const copy=structuredClone(story);
 for(const key of ['source','decisionUpdate','reviewCheckpoint'])delete copy[key];
 if(Array.isArray(copy.chapters))copy.chapters=copy.chapters.filter(active).map(chapter=>{
  const current={...chapter};delete current.draftHistory;return current;
 });
 return copy;
}
// A writing brief is a deliberate projection, never a dump of snapshots and old workbooks.
export function currentPlanning(data={}){
 const out={};for(const key of fields){if(data[key]!==undefined)out[key]=Array.isArray(data[key])?data[key].filter(active).map(r=>structuredClone(r)):structuredClone(data[key]);}
 for(const key of ['currentStory','storyDraft'])if(out[key])out[key]=reviewStory(out[key]);
 out.workshop={questions:(data.workshop?.questions||[]).filter(active).map(r=>structuredClone(r)),reviewEventIds:data.workshop?.reviewEventIds||[],synopsisNeedsReview:!!data.workshop?.synopsisNeedsReview};
 return out;
}
export function currentBookBrief({book,branch,chapters=[]},chapterNumber){
 const planning=currentPlanning(branch.data);
 const selected=chapterNumber?chapters.filter(c=>Math.abs(c.chapter_number-chapterNumber)<=1):chapters;
 return {format:'chronicles-current-book-brief',version:2,timezone:'UTC',generatedAt:new Date().toISOString(),book,source:{branchId:branch.id,revision:branch.revision,updatedAt:branch.updated_at,chapterRevisions:selected.map(c=>({id:c.id,chapter:c.chapter_number,revision:c.revision}))},planning,chapters:structuredClone(selected),proposals:{story:planning.storyDraft||null,records:['characters','relationships','places','decisions','events'].flatMap(k=>(planning[k]||[]).filter(r=>r.recordStatus==='proposed'||['proposal','question'].includes(r.status)).map(r=>({kind:k,record:r})))},unresolved:{unclassified:['characters','relationships','places','decisions'].flatMap(k=>(planning[k]||[]).filter(r=>!r.recordStatus||r.recordStatus==='unclassified').map(r=>({kind:k,id:r.id,name:r.name||r.title}))),pending:planning.workStatus||{},eventReviewIds:planning.workshop.reviewEventIds,synopsisNeedsReview:planning.workshop.synopsisNeedsReview},instructions:['Read current sources before writing. Do not treat proposals or unclassified records as author approvals.','Respect the latest documented author correction. Search current decisions before proposing a replacement name.','Introduce important characters by their established names and give background and setting enough space.','For Egyptian Arabic preserve the author voice, narrator explanation and rhythm; use حافيين rather than حفاة.','Separate language changes from events and motivations. Do not publish prose without author approval.','Before applying changes, recheck branch and chapter revisions. Conflicts require reconciliation.','Snapshots, obsolete workbooks and historical copies are excluded from this package.']};
}
export function stampPlanningChanges(before,after,{writer,revision,note}){
 const data=structuredClone(after),at=new Date().toISOString(),changed=[];
 for(const key of ['characters','relationships','places','decisions','events','objects']){
  if(!Array.isArray(data[key]))continue;
  data[key]=data[key].map(row=>{const old=(before[key]||[]).find(r=>r.id===row.id);if(JSON.stringify(old)===JSON.stringify(row))return row;changed.push({kind:key,id:row.id});return {...row,revision:Number(old?.revision||0)+1,updatedAt:at,updatedBy:writer,sourceRevision:Number(revision)+1,supersedesRevision:old?.revision??null,changeNote:note||row.changeNote};});
 }
 // Only the latest compact change marker lives in current data. Trigger history preserves prior records.
 const roots=['summary','rules','currentStory','storyDraft','world','workStatus','storyBrief'];
 data.recordStamps={...(before.recordStamps||{})};
 for(const key of roots)if(JSON.stringify(before[key])!==JSON.stringify(after[key])){changed.push({kind:key});data.recordStamps[key]={revision:Number(before.recordStamps?.[key]?.revision||0)+1,updatedAt:at,updatedBy:writer,sourceRevision:Number(revision)+1,changeNote:note};}
 data.currentUpdate={at,timezone:'UTC',revision:Number(revision)+1,writer,baseRevision:revision,note,changed,implementation:'planning saved',prose:'Requires editorial review where affected',publication:'Not implied by planning save'};
 return data;
}
