import assert from 'node:assert/strict';
import {stampUpdate} from '../src/update-mechanism.js';
import {currentPlanning,currentBookBrief} from '../src/current-book-brief.js';
const opts={revision:8,writer:'Benji',note:'Approved correction',bookId:'book',branchId:'branch',at:'2026-11-02T04:00:00Z'};
const original={title:'ابن الجبل',summary:'Current',characters:[{id:'c',name:'سالم',revision:2}],events:[{id:'e',characters:'سالم',sourceId:'chapter1',sourceRevision:4,summary:'Old',revision:6},{id:'f',sourceId:'chapter2',revision:3}],links:[{id:'l',from:'e',to:'f'}],workshop:{questions:[{id:'q',question:'Why?',revision:1}]},escapeMechanics:{passage:'old'},sourceDocument:{prose:'Untouched'}};
const next=structuredClone(original);next.characters[0].name='مسعود';next.events[0].summary='Changed';next.links[0].label='Cause';next.workshop.questions[0].answer='Recorded';next.escapeMechanics.passage='Current';
const saved=stampUpdate(original,next,opts);
assert.equal(saved.events[0].sourceRevision,4,'chapter source revision must not become branch revision');
assert.equal(saved.events[0].sourceBranchRevision,8);
assert.equal(saved.characters[0].revision,3);
assert.equal(saved.links[0].revision,1);
assert.equal(saved.workshop.questions[0].revision,2);
assert.equal(saved.recordStamps.escapeMechanics.revision,1);
assert.deepEqual(saved.events[1],original.events[1]);
assert.deepEqual(saved.currentUpdate.dependencies.eventIds,['e','f']);
assert.deepEqual(saved.currentUpdate.dependencies.chapterIds,['chapter1','chapter2']);
assert.equal(saved.currentUpdate.approval.status,'Not inferred');
assert.equal(saved.currentUpdate.recovery.sourceRevision,8);
assert.deepEqual(saved.sourceDocument,original.sourceDocument);
assert.deepEqual(stampUpdate(saved,saved,{...opts,revision:9}),saved,'no-op must not restamp');
assert.equal(original.characters[0].name,'سالم','input immutable');
const removed=structuredClone(original);removed.links=[];
const deletion=stampUpdate(original,removed,opts);
assert(deletion.currentUpdate.changed.some(c=>c.kind==='links'&&c.action==='removed'));
assert.deepEqual(deletion.currentUpdate.dependencies.eventIds,['e','f']);
const retired=structuredClone(original);retired.characters[0].recordStatus='superseded';retired.characters[0].replacedBy='c2';
const retirement=stampUpdate(original,retired,opts);
assert.equal(retirement.currentUpdate.changed[0].replacementId,'c2');
assert.equal(currentPlanning(retirement).characters.length,0);
const brief=currentBookBrief({book:{id:'book'},branch:{id:'branch',revision:9,data:saved}});
assert.equal(brief.planning.currentUpdate.id,'branch:9');assert(!brief.planning.sourceDocument);
assert.throws(()=>stampUpdate(original,next,{...opts,revision:undefined}),/revision/);
const duplicate=structuredClone(original);duplicate.characters.push(duplicate.characters[0]);
assert.throws(()=>stampUpdate(original,duplicate,opts),/duplicate/);
console.log('PASS update records, dependency closure, record stamps, retirement, unchanged data, source revisions and current exports');

const stable={events:[{id:'e',characterIds:['c'],placeId:'p'},{id:'f',placeIds:['p']},{id:'g'}],characters:[{id:'c',name:'Old'}],places:[{id:'p',name:'Home'}],links:[{id:'l',from:'e',to:'g'}]};
for(const kind of ['characters','places']){
 for(const remove of [false,true]){
  const changed=structuredClone(stable);if(remove)changed[kind]=[];else changed[kind][0].name='Changed';
  const result=stampUpdate(stable,changed,opts);
  assert.deepEqual(result.currentUpdate.dependencies.eventIds,kind==='characters'?['e','g']:['e','f','g']);
  assert.deepEqual(result.workshop.reviewEventIds,result.currentUpdate.dependencies.eventIds);
 }
}
console.log('PASS stable character and place dependencies on edits and removals, including downstream events');
