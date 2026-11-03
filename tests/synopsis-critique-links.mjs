import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {synopsisAuthorityAudit,synopsisAuthorityHTML} from '../src/synopsis-authority.js';

for(const language of ['ar','en']){
 const data={summary:language==='ar'?'ملخص محفوظ':'Saved synopsis',
  storyBrief:{text:'Do not rewrite'},
  editorialFindings:[
   {id:'linked',title:'A linked finding',kind:'Textual fact',status:'proposed',chapterId:'ch1',chapterRevision:8,paragraph:3,quote:'Exact saved excerpt'},
   {id:'linked-event',title:'Event linked issue',kind:'Interpretation',status:'accepted',chapterId:'ch2',paragraph:5,links:[{kind:'events',id:'ev1'}]},
   {id:'unrelated',title:'Unrelated issue',status:'proposed',chapterId:'else'},
   {id:'retired',title:'Old critique',recordStatus:'superseded',chapterId:'ch1'}
  ],
  events:[{id:'ev1',title:'An event',revision:4,status:'approved'}],
  synopsisSections:[{id:'tracked',title:'Sourced section',view:'short',scope:'plan',text:'Unchanged text',
   sources:[{kind:'chapters',id:'ch1',revision:8,snapshot:{id:'ch1',title:'Chapter One',revision:8}},
    {kind:'events',id:'ev1',revision:4,snapshot:{id:'ev1',title:'An event',revision:4,status:'approved'}}]}],
  workshop:{questions:[]}};
 const chapters=[{id:'ch1',title:'Chapter One',revision:8},{id:'ch2',title:'Other chapter',revision:4}];
 const before=structuredClone(data);
 const audit=synopsisAuthorityAudit(data,{bookId:'book',branchId:'branch',view:'short',scope:'plan',chapters});
 const target=audit.sections.find(s=>s.id==='tracked');
 assert.deepEqual(target.linkedFindings.map(f=>f.id),['linked','linked-event']);
 assert.equal(target.linkedFindings[0].paragraph,3);
 assert.equal(target.linkedFindings[0].chapterRevision,8);
 assert.equal(target.linkedFindings[0].evidence,'Explicit source ID match; critique is not an approved correction');
 assert.equal(audit.sections.find(s=>s.id==='summary').linkedFindings.length,0);
 const dom=new JSDOM(synopsisAuthorityHTML(audit,{href:(kind,id)=>kind==='findings'?'#review='+id:null})).window.document;
 assert(dom.querySelector('[data-synopsis-findings]'));
 assert.equal(dom.querySelectorAll('[data-synopsis-findings] a').length,2);
 assert.match(dom.body.textContent,/Paragraph 3/);
 assert.doesNotMatch(dom.querySelector('[data-synopsis-findings]').textContent,/Unrelated issue/);
 assert.deepEqual(data,before);
}
console.log('PASS section critique links require explicit saved source IDs, preserve paragraph evidence, exclude retired/unrelated and never modify text');
