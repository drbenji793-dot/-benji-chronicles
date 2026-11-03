import assert from 'node:assert/strict';
import {synopsisSourceMap} from '../src/synopsis-review.js';
const data={
 summary:'Approved wording is NOT inferred from a summary.',
 events:[{id:'ev1',title:'Recorded event',revision:2,status:'proposal'}],
 characters:[{id:'c1',name:'The current name',revision:3,status:'approved'}],
 synopsisSections:[{id:'s1',title:'Versioned passage',view:'short',scope:'plan',text:'Preserved author text',status:'proposed',sources:[{kind:'events',id:'ev1',revision:1,snapshot:{id:'ev1',title:'Old event',revision:1}}]}],
 workshop:{questions:[{id:'open',title:'An actual choice',status:'open'},{id:'saved',title:'Already answered',answer:'Yes'},{id:'defer',title:'Deferred',status:'deferred'}]}
};
const before=structuredClone(data);
const out=synopsisSourceMap(data,{bookId:'book',branchId:'branch',revision:8,view:'short',scope:'plan',chapters:[]});
assert.equal(out.bookId,'book');assert.equal(out.revision,8);
assert.equal(out.sections.length,2);
assert.equal(out.sections[0].origin,'Current planning summary');
assert.equal(out.sections[0].review,'Sources not verified');
assert.equal(out.sections[1].origin,'Versioned synopsis section');
assert.equal(out.sections[1].sources[0].state,'Needs review');
assert.equal(out.sections[1].sources[0].currentRevision,2);
assert.deepEqual(out.openQuestions.map(q=>q.id),['open','defer']);
assert.deepEqual(data,before);
const none=synopsisSourceMap(data,{view:'chapters',scope:'manuscript'});
assert.equal(none.sections.length,0);
console.log('PASS source provenance, book/branch/revision, stale linked sources, deferred versus answered, empty scope and unchanged text');
