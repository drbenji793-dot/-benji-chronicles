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
const changed=editQuestion(data,'q1',{...data.workshop.questions[0],incompatibleOptionPairs:[['North','Wait']],s¶»§q«^