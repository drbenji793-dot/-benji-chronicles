import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {synopsisAuthorityAudit,synopsisAuthorityHTML} from '../src/synopsis-authority.js';

for(const language of ['ar','en']){
 const data={
  summary:language==='ar'?'يوسف في القاهرة':'Yusuf in the city',
  events:[
   {id:'event1',title:language==='ar'?'الحدث الأول':'First event',status:'approved',revision:3},
   {id:'event2',title:'Proposal event',status:'proposed',revision:1},
   {id:'old',title:'Old record',recordStatus:'superseded',revision:2}
  ],
  characters:[{id:'hero',name:language==='ar'?'يحيى':'Yahya',aliases:[language==='ar'?'يوسف':'Yusuf'],status:'approved',revision:7}],
  synopsisSections:[{id:'syn',title:'Author paragraph',view:'short',scope:'plan',text:language==='ar'?'يوسف يبحث عن الحقيقة':'Yusuf seeks the truth',
   status:'proposed',sources:[
    {kind:'events',id:'event1',revision:1,snapshot:{id:'event1',title:'Former title',status:'approved',revision:1}},
    {kind:'events',id:'event2',revision:1,snapshot:{id:'event2',title:'Proposal event',status:'proposed',revision:1}},
    {kind:'events',id:'old',revision:2,snapshot:{id:'old',title:'Old record',recordStatus:'superseded',revision:2}},
    {kind:'events',id:'missing',revision:1,snapshot:{id:'missing',title:'Lost',revision:1}},
    {kind:'characters',id:'hero',revision:7,snapshot:{id:'hero',name:language==='ar'?'يحيى':'Yahya',aliases:[language==='ar'?'يوسف':'Yusuf'],status:'approved',revision:7}}
  ]}],
  workshop:{questions:[{id:'q',title:'An author choice',status:'deferred'},{id:'done',title:'Already settled',status:'approved',answer:'Stay'}]},
  editorialFindings:[{id:'f',title:'Check motive',status:'proposed'},{id:'retired-f',title:'Old idea',status:'rejected'}],
  chapters:[{body:'Always preserve chapter prose'}]
 };
 const before=structuredClone(data);
 const audit=synopsisAuthorityAudit(data,{bookId:'b',branchId:'br',revision:12,view:'short',scope:'plan',chapters:[]});
 assert.equal(audit.bookId,'b');assert.equal(audit.branchId,'br');
 assert.equal(audit.workingRevision,12);
 assert.equal(audit.publishedRevision,null);
 assert.match(audit.publishedState,/not established/);
 assert.equal(audit.sections.length,2);
 const section=audit.sections.find(s=>s.id==='syn');
 assert.equal(section.status,'proposed');
 assert.equal(section.links.find(x=>x.id==='event1').status,'Recorded approval');
 assert.equal(section.links.find(x=>x.id==='event1').changed,true);
 assert.equal(section.links.find(x=>x.id==='event2').status,'Proposal only');
 assert.equal(section.links.find(x=>x.id==='old').status,'Retired source');
 assert.equal(section.links.find(x=>x.id==='missing').status,'Source missing');
 assert.equal(section.links.find(x=>x.id==='hero').status,'Recorded approval');
 assert.equal(section.nameCandidates.length,1);
 assert.equal(section.nameCandidates[0].characterId,'hero');
 assert.match(section.flags.join(' '),/Author review required/);
 assert.deepEqual(audit.questions.map(x=>x.id),['q']);
 assert.deepEqual(audit.findings.map(x=>x.id),['f']);
 const html=synopsisAuthorityHTML(audit,{href:(kind,id)=>kind==='characters'?'#hero/'+id:null});
 const doc=new JSDOM(html).window.document;
 assert(doc.querySelector('[data-synopsis-authority]'));
 assert(doc.querySelector('[data-pending-decisions]'));
 assert(doc.querySelector('[data-editorial-notes]'));
 assert.equal(doc.querySelectorAll('script').length,0);
 assert.match(doc.body.textContent,/Book publication revision not established/);
 assert.match(doc.body.textContent,/Not an automatic correction/);
 assert.equal(doc.querySelector('a')?.getAttribute('href'),'#hero/hero');
 const compact=new JSDOM(synopsisAuthorityHTML(audit,{includeNotes:false})).window.document;
 assert.equal(compact.querySelector('[data-pending-decisions]'),null);
 assert.equal(compact.querySelector('[data-editorial-notes]'),null);
 assert.deepEqual(data,before);
 const published=synopsisAuthorityAudit(data,{bookId:'b',branchId:'br',revision:12,publishedRevision:10,view:'short'});
 assert.equal(published.publishedRevision,10);
 assert.equal(published.publishedState,'Recorded, verify source scope');
}
console.log('PASS synopsis source authority, explicit publication uncertainty, saved revisions, name candidates, pending notes, Arabic/English and unchanged data');
