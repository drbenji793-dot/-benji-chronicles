import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {questionPackage,parseQuestionPackage,validateQuestionResponses,importQuestionResponses,reviewQuestionResponse} from '../src/question-package.js';
import {questionPackageUI} from '../src/question-package-ui.js';
import {stampUpdate} from '../src/update-mechanism.js';
for(const language of ['ar','en']){
 const base={summary:'Keep story',events:[{id:'e',title:'Event'}],characters:[],workshop:{questions:[{id:'q',title:language==='ar'?'مين يعرف؟':'Who knows?',status:'open',answer:'',options:['Hero','Reader'],selectionMode:'single',eventIds:['e']},{id:'locked',title:'Settled name',status:'approved',answer:'Salem',options:[]}]}};
 const original=JSON.stringify(base),context={bookId:'b',branchId:'r',baseRevision:3,language,writer:'Benji'},chapters=[{id:'ch',revision:2,title:'Chapter',chapter_number:1}];
 const p=await questionPackage(base,context,chapters);p.origin='GPT proposal';p.responses=[{questionId:'q',answer:'Hero',selected:['Hero'],written:'',notes:'Review consequence',reason:'Clarifies knowledge'}];assert.equal(parseQuestionPackage(JSON.stringify(p)).origin,'GPT proposal');
 for(const change of [{bookId:'other'},{branchId:'other'},{language:'other'},{baseRevision:4},{planningFingerprint:'bad'},{chapters:[]}])await assert.rejects(()=>validateQuestionResponses(base,{...p,...change},context,chapters));
 await assert.rejects(()=>validateQuestionResponses(base,{...p,responses:[...p.responses,...p.responses]},context,chapters),/duplicate/);
 await assert.rejects(()=>validateQuestionResponses(base,{...p,responses:[{...p.responses[0],selected:['Hero','Reader']}]},context,chapters),/one option/);
 await assert.rejects(()=>validateQuestionResponses(base,{...p,responses:[{...p.responses[0],questionId:'locked'}]},context,chapters),/protected/);
 let imported=await importQuestionResponses(base,p,['q'],context,chapters);assert.equal(imported.workshop.questions[0].answer,'');assert.equal(imported.workshop.responseProposals[0].status,'proposed');assert.equal(JSON.stringify(base),original);
 await assert.rejects(()=>importQuestionResponses(imported,p,['q'],context,chapters),/already imported/);
 imported=stampUpdate(base,imported,{revision:3,writer:'Benji',note:'Import responses',bookId:'b',branchId:'r'});const id=imported.workshop.responseProposals[0].id;
 const accepted=await reviewQuestionResponse(imported,id,'accept',{...context,baseRevision:4},chapters);assert.equal(accepted.workshop.questions[0].answer,'Hero');assert.equal(accepted.workshop.questions[0].status,'answered');assert.deepEqual(accepted.events,base.events);assert.equal(accepted.summary,base.summary);assert.equal(accepted.workshop.questions[1].answer,'Salem');
 const stale=structuredClone(imported);stale.events[0].title='Changed';await assert.rejects(()=>reviewQuestionResponse(stale,id,'accept',context,chapters),/sources changed/);
 await assert.rejects(()=>reviewQuestionResponse(imported,id,'accept',context,[{...chapters[0],revision:3}]),/sources changed/);
 const deferred=await reviewQuestionResponse(stale,id,'defer',context,chapters);assert.equal(deferred.workshop.responseProposals[0].status,'deferred');assert.equal((await reviewQuestionResponse(deferred,id,'reopen',context,chapters)).workshop.responseProposals[0].status,'proposed');
 // Actual shared modal handlers: file preview does not save; explicit selection imports;
 // acceptance saves an answer but leaves event/story content unchanged.
 const dom=new JSDOM('<main></main>',{url:'https://test.invalid/'});globalThis.document=dom.window.document;let data=structuredClone(base),rev=3,writes=0;const source=async()=>({data:structuredClone(data),context:{...context,baseRevision:rev},chapters});
 const ctx={source,modal:(title,html)=>{document.querySelector('dialog')?.remove();const m=document.createElement('dialog');m.innerHTML='<h2>'+title+'</h2>'+html;document.body.append(m);return m;},download:()=>{},save:async next=>{data=next;rev++;writes++;},close:()=>document.querySelector('dialog')?.remove(),render:()=>{},busy:()=>{}};
 const ui=questionPackageUI(ctx),root=document.querySelector('main');root.innerHTML=ui.actions;ui.bind(root);root.querySelector('[data-question-responses]').click();const input=document.querySelector('[data-question-file]');Object.defineProperty(input,'files',{value:[{size:JSON.stringify(p).length,text:async()=>JSON.stringify(p)}]});await input.onchange();assert.equal(writes,0);document.querySelector('[data-response-select]').checked=true;await document.querySelector('[data-save-responses]').onclick({target:document.querySelector('[data-save-responses]')});assert.equal(writes,1);assert.equal(data.workshop.questions[0].answer,'');
 root.querySelector('[data-response-review]').click();await new Promise(r=>setTimeout(r,0));document.querySelector('[data-proposal-select]').checked=true;await document.querySelector('[data-response-action=accept]').onclick();assert.equal(writes,2);assert.equal(data.workshop.questions[0].answer,'Hero');assert.deepEqual(data.events,base.events);dom.window.close();
}
console.log('PASS portable questions, scoped/stale imports, protected choices, proposal review, duplicate guards, JSON reopening and actual Arabic/English modal handlers');
{
 const {workshopUI}=await import('../src/dsl-workshop.js');
 const data={events:[{id:'e',title:'Current event',summary:'Current fact'}],characters:[],workshop:{questions:[{id:'q',title:'Open question',status:'open',options:[],eventIds:['e'],decisionKind:'Author preference',urgency:'High',blocksWriting:true},{id:'old',title:'Earlier decision',status:'approved',answer:'Preserve the approved name',eventIds:['e']}]}};
 const ui=workshopUI({model:()=>data,branch:()=>({id:'r',revision:5}),bookId:'b',writer:()=> 'Benji',route:()=> '#review'}),doc=new JSDOM(ui.questionsHTML()).window.document;
 const card=doc.querySelector('[data-question-card=q]');assert(card.textContent.includes('Existing protected decision'));assert(card.textContent.includes('Preserve the approved name'));assert(card.textContent.includes('Author preference'));assert(card.textContent.includes('High'));assert(card.textContent.includes('Blocks writing'));assert.equal(card.querySelector('[data-question-facts]').open,false);
}
console.log('PASS current linked protected decisions and explicit urgency/type/writing impact on question cards');
