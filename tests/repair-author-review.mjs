import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createFinding,decideFinding} from '../src/critique-findings.js';
import {proposeRepair,decideRepair} from '../src/critique-workflow.js';
import {repairCards} from '../src/critique-workflow-ui.js';
for(const quote of ['Keep this letter and ending.','احتفظ بالرسالة والنهاية.']){
 const chapter={id:'c',revision:1,paragraphs:[quote]},context={bookId:'b',branchId:'p',revision:2,writer:'Benji',language:'ar',chapters:[chapter],chapter,paragraphs:[quote]};
 let d=await createFinding({rules:'Preserve dialogue',events:[],workshop:{questions:[]}},{paragraph:1,quote,title:'Claim',issue:'Unsupported date',impact:'Continuity',repair:'Verify first',kind:'Research gap',severity:'Major',confidence:'Low',recommendation:'Verify',origin:'Human review'},context);
 const id=d.editorialFindings[0].id;d=await decideFinding(d,id,{...context,status:'accepted',note:'Review only'});d=await proposeRepair(d,id,{before:quote,after:quote+' Proposed.',reason:'Separate proposal'},context);const rid=d.editorialFindings[0].repairs[0].id,before=structuredClone(d),choice={status:'approved',note:'Exact repair',protectionReview:'reviewed'};
 await assert.rejects(()=>decideRepair(d,id,rid,choice,{...context,writer:'Ahmed'}),/Benji/);
 await assert.rejects(()=>decideRepair(d,id,rid,{...choice,protectionReview:''},context),/Explicitly/);
 await assert.rejects(()=>decideRepair(d,id,rid,choice,context),/external research/);
 const approved=await decideRepair(d,id,rid,{...choice,researchVerification:'Author checked the cited primary record, page 3; date verified.'},context);assert.equal(approved.editorialFindings[0].repairs[0].authorReview.writer,'Benji');assert.equal(chapter.paragraphs[0],quote);assert.deepEqual(d,before);
 const deferred=await decideRepair(d,id,rid,{status:'deferred',note:'Await source'}, {...context,writer:'Ahmed'});assert.equal(deferred.editorialFindings[0].repairs[0].status,'deferred');
 const doc=new JSDOM(repairCards(d.editorialFindings[0])).window.document;assert(doc.querySelector('[name=protectionReview]'));assert(doc.querySelector('[name=researchVerification]'));assert.match(doc.body.textContent,/Only Benji/);
}
console.log('PASS exact repair author approval, explicit protection review, research evidence requirement, defer, bilingual source preservation and rendered controls');
