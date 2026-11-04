import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {sourceReviewHTML,sourceAuditHTML} from '../src/source-tools-ui.js';
import {sourcePackage} from '../src/source-tools.js';
const data={events:[
 {id:'approved',title:'Verified plan',type:'clue',truth:'Private story detail',status:'approved',revision:4},
 {id:'proposal',title:'Working possibility',type:'twist',status:'proposal',revision:1},
 {id:'retired',title:'Old discarded plot',type:'secret',recordStatus:'superseded',status:'approved',revision:1}
],characters:[],workshop:{questions:[]},decisions:[]};
const before=structuredClone(data),chapters=[{id:'ch',title:'Current',revision:1},{id:'retired-ch',recordStatus:'superseded'}],chaptersBefore=structuredClone(chapters);
const p=sourcePackage(data,{bookId:'book',branchId:'path',baseRevision:4},{kind:'clue',chapters});
const html=sourceReviewHTML(p),dom=new JSDOM(html).window.document;
const audit=dom.querySelector('[data-source-export-audit]');
assert(audit);
assert(!audit.open);
assert.match(audit.textContent,/Recorded approvals/);
assert.match(audit.textContent,/Proposals, not accepted facts/);
assert.match(audit.textContent,/Retired records excluded/);
assert(!audit.textContent.includes('retired-ch'));
assert.equal(p.sources.chapters.length,1);
assert(!p.targets.some(t=>t.id==='retired'));
assert(!p.sourceAudit.entries.some(t=>t.id==='retired'));
assert.match(html,/Writer review; contains spoilers/);
assert(!dom.querySelector('script'));
assert.match(sourceAuditHTML(null),/older review package/);
assert.deepEqual(data,before);
assert.deepEqual(chapters,chaptersBefore);
console.log('PASS portable source HTML visibly distinguishes approved and proposed records, filters retired sources, keeps spoilers in writer view');
