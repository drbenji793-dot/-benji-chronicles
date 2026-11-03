import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {clueProvenance} from '../src/clue-provenance.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';
import {makeToolProposal,storeToolProposal,reviewToolProposal} from '../src/source-tools.js';
import {clueNotices} from '../src/clue-audit.js';

const base={events:[
 {id:'c',title:'Current clue',type:'clue',status:'proposed',revision:2,sourceRevision:3},
 {id:'replacement',title:'The current replacement',status:'approved',revision:4},
 {id:'retired',title:'Retired option',recordStatus:'superseded',revision:1}
],characters:[],workshop:{questions:[]}};
const original=structuredClone(base);
const context={bookId:'book',branchId:'branch',baseRevision:8,writer:'Benji'};
assert.deepEqual(clueProvenance(base,base.events[0]).replacementState,'Not recorded');
assert.equal(clueProvenance(base,base.events[0]).modifiedBy,null);
const input={...context,kind:'clue',targetId:'c',author:'Benji',reason:'Link the replacement for future review',
 sourceRefs:[{kind:'events',id:'c'}],values:{type:'clue',replacementEventId:'replacement'}};
const proposal=makeToolProposal(base,input,context,[]);
assert(proposal.sources.some(x=>x.kind==='events'&&x.id==='replacement'&&x.snapshot.revision===4));
assert.throws(()=>makeToolProposal(base,{...input,values:{...input.values,replacementEventId:'c'}},context),/different current replacement/);
assert.throws(()=>makeToolProposal(base,{...input,values:{...input.values,replacementEventId:'retired'}},context),/different current replacement/);
assert.throws(()=>makeToolProposal(base,{...input,values:{...input.values,replacementEventId:'missing'}},context),/different current replacement/);
const pending=storeToolProposal(base,proposal);
const reviewed=reviewToolProposal(pending,proposal.id,'approved',context,[],'Metadata review only');
const saved=reviewed.events.find(x=>x.id==='c');
const info=clueProvenance(reviewed,saved);
assert.equal(info.id,'c');
assert.equal(info.sourceRevision,3);
assert.equal(info.type,'clue');
assert.equal(info.modifiedBy,'Benji');
assert.match(info.modifiedAt,/^20/);
assert.equal(info.proposalReview,'Reviewed proposal');
assert.equal(info.replacementId,'replacement');
assert.equal(info.replacementState,'Current linked record');
assert.equal(info.replacementTitle,'The current replacement');
assert.deepEqual(base,original);
assert.equal(reviewed.events.find(x=>x.id==='replacement').recordStatus,undefined);
assert.equal(clueNotices(reviewed,saved).some(x=>x.code==='replacementEventId'),false);
const missing=structuredClone(reviewed);missing.events=missing.events.filter(x=>x.id!=='replacement');
assert.equal(clueProvenance(missing,missing.events[0]).replacementState,'Linked replacement unavailable');
assert(clueNotices(missing,missing.events[0]).some(x=>x.code==='replacementEventId'));
const c={model:()=>reviewed,bookId:'book',branch:()=>({id:'branch',revision:9}),chapters:()=>[],writer:()=> 'Benji',route:()=> '#source',select:(n)=>'<select name="'+n+'"></select>',field:n=>'<input name="'+n+'">'};
const ui=sourceToolsUI(c);
const doc=new JSDOM(ui.cluesHTML()).window.document;
const details=doc.querySelector('[data-clue-metadata]');
assert(details);
assert.match(details.textContent,/Stable ID: c/);
assert.match(details.textContent,/Current replacement: The current replacement/);
assert.match(details.textContent,/Modified by: Benji/);
assert.match(details.textContent,/never automatically retires/);
console.log('PASS stable IDs, author and modification metadata, source revision, proposal status and guarded replacement links without source retirement');
