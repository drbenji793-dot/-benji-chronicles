import assert from 'node:assert/strict';import {reviewSynopsis,synopsisReviewState} from '../src/synopsis-review.js';import {storyViewHTML} from '../src/story-workspace.js';import {JSDOM} from 'jsdom';
const d={summary:'The hero returns.',events:[{id:'e',title:'Return',summary:'He comes home',status:'accepted',revision:2}],characters:[{id:'c',name:'Hero'}],workshop:{questions:[],synopsisNeedsReview:true},chapters:[{body:'Do not change'}]};const before=JSON.stringify(d),scope={bookId:'b',branchId:'r',sourceRevision:7,writer:'Benji'},request={view:'short',sourceKeys:['event:e','character:c'],note:'Checked return and identity',status:'reviewed'};
const checked=reviewSynopsis(d,request,scope);assert.equal(synopsisReviewState(checked,'short',scope).status,'Current for selected sources');assert.equal(synopsisReviewState(checked,'full',scope).status,'Not reviewed');assert.equal(checked.summary,d.summary);assert.equal(checked.workshop.synopsisNeedsReview,true);assert.deepEqual(checked.chapters,d.chapters);
const changed=structuredClone(checked);changed.events[0].summary='A different return';const state=synopsisReviewState(changed,'short',scope);assert.equal(state.status,'Needs review');assert(state.changes.some(c=>c.label==='Return'));assert.equal(changed.summary,d.summary);
assert.equal(synopsisReviewState(checked,'short',{...scope,branchId:'other'}).status,'Source scope mismatch');assert.throws(()=>reviewSynopsis(d,{...request,sourceKeys:['event:missing']},scope),/unavailable/);assert.throws(()=>reviewSynopsis(d,{...request,sourceKeys:[]},scope),/Choose/);
const doc=new JSDOM(storyViewHTML(changed,'short',{title:'Book',language:'en',branch:{id:'r',book_id:'b',revision:8}})).window.document;assert(doc.querySelector('[data-synopsis-evidence]').textContent.includes('Needs review'));assert(doc.body.textContent.includes('A different return'));assert.equal(JSON.stringify(d),before);console.log('PASS selected synopsis source snapshots, per-view status, visible differences, guarded scope and unchanged wording');

const {savedStoryBrief}=await import('../src/story-brief.js');
const brief=savedStoryBrief({events:[{id:'old',title:'Retired must not appear',recordStatus:'superseded'},{id:'ok',title:'Accepted event',status:'accepted'},{id:'new',title:'New proposal',status:'proposal'}]});assert(!brief.includes('Retired must not appear'));assert(brief.includes('Approved planning'));assert(brief.includes('Proposed events and open decisions'));
console.log('PASS compiled synopsis separates approved plans and proposals and excludes retired records');

const linked={...d,synopsisMeta:{full:{text:'Approved linked full synopsis',status:'approved',sources:[]}}};
const linkedReview=reviewSynopsis(linked,{...request,view:'full'},scope);assert.equal(linkedReview.synopsisReviews.full.text,'Approved linked full synopsis');assert.equal(synopsisReviewState(linkedReview,'full',scope).status,'Current for selected sources');linkedReview.synopsisMeta.full.text='Changed linked full';assert.equal(synopsisReviewState(linkedReview,'full',scope).status,'Needs review');
console.log('PASS v200 linked synopsis wording remains the source for view review');
const newSource=structuredClone(checked);newSource.places=[{id:'home',name:'New setting'}];assert.equal(synopsisReviewState(newSource,'short',scope).status,'Needs review');
const {pendingWork}=await import('../src/pending-work.js');assert(pendingWork(newSource,scope).some(r=>r.key==='synopsis:short'));
const rechecked=reviewSynopsis(newSource,{...request,sourceKeys:[...request.sourceKeys,'place:home']},scope);assert.equal(rechecked.synopsisReviewHistory.length,1);assert.equal(synopsisReviewState(rechecked,'short',scope).status,'Current for selected sources');
rechecked.characters[0].continuityNotes='New constraint';assert.equal(synopsisReviewState(rechecked,'short',scope).status,'Needs review');
console.log('PASS new source coverage, places, full record evidence, review history and pending synopsis warnings');
const chapterScope={...scope,chapters:[{id:'chapter',title:'Saved chapter',revision:3}]};
const chapterReviewed=reviewSynopsis(d,{...request,sourceKeys:['chapter:chapter']},chapterScope);
assert.equal(synopsisReviewState(chapterReviewed,'short',chapterScope).status,'Current for selected sources');
assert.equal(synopsisReviewState(chapterReviewed,'short',{...chapterScope,chapters:[{id:'chapter',title:'Saved chapter',revision:4}]}).status,'Needs review');
assert.equal(synopsisReviewState(chapterReviewed,'short',{...chapterScope,chapters:[]}).status,'Needs review');
assert.equal(synopsisReviewState(chapterReviewed,'short',{...chapterScope,chapters:[...chapterScope.chapters,{id:'new',title:'New chapter',revision:1}]}).status,'Needs review');
console.log('PASS selected chapter revision evidence, missing chapters and newly added chapter coverage warnings');
const crossView=structuredClone(checked);crossView.storyBrief={text:'New independently saved full synopsis'};assert(synopsisReviewState(crossView,'short',scope).changes.some(c=>c.label==='Related full synopsis changed'));
console.log('PASS related synopsis views warn on independent wording changes');
