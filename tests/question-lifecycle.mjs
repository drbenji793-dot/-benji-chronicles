import assert from 'node:assert/strict';
import {saveQuestionAnswer,editQuestion,questionLabel} from '../src/question-lifecycle.js';
import {questionGroups} from '../src/decision-state.js';
import {applyProposal,proposalBrief} from '../src/dsl-workshop-engine.js';
const data={summary:'Summary',events:[{id:'e',title:'Event',summary:'Before'}],links:[],sourceDocument:{fields:{legacy:'unchanged'}},workshop:{questions:[{id:'q',title:'Question',status:'answered',answer:'Keep this answer',answerNotes:'Keep notes',options:[],eventIds:['e']},{id:'old',status:'open',recordStatus:'superseded',answer:'Historical'},{id:'done',status:'applied',answer:'Approved fact'},{id:'legacy',status:'deferred',answer:'أؤجل القرار',options:['أؤجل القرار']}]}};
const original=structuredClone(data);
let result=saveQuestionAnswer(data,'q',{answer:'Deferred',writer:'Benji'});
assert.equal(result.workshop.questions[0].answer,'Keep this answer');assert.equal(result.workshop.questions[0].answerNotes,'Keep notes');assert.equal(result.workshop.questions[0].status,'deferred');assert.equal(questionGroups(result).deferred.length,2);
result=editQuestion(result,'q',{status:'open',title:'New title'},{writer:'Benji'});assert.equal(result.workshop.questions.length,4);assert.deepEqual(result.workshop.questions[1],data.workshop.questions[1]);assert.equal(questionGroups(result).pending.length,1);
assert.throws(()=>saveQuestionAnswer(data,'done',{answer:'Overwrite',writer:'Benji'}),/approved or applied/);assert.throws(()=>editQuestion(data,'done',{status:'open'}),/protected/);assert.throws(()=>editQuestion(data,'q',{status:'applied'}),/reviewed change/);assert.throws(()=>saveQuestionAnswer(data,'old',{answer:'Revive'}),/retired/);assert.throws(()=>saveQuestionAnswer(data,'missing',{answer:'Missing'}),/no longer/);
result=saveQuestionAnswer(data,'legacy',{answer:'Fresh answer',notes:'Reason',parts:{selected:[],written:'Fresh answer'},writer:'Benji'});assert.equal(result.workshop.questions[3].status,'answered');assert.equal(questionLabel({status:'approved'}),'Approved · pending application');assert.equal(questionGroups({workshop:{questions:[{id:'c',status:'conflict',answer:'Disputed'}]}}).open.length,1);
const context={bookId:'b',branchId:'r',baseRevision:7,writer:'Benji',questionId:'q'};
const proposal={...context,request:'Answer',answer:'Answer',summary:'Summary',changes:[]};assert.throws(()=>applyProposal(data,proposal,context),/No planning changes/);
result=applyProposal(data,{...proposal,changes:[{id:'e',fields:{summary:'After'}}]},context);assert.equal(result.workshop.questions[0].application.resultingRevision,8);assert.equal(result.workshop.questions[0].status,'applied');assert.equal(result.workshop.questions[0].application.summaryChanged,false);
const brief=JSON.parse(proposalBrief(data,context,'Review',['e']));assert.equal(brief.responseShape.questionId,'q');assert(!brief.story.sourceDocument);assert(!brief.story.workshop.questions.some(q=>q.id==='old'));assert.deepEqual(data,original);
console.log('PASS deferred answer preservation, retained history, protected decisions, truthful application, scoped briefs');
const {reviewQueue,completeEventReview}=await import('../src/planning-review.js');
const queueData={...data,workshop:{...data.workshop,reviewEventIds:['e','e','missing']}};
assert.equal(reviewQueue(queueData).length,2);
assert.throws(()=>completeEventReview(queueData,{id:'e',note:'',sourceRevision:7}),/what you checked/);
assert.throws(()=>completeEventReview(queueData,{id:'e',note:'Checked',sourceRevision:7,eventSnapshot:{}}),/changed/);
const checked=completeEventReview(queueData,{id:'e',note:'Checked linked consequence',sourceRevision:7,eventSnapshot:data.events[0],writer:'Benji'});
assert.deepEqual(checked.workshop.reviewEventIds,['missing']);assert.deepEqual(checked.events,data.events);assert.equal(checked.workshop.eventReviews[0].scope,'Planning event only; no chapter approval');assert.equal(queueData.workshop.reviewEventIds.length,3);
console.log('PASS connected review evidence, missing references, stale event guard and unchanged prose');

const {reviseQuestion,questionState}=await import('../src/question-lifecycle.js');
assert.equal(questionState({status:'open',answer:'أؤجل القرار'}),'deferred');
assert.equal(questionState({status:'conflict',answer:'Deferred'}),'conflict');
const revised=reviseQuestion(data,'done',{reason:'New evidence',writer:'Benji',sourceRevision:7});
assert.deepEqual(revised.workshop.questions[2],data.workshop.questions[2]);
const revisionQuestion=revised.workshop.questions.at(-1);
assert.equal(revisionQuestion.revisesQuestionId,'done');assert.equal(revisionQuestion.answer,'');assert.equal(revisionQuestion.previousAnswer,'Approved fact');
assert.throws(()=>reviseQuestion(revised,'done',{reason:'Again',sourceRevision:7}),/already exists/);
assert.throws(()=>editQuestion(data,'done',{status:'applied',answer:'Silent overwrite'}),/protected/);
const afterAnswer=saveQuestionAnswer(data,'q',{answer:'New answer',writer:'Benji'});
assert.equal(afterAnswer.workshop.questions[0].answerHistory.at(-1).answer,'Keep this answer');
assert.deepEqual(data,original);
console.log('PASS legacy deferrals, immutable decisions, linked revision proposals and answer recovery');

const revisionContext={...context,questionId:revisionQuestion.id};
const revisionProposal={...proposal,...revisionContext,changes:[{id:'e',fields:{summary:'Revised event'}}]};
const revisionApplied=applyProposal(revised,revisionProposal,revisionContext);
assert.equal(revisionApplied.workshop.questions[2].recordStatus,'superseded');
assert.equal(revisionApplied.workshop.questions[2].answer,'Approved fact');
assert.equal(revisionApplied.workshop.questions[2].replacedBy,revisionQuestion.id);
assert.equal(revisionApplied.workshop.questions.at(-1).status,'applied');
assert.throws(()=>applyProposal(revised,{...revisionProposal,questionId:'q'},revisionContext),/another question/);
const staleOriginal=structuredClone(revised);staleOriginal.workshop.questions[2].answer='Newer approved fact';
assert.throws(()=>applyProposal(staleOriginal,revisionProposal,revisionContext),/original decision changed/);
console.log('PASS scoped revision application, historical decision retention and stale original rejection');

const approved=structuredClone(data);approved.workshop.questions[0].status='approved';
assert.throws(()=>applyProposal(approved,{...proposal,changes:[{id:'e',fields:{summary:'After'}}]},context),/approved answer cannot/);
assert.equal(applyProposal(approved,{...proposal,answer:'Keep this answer',changes:[{id:'e',fields:{summary:'After'}}]},context).workshop.questions[0].status,'applied');
console.log('PASS approved answer application preserves its exact decision');

const {applicationReview,verifyDecisionApplication,decisionEvidence}=await import('../src/decision-verification.js');
const {stampUpdate}=await import('../src/update-mechanism.js');
const linked=structuredClone(data);linked.events.push({id:'later',title:'Consequence',summary:'Unchanged'});linked.links=[{id:'link',from:'e',to:'later',kind:'causes'}];linked.events[1].characterIds=['hero'];linked.events[1].placeId='home';linked.characters=[{id:'hero',name:'Salem'}];linked.places=[{id:'home',name:'Village'}];
const applied=applyProposal(linked,{...proposal,changes:[{id:'e',fields:{summary:'After'}}]},context);
let stamped=stampUpdate(linked,applied,{writer:'Benji',revision:7,note:'Apply',bookId:'b',branchId:'r'});
assert.equal(applicationReview(stamped,stamped.workshop.questions[0],context).ready,false);
assert.throws(()=>verifyDecisionApplication(stamped,'q',{...context,sourceRevision:8,note:'Checked'}),/connected event checks/);
const cleared=completeEventReview(stamped,{id:'later',note:'Checked consequence',sourceRevision:8,eventSnapshot:stamped.events[1],writer:'Benji'});
assert.equal(applicationReview(cleared,cleared.workshop.questions[0],context).ready,true);
assert.throws(()=>verifyDecisionApplication(cleared,'q',{...context,sourceRevision:9,note:''}),/Record what/);
assert.throws(()=>verifyDecisionApplication(cleared,'q',{...context,branchId:'other',sourceRevision:9,note:'Checked'}),/another book or path/);
const verified=verifyDecisionApplication(cleared,'q',{...context,sourceRevision:9,note:'Checked event and downstream consequence'});
assert.equal(verified.workshop.questions[0].status,'resolved');assert.deepEqual(verified.events,cleared.events);assert.deepEqual(verified.sourceDocument,data.sourceDocument);
const changed=structuredClone(verified);changed.events[1].summary='Later evidence contradicts it';
assert.equal(applicationReview(changed,changed.workshop.questions[0],context).stale,true);
const {pendingWork}=await import('../src/pending-work.js');
assert.equal(pendingWork(changed,context).find(x=>x.id==='q').state,'Sources changed');
assert(!pendingWork(verified,context).some(x=>x.id==='q'));
assert.equal(applicationReview(data,data.workshop.questions[2],context).ready,false);
console.log('PASS stamped application evidence, downstream review gate, explicit verification, changed-source reopening and unchanged story data');
{
// Mixed states must count the same after portable JSON reopening.
const {questionGroups}=await import('../src/decision-state.js');
const {questionState}=await import('../src/question-lifecycle.js');
const {answersHTML}=await import('../src/answer-export.js');
const mixed={events:[],links:[],workshop:{questions:[{id:'open',status:'open',answer:''},{id:'answer',status:'answered',answer:'Saved'},{id:'approved',status:'approved',answer:'Approved'},{id:'defer',status:'deferred',answer:'Earlier answer retained'},{id:'conflict',status:'conflict',answer:'Conflicting'},{id:'apply',status:'applied',answer:'Applied'},{id:'resolve',status:'resolved',answer:'Resolved'},{id:'reject',status:'rejected',answer:''}]}};
const reopened=JSON.parse(JSON.stringify(mixed));assert.deepEqual(reopened.workshop.questions.map(questionState),['open','answered','approved','deferred','conflict','applied','resolved','rejected']);const grouped=questionGroups(reopened);assert.deepEqual(grouped.open.map(q=>q.id),['open','conflict']);assert.deepEqual(grouped.pending.map(q=>q.id),['answer','approved']);assert.deepEqual(grouped.deferred.map(q=>q.id),['defer']);
const portable=answersHTML({format:'chronicles-dsl',bookId:'book',branch:{id:'branch',revision:1,data:reopened}});for(const q of mixed.workshop.questions)assert(portable.includes(q.id));assert.equal(reopened.workshop.questions[3].answer,'Earlier answer retained');
console.log('PASS all question states, mixed counters, retained deferred answers and portable reopening');

}
{
 const {questionSourcesChanged}=await import('../src/question-lifecycle.js');
 const base={events:[{id:'e',title:'Current source',summary:'Current fact'}],characters:[],workshop:{questions:[]}};
 const values={title:'Who learns the fact?',note:'Reveal order determines the next scene',options:['Hero','Reader'],selectionMode:'single',eventIds:['e'],status:'open'};
 const made=editQuestion(base,'new',values,{allowCreate:true,writer:'Benji',sourceContext:{bookId:'b',branchId:'r',baseRevision:2}});
 assert.throws(()=>editQuestion(made,'duplicate',values,{allowCreate:true}),/already exists/);assert.throws(()=>editQuestion(base,'no-reason',{...values,note:''},{allowCreate:true}),/why/);assert.throws(()=>saveQuestionAnswer(made,'new',{answer:'Hero\nReader',parts:{selected:['Hero','Reader'],written:''}}),/one choice/);
 assert.equal(questionSourcesChanged(made,made.workshop.questions[0]),false);made.events[0].summary='Changed fact';assert.equal(questionSourcesChanged(made,made.workshop.questions[0]),true);assert.equal(made.workshop.questions[0].questionSources[0].content.summary,'Current fact');
}
console.log('PASS manual question reasons, duplicate protection, explicit choice compatibility and source change evidence');

{
const base={events:[],workshop:{questions:[{id:'parent',title:'Choose direction',status:'approved',answer:'North',selectionMode:'single',options:['North','South']}]}};
const revised=reviseQuestion(base,'parent',{reason:'Reconsider route',sourceRevision:4,writer:'Benji'}),q=revised.workshop.questions.at(-1);
assert.equal(q.selectionMode,'single');assert.doesNotThrow(()=>editQuestion(revised,q.id,{title:q.title,status:'open',note:'Clarify choice'},{writer:'Benji'}));
assert.throws(()=>editQuestion(revised,'unrelated',{title:q.title,status:'open',note:'Duplicate'},{allowCreate:true}),/already exists/);
assert.throws(()=>saveQuestionAnswer(revised,q.id,{answer:'North and South',parts:{selected:['North','South'],written:''}}),/one choice/);
}
console.log('PASS linked revision remains editable while preserving its choice policy and unrelated duplicate guards');

for(const kind of ['characters','places'])for(const remove of [false,true]){
 const changed=structuredClone(verified);if(remove)changed[kind]=[];else changed[kind][0].name='New source';
 assert.equal(applicationReview(changed,changed.workshop.questions[0],context).stale,true);
 assert.equal(pendingWork(changed,context).find(x=>x.id==='q').state,'Sources changed');
}
console.log('PASS verified event decisions reopen when downstream character/place sources change or disappear');

{
const missing=structuredClone(cleared);missing.characters=[];
missing.workshop.questions[0].application.evidence=decisionEvidence(missing,missing.workshop.questions[0].application.evidenceEventIds||missing.workshop.questions[0].application.eventIds||[],missing.workshop.questions[0].application.summaryChanged);
assert.match(applicationReview(missing,missing.workshop.questions[0],context).reason,/linked character or place is unavailable/);
}
