import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {storyClaritySnapshot,storyClarityHTML,storySectionInventory,storyEssenceFields} from '../src/story-clarity.js';

const data={summary:'A planned opening, not finished chapter prose.',
 storyEssence:{protagonist:'Current protagonist',desire:'An explicit goal',stakes:'Consequences'},
 foundation:{loss:'Known loss',opposition:'Named opposition'},
 storyBrief:{text:'Full planning synopsis'},
 storyDraft:{chapters:[{id:'chapter1',title:'Chapter One',summary:'Outline'}]},
 characters:[{id:'hero',name:'Current name',role:'Protagonist',revision:7,biography:'Long bio stays on character card'}, {id:'retired',recordStatus:'superseded',name:'Old character'}],
 workshop:{questions:[{id:'q1',status:'open',title:'Open decision'}, {id:'q2',status:'approved',answer:'Approved answer',title:'Settled'}]},
 events:[{id:'e1',status:'approved',title:'Event 1'}],
 escapeMechanics:{plan:'Technical mechanics'},
 historicalResearch:{uncertainty:'Needs verification'},
 synopsisReviewHistory:[{at:'now',note:'Historical note'}],
 chapters:[{body:'Do not touch the manuscript'}]};
const original=structuredClone(data),snapshot=storyClaritySnapshot(data);
assert.equal(snapshot.brief,data.summary);
assert.equal(snapshot.essence.filter(x=>x.value).length,5);
assert.equal(snapshot.characters.length,1);
assert.equal(snapshot.characters[0].role,'Protagonist');
assert.equal(snapshot.totalEvents,1);
assert.equal(snapshot.totalOutlineChapters,1);
assert.equal(snapshot.pendingQuestions.length,1);
assert(snapshot.source.find(s=>s.id==='mechanics').populatedFields.includes('escapeMechanics'));
assert(snapshot.source.find(s=>s.id==='history').available);
assert(snapshot.source.find(s=>s.id==='synopsis').available);
const doc=new JSDOM(storyClarityHTML(snapshot,{characterHref:id=>'#character='+id})).window.document;
assert(doc.querySelector('[data-story-clarity]'));
assert(doc.querySelector('[data-story-essence]'));
assert(doc.querySelector('[data-story-inventory]'));
assert(doc.querySelector('[data-story-roles]'));
assert.equal(doc.querySelector('a').getAttribute('href'),'#character=hero');
assert.match(doc.body.textContent,/Current protagonist/);
assert.doesNotMatch(doc.body.textContent,/Long bio stays on character card/);
assert.match(doc.body.textContent,/Linked character cards/);
assert.match(doc.body.textContent,/no duplicated biography/);
assert.deepEqual(data,original);
const missing=storyClaritySnapshot({summary:'Only text so far',characters:[]});
assert.equal(missing.missingEssence.length,5);
assert.match(new JSDOM(storyClarityHTML(missing)).window.document.body.textContent,/Not explicitly recorded/);
assert(!storySectionInventory({})[0].available);
const escaped=storyClarityHTML(storyClaritySnapshot({storyEssence:{protagonist:'<script>alert(1)</script>'}}));
assert.equal(new JSDOM(escaped).window.document.querySelectorAll('script').length,0);
console.log('PASS shared Story source inventory, explicit essence fields, character roles, pending questions, collapsed view, escapes and unchanged manuscripts');
