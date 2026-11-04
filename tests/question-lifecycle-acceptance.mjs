import assert from 'node:assert/strict';
import {questionPreflight} from '../src/question-preflight.js';
import {questionState,saveQuestionAnswer,validateQuestionSelection,reviseQuestion} from '../src/question-lifecycle.js';
import {questionPackage,importQuestionResponses,reviewQuestionResponse,validateQuestionResponses} from '../src/question-package.js';
import {questionGroups} from '../src/decision-state.js';

for(const language of ['ar','en']){
 const name=language==='ar'?'سالم':'Salem';
 const book={summary:language==='ar'?'هوية سالم محفوظة':'Saved original identity',
  events:[{id:'event',title:'Saved scene',status:'approved',revision:4,summary:'No prose changes'}],
  characters:[{id:'hero',name,revision:3,status:'approved'}],
  workshop:{questions:[
   {id:'settled-name',title:'Correct brother identity',status:'approved',answer:name,eventIds:['event'],characterIds:['hero'],revision:4},
   {id:'open-role',title:'Who carries the clue?',status:'open',answer:'',selectionMode:'single',options:['Ally','Reader'],eventIds:['event'],characterIds:['hero'],sourceChapterId:'ch1',sourceChapterRevision:8},
   {id:'defer-choice',title:'When will the clue be revealed?',status:'open',answer:'',options:['Early','Late']},
   {id:'contradiction',title:'Can these consequences coexist?',status:'open',answer:'',selectionMode:'compatible',options:['Permanently hidden','Publicly revealed'],incompatibleOptionPairs:[['Permanently hidden','Publicly revealed']]}
  ]}
 };
 const chapters=[{id:'ch1',title:'Saved chapter',revision:8,chapter_number:1}];
 const context={bookId:'book',branchId:'branch',baseRevision:17,language,writer:'Benji'};
 const unchanged=structuredClone(book),unchangedChapters=structuredClone(chapters);
 const opening=questionPreflight(book,{...context,chapters,question:book.workshop.questions[1]});
 assert.equal(opening.bookId,'book');
 assert.equal(opening.branchId,'branch');
 assert.equal(opening.language,language);
 assert.equal(opening.revision,17);
 assert(opening.related.some(x=>x.id==='settled-name'));
 assert.equal(opening.chapter.state,'Saved chapter revision matches');
 assert(opening.linked.some(x=>x.id==='ch1'));
 assert.throws(()=>saveQuestionAnswer(book,'settled-name',{answer:'Wrong',writer:'Benji'}),/approved or applied/);
 const revised=reviseQuestion(book,'settled-name',{reason:'New evidence needs author review',writer:'Benji',sourceRevision:17});
 assert.equal(revised.workshop.questions.find(q=>q.id==='settled-name').answer,name);
 assert.equal(revised.workshop.questions.at(-1).status,'open');
 assert.equal(revised.workshop.questions.at(-1).revisesQuestionId,'settled-name');
 const deferred=saveQuestionAnswer(book,'defer-choice',{answer:'Deferred',notes:'Review later',writer:'Benji'});
 assert.equal(questionState(deferred.workshop.questions.find(q=>q.id==='defer-choice')),'deferred');
 assert.equal(questionGroups(deferred).deferred.some(q=>q.id==='defer-choice'),true);
 assert.equal(questionGroups(deferred).pending.some(q=>q.id==='defer-choice'),false);
 assert.throws(()=>validateQuestionSelection(book.workshop.questions[3],{selected:['Permanently hidden','Publicly revealed']}),/contradict/);
 assert.throws(()=>saveQuestionAnswer(book,'contradiction',{answer:'Both',parts:{selected:['Permanently hidden','Publicly revealed'],written:''},writer:'Benji'}),/contradict/);
 const bundle=await questionPackage(book,context,chapters);
 assert(bundle.questions.find(q=>q.id==='settled-name').protected);
 bundle.origin='GPT proposal';
 bundle.responses=[{questionId:'open-role',answer:'Ally',selected:['Ally'],written:'',notes:'Question outcome remains subject to review',reason:'Choose the documented event holder'}];
 const imported=await importQuestionResponses(book,bundle,['open-role'],context,chapters);
 assert.equal(imported.workshop.questions.find(q=>q.id==='open-role').answer,'');
 assert.equal(imported.workshop.responseProposals[0].status,'proposed');
 const proposalId=imported.workshop.responseProposals[0].id;
 const accepted=await reviewQuestionResponse(imported,proposalId,'accept',context,chapters);
 const role=accepted.workshop.questions.find(q=>q.id==='open-role');
 assert.equal(role.answer,'Ally');
 assert.equal(questionState(role),'answered');
 assert.equal(accepted.workshop.responseProposals[0].status,'answer-saved');
 assert.equal(role.updatedBy,'Benji');
 assert.notEqual(questionState(role),'approved');
 assert.equal(accepted.events[0].summary,'No prose changes');
 assert.equal(accepted.characters[0].name,name);
 const stale=structuredClone(imported);
 stale.events[0].summary='Planning changed, do not silently reuse response';
 await assert.rejects(()=>reviewQuestionResponse(stale,proposalId,'accept',context,chapters),/sources changed/);
 await assert.rejects(()=>validateQuestionResponses(book,{...bundle,chapters:[{id:'ch1',revision:7}]},context,chapters),/Chapter sources changed/);
 await assert.rejects(()=>validateQuestionResponses(book,{...bundle,bookId:'different'},context,chapters),/another book/);
 const conflicting={...bundle,responses:[{questionId:'contradiction',answer:'Permanently hidden\nPublicly revealed',selected:['Permanently hidden','Publicly revealed'],written:'',reason:'Invalid pair'}]};
 // The imported response checker must not bypass the manual incompatible pair rule.
 await assert.rejects(()=>importQuestionResponses(book,conflicting,['contradiction'],context,chapters),/contradict/);
 assert.deepEqual(book,unchanged);
 assert.deepEqual(chapters,unchangedChapters);
}
console.log('PASS complete question workflow: protected name, open role, defer, contradictory choices, stale source, attributed import, review, both languages and immutable story');
