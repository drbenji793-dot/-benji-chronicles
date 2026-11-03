import {questionPackageUI} from './question-package-ui.js';
import {recordFields,applyRecordChanges} from './structured-changes.js';
import {applicationReview,verifyDecisionApplication} from './decision-verification.js';
import {pendingWorkHTML} from './pending-work.js';
import {reviewQueue,completeEventReview} from './planning-review.js';
import {saveQuestionAnswer,editQuestion,isDeferral,questionLabel,questionState,protectedDecision,reviseQuestion,questionSourcesChanged,questionImpactSummary} from './question-lifecycle.js';
import {questionGroups} from './decision-state.js';
export {questionGroups} from './decision-state.js';
import {activeRecord,recordState} from './current-book-brief.js';
import {chapterDraftLinks} from './current-story.js';
import {backupJSON,answersHTML} from './answer-export.js';
import {escapeHTML as h,clone,activeEvents,compareStories,impactedEvents,readableStory} from './dsl-engine.js';
import {getCharacters} from './dsl-master.js';
import {applyProposal,proposalBrief,relatedEvents,orderedScenes} from './dsl-workshop-engine.js';
export function workshopUI(ctx){
 const {model,branch,branches,bookId,route,readable,modal,field,area,select,submit,saveData,render,editEvent,fork,preview,download,writer,status}=ctx;
 const button=(label,attr)=>`<button type="button" ${attr}>${label}</button>`;
 const context=()=>({bookId,branchId:branch().id,baseRevision:branch().revision,writer:writer()});
 const portable=questionPackageUI({source:ctx.questionSource,modal¶»§q«^