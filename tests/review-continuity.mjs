import assert from 'node:assert/strict';
import {reviewQueue,completeEventReview} from '../src/planning-review.js';
import {makeToolProposal,storeToolProposal,reviewToolProposal,verifyToolProposal,toolProposalReview,sourcePackage} from '../src/source-tools.js';
import {pendingWork} from '../src/pending-work.js';
import {applyProposal} from '../src/dsl-workshop-engine.js';
import {reviseQuestion} from '../src/question-lifecycle.js';
import {stampUpdate} from '../src/update-mechanism.js';
import {sourceReviewHTML} from '../src/source-tools-ui.js';
import {JSDOM} from 'jsdom';
for(const language of ['ar','en']){
 const title=language==='ar'?'رسالة سالم':'Salem’s letter';
 const base={summary:'Synopsis',events:[{id:'e',title,summary:'Before',truth:'Old fact'},{id:'next',title:'Consequence',summary:'After'}],links:[{id:'l',from:'e',to:'next',kind:'causes'}],characters:[{id:'c',name:'Salem'}],workshop:{reviewEventIds:['next'],questions:[{id:'q',title:'Approved decision',answer:'Keep',status:'answered',eventIds:['e']}]}};
 const original=JSON.stringify(base),ctx={bookId:'b',branchId:'r',baseRevision:4,writer:'Benji'};
 let reviewed=completeEventReview(base,{id:'next',note:'Checked consequence',sourceRevision:4,eventSnapshot:base.events[1],writer:'Benji'});
 assert.equal(reviewQueue(reviewed).length,0);
 reviewed=JSON.parse(JSON.stringify(reviewed));reviewed.events[0].summary='Upstream changed';assert.equal(reviewQueue(reviewed)[0].id,'next');assert.match(reviewQueue(reviewed)[0].reason,/Previously reviewed/);
 reviewed=completeEventReview(reviewed,{id:'next',note:'Checked new upstream source',sourceRevision:5,eventSnapshot:reviewed.events[1],writer:'Benji'});assert.equal(reviewQueue(reviewed).length,0);
 reviewed.links[0].kind='contradicts';assert.equal(reviewQueue(reviewed).length,1);
 reviewed=completeEventReview(reviewed,{id:'next',note:'Checked changed connection',sourceRevision:6,eventSnapshot:reviewed.events[1],writer:'Benji'});reviewed.events[0].revision=99;reviewed.events[0].updatedAt='later';assert.equal(reviewQueue(reviewed).length,0);reviewed.events[0].archived=true;assert.equal(reviewQueue(reviewed).length,1);
 const proposal={...ctx,kind:'clue',targetId:'e',author:'Benji',reason:'Classify source',values:{type:'clue',truth:'Approved fact'},sourceRefs:[{kind:'events',id:'next'}]};
 let d=storeToolProposal(base,makeToolProposal(base,proposal,ctx)),id=d.workshop.toolProposals[0].id;
 d=reviewToolProposal(d,id,'approved',ctx,[],'Checked source');d=stampUpdate(base,d,{...ctx,revision:4,note:'Save classification'});d=verifyToolProposal(d,id,{...ctx,baseRevision:5},'Reopened fields and sources');
 assert(toolProposalReview(d,d.workshop.toolProposals[0]).ready);assert(!pendingWork(d,ctx).some(x=>x.id===id));
 const recovered=JSON.parse(JSON.stringify(d));assert.deepEqual(recovered,d);recovered.events[1].summary='New consequence';assert(pendingWork(recovered,ctx).some(x=>x.id===id&&x.state==='Sources changed'));assert.throws(()=>verifyToolProposal(recovered,id,{...ctx,baseRevision:6},'Recheck'),/Linked sources changed/);
 const doc=new JSDOM(sourceReviewHTML(sourcePackage(recovered,ctx,{kind:'clue'}))).window.document;assert(doc.body.textContent.includes(title));assert.equal(doc.querySelectorAll('script').length,0);
 const chapters=[{id:'ch',revision:2,title:'Chapter'}];const sp={...ctx,kind:'synopsis',targetId:'summary',author:'Benji',reason:'Source synopsis',values:{text:'New synopsis'},sourceRefs:[{kind:'chapters',id:'ch'}]};
 let sd=storeToolProposal(base,makeToolProposal(base,sp,ctx,chapters)),sid=sd.workshop.toolProposals[0].id;sd=reviewToolProposal(sd,sid,'approved',ctx,chapters,'Checked chapter');assert.throws(()=>verifyToolProposal(sd,sid,{...ctx,baseRevision:5},'Check'),/loaded/);sd=verifyToolProposal(sd,sid,{...ctx,baseRevision:5},'Checked source',chapters);assert(!pendingWork(sd,{...ctx,chapters}).some(x=>x.id===sid));assert(pendingWork(sd,{...ctx,chapters:[{...chapters[0],revision:3}]}).some(x=>x.id===sid&&x.state==='Sources changed'));
 const input={...ctx,questionId:'q',request:'Keep',answer:'Keep',summary:base.summary,changes:[{id:'e',fields:{truth:'Approved truth'}}]};
 let applied=applyProposal(base,input,{...ctx,questionId:'q'});
 const attempt={...ctx,baseRevision:5,request:'Overwrite',summary:base.summary,changes:[{id:'e',fields:{truth:'Other truth'}}]};assert.throws(()=>applyProposal(applied,attempt,{...ctx,baseRevision:5}),/Conflicting approval scope/);
 assert.doesNotThrow(()=>applyProposal(applied,{...attempt,changes:[{id:'e',fields:{notes:'Independent note'}}]},{...ctx,baseRevision:5}));
 const cp={...proposal,baseRevision:5,values:{truth:'Other truth'}};let cd=storeToolProposal(applied,makeToolProposal(applied,cp,{...ctx,baseRevision:5}));assert.throws(()=>reviewToolProposal(cd,cd.workshop.toolProposals.at(-1).id,'approved',{...ctx,baseRevision:5},[],'Try'),/Conflicting approval scope/);
 const revision=reviseQuestion(applied,'q',{sourceRevision:5,reason:'Author requested new review',writer:'Benji'}),qid=revision.workshop.questions.at(-1).id;const changed=applyProposal(revision,{...attempt,questionId:qid},{...ctx,baseRevision:5,questionId:qid});assert.equal(changed.workshop.questions[0].recordStatus,'superseded');assert.equal(changed.workshop.questions[0].answer,'Keep');
 const conflict=structuredClone(base);conflict.workshop.questions[0].status='conflict';assert.throws(()=>applyProposal(conflict,input,{...ctx,questionId:'q'}),/Resolve or reopen/);
 const retired=structuredClone(base);retired.events[0].recordStatus='superseded';assert.throws(()=>applyProposal(retired,input,{...ctx,questionId:'q'}),/missing/);
 assert.equal(JSON.stringify(base),original);
}
console.log('PASS approval collisions, linked revisions, source invalidation, connected review reopening and JSON/HTML recovery in both languages');
const linkedChain={summary:'Summary',events:[{id:'a',title:'A'},{id:'b',title:'B'},{id:'c',title:'C'}],links:[{id:'ab',from:'a',to:'b'},{id:'bc',from:'b',to:'c'}],workshop:{questions:[]}};
const affected=applyProposal(linkedChain,{bookId:'book',branchId:'branch',baseRevision:3,request:'Change',summary:'Summary',changes:[{id:'a',fields:{summary:'Changed'},reason:'Reviewed'}]},{bookId:'book',branchId:'branch',baseRevision:3});
assert.equal(reviewQueue(affected).find(r=>r.id==='b').trigger.relationship,'Recorded direct dependency');assert.equal(reviewQueue(affected).find(r=>r.id==='c').trigger.relationship,'Recorded indirect connection');assert.equal(reviewQueue(affected).find(r=>r.id==='c').trigger.sourceRevision,3);assert.equal(reviewQueue(affected).length,2);
console.log('PASS deduplicated connected review triggers, source revision and direct versus indirect dependency labels');

const {decisionEvidence,same}=await import('../src/planning-evidence.js');
const linkedRecords={events:[{id:'e',characterIds:['hero'],placeIds:['home']}],characters:[{id:'hero',name:'Salem'},{id:'other',name:'Other'}],places:[{id:'home',name:'Village'}],links:[],workshop:{reviewEventIds:['e']}};
const checked=completeEventReview(linkedRecords,{id:'e',eventSnapshot:linkedRecords.events[0],sourceRevision:1,note:'Checked linked sources',writer:'Benji'});
for(const kind of ['characters','places'])for(const remove of [false,true]){
 const changed=structuredClone(checked);if(remove)changed[kind]=[];else changed[kind][0].name='Changed';assert.equal(reviewQueue(changed).length,1);
 assert(!same(decisionEvidence(checked,['e'],false),decisionEvidence(changed,['e'],false)));
}
const metadata=structuredClone(checked);metadata.characters[0].revision=4;metadata.places[0].updatedAt='later';metadata.characters[1].name='Unrelated change';assert.equal(reviewQueue(metadata).length,0);
const old=structuredClone(checked);old.workshop.eventReviews[0].evidence.schema=1;delete old.workshop.eventReviews[0].evidence.records;assert.equal(reviewQueue(old).length,1);
console.log('PASS linked record edits/removals and earlier incomplete snapshots reopen reviews; stamps and unrelated records do not');
