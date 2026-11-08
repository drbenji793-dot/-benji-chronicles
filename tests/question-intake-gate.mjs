import {installCurrentGuideFixture} from './current-guide-fixture.mjs';
await installCurrentGuideFixture();
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {questionPackage} from '../src/question-package.js';
import {questionIntakeReview,requireQuestionIntake} from '../src/question-intake.js';
import {editQuestion,questionSourcesChanged} from '../src/question-lifecycle.js';
import {renderDSL} from '../src/dsl.js';

for(const language of ['ar','en']){
 const data={summary:language==='ar'?'ملخص القصة المعتمد':'Current saved Story Brief',
  events:[{id:'event',title:'Current scene',revision:2,status:'approved'},{id:'old',recordStatus:'superseded',title:'Retired'}],
  characters:[{id:'hero',name:language==='ar'?'سالم':'Salem',status:'approved'}],
  editorialFindings:[{id:'f',title:'Chapter finding',status:'proposed'}],
  workshop:{questions:[{id:'approved',title:'Approved choice',status:'approved',answer:'Keep',eventIds:['event']}]},
  chapters:[{body:'Original chapter, unchanged'}]};
 const chapters=[{id:'c1',title:'Saved chapter',chapter_number:1,revision:5}];
 const original=structuredClone(data),initial={id:'new',title:'Who hears the message?',note:'A meaningful choice changes scene purpose',decisionKind:'Missing decision',status:'open',sourceScope:'linked',eventIds:['event'],characterIds:[]};
 const scope={bookId:'book',branchId:'branch',baseRevision:10,language,chapterSources:chapters,requireQuestionEvidence:true};
 const result=questionIntakeReview(data,initial,{chapters});
 assert(result.ready);
 assert.equal(result.related.length,1);
 const created=editQuestion(data,'new',initial,{allowCreate:true,writer:'Benji',sourceContext:scope});
 assert.equal(created.workshop.questions.length,2);
 assert.equal(created.workshop.questions[0].answer,'Keep');
 assert.equal(created.workshop.questions[1].sourceScope,'linked');
 assert.equal(created.workshop.questions[1].questionContext.bookId,'book');
 assert.equal('chapterSources' in created.workshop.questions[1].questionContext,false);
 assert.equal('requireQuestionEvidence' in created.workshop.questions[1].questionContext,false);
 assert.equal(questionSourcesChanged(data,created.workshop.questions[1]),false);
 const options=[
  [{...initial,eventIds:[]},/Link an existing event/],
  [{...initial,eventIds:['old']},/unavailable/],
  [{...initial,decisionKind:'Unknown'},/decision type/],
  [{...initial,note:''},/why this question/]
 ];
 for(const [invalid,error] of options)assert.throws(()=>editQuestion(data,'new',invalid,{allowCreate:true,writer:'Benji',sourceContext:scope}),error);
 assert.throws(()=>editQuestion(data,'new',{...initial,title:'Approved choice'},{allowCreate:true,sourceContext:scope}),/already exists/);
 const wide={...initial,id:'wide',sourceScope:'brief',eventIds:[],title:'What should the story direction be?'};
 const broad=editQuestion(data,'wide',wide,{allowCreate:true,writer:'Benji',sourceContext:scope});
 assert.equal(broad.workshop.questions[1].sourceBriefSnapshot,data.summary);
 const portable=await questionPackage(broad,{bookId:'book',branchId:'branch',baseRevision:10,language,writer:'Benji'},chapters);
 assert.equal(portable.questions.find(q=>q.id==='wide').sourceScope,'brief');
 assert.equal(portable.questions.find(q=>q.id==='wide').sourceBriefSnapshot,data.summary);
 assert.equal(questionSourcesChanged({...data,summary:'Changed planning'},broad.workshop.questions[1]),true);
 assert.throws(()=>editQuestion({...data,summary:''},'wide',wide,{allowCreate:true,writer:'Benji',sourceContext:scope}),/requires a saved Story Brief/);
 assert.throws(()=>editQuestion(data,'unlinked',{...initial,id:'unlinked',eventIds:[],sourceChapterId:'missing'},{allowCreate:true,writer:'Benji',sourceContext:scope}),/unavailable/);
 const chapter={...initial,id:'chapterQ',eventIds:[],sourceChapterId:'c1',sourceChapterRevision:5};
 const withChapter=editQuestion(data,'chapterQ',chapter,{allowCreate:true,writer:'Benji',sourceContext:scope});
 assert.equal(withChapter.workshop.questions[1].sourceChapterId,'c1');
 assert.deepEqual(data,original);

 // A legacy source-free question can still be edited without inventing provenance.
 const legacy={...data,workshop:{questions:[{id:'legacy',title:'Existing legacy question',status:'open',note:'Old recorded note',eventIds:[],options:[]}]}};
 const changed=editQuestion(legacy,'legacy',{title:'Existing legacy question',status:'open',note:'Retained historical source gap'},{writer:'Benji',sourceContext:scope});
 assert.equal(changed.workshop.questions[0].title,'Existing legacy question');
}
console.log('PASS new question intake requires current source or explicit Story Brief, decision type and reason, blocks retired/duplicate, preserves old questions and protected choices');
