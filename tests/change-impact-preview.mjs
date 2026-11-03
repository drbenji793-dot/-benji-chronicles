import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {connectedChangePreview,connectedChangePreviewHTML} from '../src/change-impact-preview.js';

const before={
 summary:'Existing brief <script>alert(1)</script>',
 events:[{id:'e1',title:'Letter',sourceId:'ch1',summary:'Old scene'},{id:'e2',title:'Other',summary:'Another scene'}],
 characters:[{id:'c1',name:'Current name',biography:'Old record'}],
 workshop:{questions:[
  {id:'q1',title:'Protected choice',status:'approved',answer:'Keep accepted route',eventIds:['e1']},
  {id:'q2',title:'A separate decision',status:'applied',answer:'Keep existing character',characterIds:['c1']},
  {id:'q3',title:'Still open',status:'deferred',answer:'Deferred',eventIds:['e1']},
  {id:'q4',title:'Unrelated',status:'approved',answer:'Separate',eventIds:['unrelated']}
 ]},
 decisions:[{id:'f1',title:'Protected recorded fact',status:'approved',text:'Original fact',eventIds:['e1']}],
 chapters:[{id:'ch1',body:'Unchanged original prose'}]
};
const next=structuredClone(before);
next.summary='Revised brief, subject to author approval';
next.events[0].summary='Proposed scene';
next.characters[0].biography='Proposed record';
const original=structuredClone(before),nextOriginal=structuredClone(next);
const args={eventChanges:[{id:'e1',fields:{summary:'Proposed scene'}},{id:'e2',fields:{summary:'Other'}}],recordChanges:[{kind:'characters',id:'c1',fields:{biography:'Proposed record'}}],questionId:'q1'};
const preview=connectedChangePreview(before,next,args);
assert.equal(preview.bookBrief.changed,true);
assert.equal(preview.bookBrief.before,before.summary);
assert.equal(preview.bookBrief.after,next.summary);
assert.equal(preview.proseReview.length,1);
assert.equal(preview.proseReview[0].id,'ch1');
assert.equal(preview.unlinkedEventCount,1);
assert.equal(preview.changedRecords,1);
assert.deepEqual(preview.decisions.map(x=>x.id),['q1','q2','f1']);
assert(preview.decisions.every(x=>!x.changed));
assert.equal(preview.protectedConflict,false);
const rendered=connectedChangePreviewHTML(preview);
const doc=new JSDOM(rendered).window.document;
assert(doc.querySelector('[data-change-brief-review]'));
assert(doc.querySelector('[data-change-decisions]'));
assert(doc.querySelector('[data-change-prose-review]'));
assert.equal(doc.querySelectorAll('script').length,0);
assert.match(doc.body.textContent,/Existing brief <script>alert\(1\)<\/script>/);
assert.match(doc.body.textContent,/Keep accepted route/);
assert.match(doc.body.textContent,/Chapter ID: ch1/);
assert.match(doc.body.textContent,/No chapter text is changed/);
assert.deepEqual(before,original);
assert.deepEqual(next,nextOriginal);
const modified=structuredClone(next);modified.workshop.questions[0].answer='Unapproved replacement';
const protectedImpact=connectedChangePreview(before,modified,args);
assert.equal(protectedImpact.protectedConflict,true);
assert.match(connectedChangePreviewHTML(protectedImpact),/Protected decision differs/);
const blank=connectedChangePreview({summary:'No sources',events:[],workshop:{questions:[]}},{summary:'No sources',events:[]},{eventChanges:[{id:'missing'}]});
assert.equal(blank.decisions.length,0);
assert.equal(blank.unlinkedEventCount,1);
console.log('PASS source backed before/after brief, protected decisions, separate prose review, escaping, conflicts and immutable plan');
