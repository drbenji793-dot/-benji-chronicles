import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {questionAnswerImpact,questionAnswerImpactHTML} from '../src/question-answer-impact.js';
import {renderDSL} from '../src/dsl.js';

for(const language of ['ar','en']){
 const hero=language==='ar'?'سالم':'Salem';
 const data={
  summary:language==='ar'?'قصة محفوظة':'Saved story summary',
  events:[{id:'event',title:'Source event',summary:'Original',revision:3,status:'approved'}],
  characters:[{id:'hero',name:hero,revision:2,status:'approved'}],
  workshop:{questions:[
   {id:'locked',title:'Protected identity',status:'approved',answer:hero,eventIds:['event'],characterIds:['hero']},
   {id:'choice',title:'Who has the clue?',status:'answered',answer:'Ally',answerHistory:[{answer:'Reader',status:'answered'}],
    eventIds:['event'],characterIds:['hero'],sourceChapterId:'chapter',sourceChapterRevision:4}
  ]}
 };
 const chapters=[{id:'chapter',title:'Current chapter',revision:4,chapter_number:3,body:'Saved prose remains unchanged'}];
 const old=structuredClone(data),chapterOld=structuredClone(chapters);
 const impact=questionAnswerImpact(data,data.workshop.questions[1],{chapters});
 assert.equal(impact.currentAnswer,'Ally');
 assert.equal(impact.earlierAnswer,'Reader');
 assert.equal(impact.changedFromEarlier,true);
 assert.equal(impact.status,'answered');
 assert.equal(impact.protected,false);
 assert.equal(impact.protectedRows.length,1);
 assert.equal(impact.protectedRows[0].answer,hero);
 assert.equal(impact.linkedSources.length,3);
 assert.equal(impact.stale,false);
 assert.match(impact.warnings.join(' '),/protected decisions/i);
 const html=questionAnswerImpactHTML(impact,{href:(kind,id)=>'#'+kind+'/'+id});
 const doc=new JSDOM(html).window.document;
 assert(doc.querySelector('[data-question-answer-impact]'));
 assert(!doc.querySelector('[data-question-answer-impact]').open);
 assert.match(doc.body.textContent,/Earlier recorded answer/);
 assert.match(doc.body.textContent,/Current saved answer/);
 assert.match(doc.body.textContent,/Shared source does not prove contradiction/);
 assert.equal(doc.querySelectorAll('a').length,4);
 assert.equal(doc.querySelectorAll('script').length,0);
 const staleData=structuredClone(data);staleData.events=[];staleData.characters=[];
 const staleImpact=questionAnswerImpact(staleData,data.workshop.questions[1],{chapters:[]});
 assert.equal(staleImpact.stale,true);
 assert(staleImpact.warnings.some(w=>/unavailable/.test(w)));
 assert.deepEqual(data,old);
 assert.deepEqual(chapters,chapterOld);
}
const dangerous=questionAnswerImpactHTML(questionAnswerImpact({summary:'<script>alert(1)</script>',workshop:{questions:[]}},{
 id:'danger',title:'<img src=x onerror=alert(1)>',answer:'<script>unsafe</script>',status:'open'
}));
const unsafe=new JSDOM(dangerous).window.document;
assert.equal(unsafe.querySelectorAll('script,img').length,0);
console.log('PASS saved vs prior answer, protected overlapping decisions, source drift, bilingual evidence, HTML escape and unchanged story');

// Check the actual shared author question cards render the new collapsed panel.
const dom=new JSDOM('<button data-writer="Benji" aria-pressed="true"></button><main></main>',{url:'https://example.test/#book=b&view=dsl&dslview=decisions'});
for(const key of ['window','document','location','MutationObserver','localStorage','FormData','File'])globalThis[key]=dom.window[key];
globalThis.confirm=()=>true;globalThis.requestAnimationFrame=f=>f();dom.window.HTMLDialogElement.prototype.showModal=function(){};
const branch={id:'br',revision:5,name:'Main',data:{summary:'Unchanged summary',events:[{id:'ev',title:'Source event',status:'approved',revision:2}],
 links:[],objects:[],characters:[],workshop:{questions:[
 {id:'locked',title:'Protected decision',status:'approved',answer:'Keep',eventIds:['ev']},
 {id:'question',title:'Open choice',status:'open',answer:'',eventIds:['ev'],options:['Yes','No']}
 ]}}};
const api=async path=>{
 if(path.startsWith('chronicles_dsl_projects'))return [{revision:1}];
 if(path.startsWith('chronicles_dsl_branches'))return [structuredClone(branch)];
 if(path.startsWith('chronicles_books'))return [{id:'b',title:'Test',language:'en'}];
 if(path.includes('chronicles_book_entries')||path.includes('chronicles_chapters'))return [];
 return [];
};
await renderDSL(document.querySelector('main'),api,'b');
const panel=dom.window.document.querySelector('[data-question-answer-impact]');
assert(panel);
assert.equal(panel.open,false);
assert.match(panel.textContent,/Protected related decisions \(1\)/);
assert.match(panel.textContent,/Protected decision/);
assert.equal(branch.data.workshop.questions[0].answer,'Keep');
dom.window.close();
console.log('PASS actual question card displays collapsed before/after and protected related source evidence');

process.exit(0);
