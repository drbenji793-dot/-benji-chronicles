import assert from 'node:assert/strict';
import {questionImpactSummary,saveQuestionAnswer,validateQuestionSelection,editQuestion} from '../src/question-lifecycle.js';
const data={events:[{id:'e1',title:'Meeting',revision:3}],characters:[{id:'c1',name:'Person',revision:4}],workshop:{questions:[
 {id:'q1',title:'Which route?',eventIds:['e1'],characterIds:['c1'],options:['North','South','Wait'],incompatibleOptionPairs:[['North','South']],selectionMode:'compatible',answer:''},
 {id:'q2',title:'Already settled',eventIds:['e1'],status:'approved',answer:'Established'}
]}};
const snapshot=JSON.stringify(data);
const summary=questionImpactSummary(data,data.workshop.questions[0]);
assert.match(summary.summary,/1 event, 1 character/);
assert.deepEqual(summary.protectedDecisions,['q2']);
assert.deepEqual(summary.missing,[]);
assert.equal(JSON.stringify(data),snapshot);
assert.throws(()=>validateQuestionSelection(data.workshop.questions[0],{selected:['North','South']}),/contradict/);
assert.throws(()=>saveQuestionAnswer(data,'q1',{answer:'North\nSouth',writer:'Test',parts:{selected:['North','South'],written:''}}),/contradict/);
assert.throws(()=>saveQuestionAnswer(data,'q1',{answer:'Other',writer:'Test',parts:{selected:['Removed'],written:''}}),/no longer available/);
assert.throws(()=>validateQuestionSelection(data.workshop.questions[0],{selected:['North','North']}),/repeat/);
const changed=editQuestion(data,'q1',{...data.workshop.questions[0],incompatibleOptionPairs:[['North','Wait']],status:'open'},{writer:'Test'});
assert.deepEqual(changed.workshop.questions[0].incompatibleOptionPairs,[['North','Wait']]);
assert.throws(()=>editQuestion(data,'q1',{...data.workshop.questions[0],incompatibleOptionPairs:[['North','Not listed']],status:'open'},{writer:'Test'}),/distinct current options/);
const saved=saveQuestionAnswer(data,'q1',{answer:'North',writer:'Test',parts:{selected:['North'],written:''}});
assert.equal(saved.workshop.questions[0].status,'answered');
assert.equal(data.workshop.questions[0].answer,'');
const missing=structuredClone(data);missing.characters=[];
assert.match(questionImpactSummary(missing,missing.workshop.questions[0]).summary,/unavailable/);
const unlinked=questionImpactSummary({workshop:{questions:[]}}, {id:'q3',eventIds:[],characterIds:[]});
assert.match(unlinked.summary,/Source links not recorded/);
const q={...data.workshop.questions[0],selectionMode:'single'};
assert.throws(()=>validateQuestionSelection(q,{selected:['North','Wait']}),/one choice/);
console.log('PASS question impact, protected links, missing sources, incompatible choices, stale options, saved answer and immutability');
