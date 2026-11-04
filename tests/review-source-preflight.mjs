import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {reviewSourcePreflight,reviewSourcePreflightHTML} from '../src/review-source-preflight.js';
import {findingWorkspace} from '../src/critique-findings-ui.js';

for(const language of ['ar','en']){
 const oldName=language==='ar'?'يوسف':'Yusuf';
 const currentName=language==='ar'?'يحيى':'Yahya';
 const data={summary:'Saved original synopsis, protected',
  events:[
   {id:'approved',title:'Approved event',status:'approved',revision:5,sourceId:'ch1',sourceRevision:8},
   {id:'candidate',title:'Possible event',status:'proposal',revision:1},
   {id:'conflict',title:'Conflicting outcome',status:'conflict',type:'secret'},
   {id:'retired',title:'Retired event',status:'approved',recordStatus:'superseded'}
  ],
  characters:[{id:'hero',name:currentName,aliases:[oldName],status:'approved'}],
  workshop:{questions:[{id:'q',status:'deferred',title:'Unsettled'}]},
  editorialFindings:[
   {id:'name',title:'Check name',status:'proposed',chapterId:'ch1',chapterRevision:8,paragraph:2,
    quote:oldName+' returned',kind:'Interpretation',origin:'Human review',links:[{kind:'character',id:'hero'}]},
   {id:'stale',title:'Changed passage',status:'proposed',chapterId:'ch1',chapterRevision:7,
    quote:'Exact evidence',kind:'Textual fact',origin:'GPT self critique',links:[{kind:'event',id:'candidate'}]},
   {id:'research',title:'Unsupported history',status:'proposed',chapterId:'missing',chapterRevision:1,
    quote:'Old historical claim',kind:'Research gap',origin:'Claude review',links:[{kind:'event',id:'conflict'}]}
  ]
 };
 const chapters=[{id:'ch1',title:'Saved chapter',revision:8,chapter_number:1}];
 const original=structuredClone(data),chaptersOriginal=structuredClone(chapters);
 const result=reviewSourcePreflight(data,chapters);
 assert.deepEqual(result.counts,{approved:1,proposals:1,conflicts:1,unresolved:0,mysteries:1,retired:1,findingWarnings:3});
 const name=result.findings.find(f=>f.id==='name');
 assert.equal(name.names.length,1);assert.equal(name.names[0].currentName,currentName);
 assert.equal(name.warnings.length,0);
 const stale=result.findings.find(f=>f.id==='stale');
 assert(stale.warnings.some(x=>x.includes('revision changed')));
 assert(stale.warnings.some(x=>x.includes('Proposal only')));
 assert(stale.warnings.some(x=>x.includes('not independent')));
 const research=result.findings.find(f=>f.id==='research');
 assert(research.warnings.some(x=>x.includes('Research claim')));
 assert(research.warnings.some(x=>x.includes('metadata unavailable')));
 assert(research.warnings.some(x=>x.includes('Conflict recorded')));
 const text=reviewSourcePreflightHTML(result);
 const doc=new JSDOM(text).window.document;
 assert(doc.querySelector('[data-review-source-preflight]'));
 assert(!doc.querySelector('[data-review-source-preflight]').open);
 assert.match(doc.body.textContent,/Missing setup or mystery timing can be intentional/);
 assert.match(doc.body.textContent,/Recorded name candidate/);
 assert.match(doc.body.textContent,/Current card/);
 assert.match(doc.body.textContent,/No chapter text or author decision is changed/);
 assert.equal(doc.querySelectorAll('script').length,0);
 assert(new JSDOM(findingWorkspace(chapters,true)).window.document.querySelector('[data-review-preflight]'));
 assert.deepEqual(data,original);
 assert.deepEqual(chapters,chaptersOriginal);
}
const missing=reviewSourcePreflight({},[]);
assert.deepEqual(missing.counts,{approved:0,proposals:0,conflicts:0,unresolved:0,mysteries:0,retired:0,findingWarnings:0});
const malicious=reviewSourcePreflight({events:[{id:'a',title:'<script>bad()</script>',status:'approved'}]},[]);
assert.equal(new JSDOM(reviewSourcePreflightHTML(malicious)).window.document.querySelectorAll('script').length,0);
console.log('PASS Review current saved names, source revision drift, proposals, protected conflicts, independent research, deliberate mysteries, Arabic/English and data immutability');
