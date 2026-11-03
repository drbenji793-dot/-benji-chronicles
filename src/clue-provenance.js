import {activeRecord} from './current-book-brief.js';

const clueTypes=new Set(['twist','clue','secret']);

// Source metadata only. It never approves a literary claim or edits a manuscript.
export function clueProvenance(data,event){
 const replacementId=String(event.replacementEventId||event.replacementId||event.supersededBy||'').trim()||null;
 const replacement=replacementId?(data.events||[]).find(row=>row.id===replacementId&&activeRecord(row)):null;
 return {
  id:event.id||null,
  type:clueTypes.has(event.type)?event.type:'Unclassified',
  savedStatus:event.status||'Not recorded',
  recordStatus:event.recordStatus||'Current or unclassified',
  sourceRevision:event.sourceRevision??null,
  savedRevision:event.revision??null,
  modifiedBy:event.updatedBy||event.toolReview?.approvedBy||null,
  modifiedAt:event.updatedAt||event.toolReview?.at||null,
  proposalReview:event.toolReview?.approvedBy?'Reviewed proposal':'Not recorded',
  replacementId,
  replacementTitle:replacement?.title||replacement?.name||null,
  replacementState:!replacementId?'Not recorded':replacement?'Current linked record':'Linked replacement unavailable'
 };
}
