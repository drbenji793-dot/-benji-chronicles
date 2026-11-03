import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {findingReviewQueue,findingKinds} from '../src/critique-findings.js';
import {findingsHTML} from '../src/critique-findings-ui.js';
const rows=[
 {id:'minor',title:'Minor issue',status:'proposed',kind:'Interpretation',severity:'Minor'},
 {id:'high',title:'Critical issue',status:'accepted',kind:'Textual fact',severity:'Critical',chapterId:'chap',quote:'Saved evidence'},
 {id:'defer',title:'Deferred',status:'deferred',kind:'Research gap',severity:'Major'},
 {id:'strength',title:'Good passage',status:'proposed',kind:'Strength',severity:'Minor',quote:'Specific saved strength'},
 {id:'history',title:'Finished',status:'accepted',kind:'Interpretation',severity:'Major',continuity:{status:'resolved'}},
 {id:'reject',title:'Not applicable',status:'rejected',kind:'Interpretation',severity:'Critical'},
 {id:'major',title:'Major issue',status:'proposed',kind:'Author preference',severity:'Major'}
];
const original=structuredClone(rows);
const q=findingReviewQueue(rows);
assert.deepEqual(q.counts,{action:3,strengths:1,deferred:1,history:2});
assert.deepEqual(q.groups.action.map(x=>x.id),['high','major','minor']);
assert.deepEqual(q.ordered.map(x=>x.id),['high','major','minor','strength','defer','reject','history']);
assert.equal(findingKinds.includes('Strength'),true);
assert.deepEqual(rows,original);
const html=findingsHTML(rows,{title:'Test book',bookId:'b',branchId:'br'});
const dom=new JSDOM(html);
const titles=[...dom.window.document.querySelectorAll('section > h3')].map(x=>x.textContent);
assert.deepEqual(titles,['Critical issue','Major issue','Minor issue','Good passage','Deferred','Not applicable','Finished']);
assert.match(dom.window.document.body.textContent,/Saved editorial proposals/);
assert.equal(rows[1].status,'accepted');
console.log('PASS severity order, deferred/history/strength separation, stable export, no data writes');
