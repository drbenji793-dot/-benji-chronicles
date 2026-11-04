import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {sourceExportAudit} from '../src/source-export-audit.js';
import {sourceReviewHTML} from '../src/source-tools-ui.js';
import {sourcePackage} from '../src/source-tools.js';
const base={events:[{id:'a',type:'clue',title:'Approved',status:'approved',truth:'Private truth'},
 {id:'p',type:'clue',title:'Proposal',status:'proposal'},
 {id:'c',type:'secret',title:'Conflict',status:'conflict'},
 {id:'old',type:'twist',title:'Retired',recordStatus:'superseded',status:'approved'}],
 characters:[{id:'hero',name:'Hero',status:'approved'},{id:'retired',recordStatus:'superseded'}],
 workshop:{questions:[{id:'open',status:'deferred'}]},decisions:[]};
const chapters=[{id:'ch',title:'Chapter',revision:2},{id:'oldch',recordStatus:'superseded'}];
const old=structuredClone(base),audit=sourceExportAudit(base,chapters);
assert.equal(audit.retiredCounts.events,1);assert.equal(audit.retiredCounts.chapters,1);
assert.equal(audit.groups['Approved planning metadata'].length,2);
assert.equal(audit.groups['Proposal only'].length,1);
assert.equal(audit.groups['Recorded conflict'].length,1);
assert.equal(audit.groups['Unresolved or pending'].length,1);
assert.equal(audit.entries.some(e=>e.id==='old'||e.id==='oldch'),false);
const pkg=sourcePackage(base,{bookId:'book',branchId:'branch',baseRevision:3},{kind:'clue',chapters});
assert.deepEqual(pkg.sources.chapters.map(x=>x.id),['ch']);
assert(!pkg.targets.some(x=>x.id==='old'));
const html=sourceReviewHTML(pkg),doc=new JSDOM(html).window.document;
assert(doc.querySelector('[data-source-export-audit]'));
assert.match(doc.querySelector('[data-source-export-audit]').textContent,/Proposals, not accepted facts/);
assert.match(html,/Writer review; contains spoilers/);
assert.equal(doc.querySelectorAll('script').length,0);
assert.deepEqual(base,old);
console.log('PASS source classification, proposed versus approved, retired filtering, author spoiler export and immutability');
