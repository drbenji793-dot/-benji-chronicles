import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {recordedNameCandidates,textContainsName} from '../src/story-name-review.js';
import {synopsisAuthorityAudit,synopsisAuthorityHTML} from '../src/synopsis-authority.js';

assert.equal(textContainsName('قال يوسف في السوق','يوسف'),true);
assert.equal(textContainsName('اليوسفي في السوق','يوسف'),false);
assert.equal(textContainsName('Joseph enters','joseph'),true);
assert.equal(textContainsName('Josephine enters','joseph'),false);
assert.equal(textContainsName('A (possible) ally','(possible)'),true);
assert.equal(textContainsName('في يد يحيى','يحيى'),true);
assert.equal(textContainsName('','يوسف'),false);
assert.equal(textContainsName('a','a'),false);
const data={summary:'يوسف يواجه الأمر.',characters:[
 {id:'hero',name:'يحيى',aliases:['يوسف','يوسف', {name:'يوسف'}],status:'approved'},
 {id:'other',name:'ليلى',aliases:['علي'],recordStatus:'superseded'}
],workshop:{questions:[]},storyBrief:{text:'يوسف'},
synopsisSections:[{id:'s1',title:'Unlinked source',view:'short',scope:'plan',text:'يوسف يواجه الأمر.',status:'proposed',sources:[]}]};
const before=structuredClone(data);
const candidates=recordedNameCandidates(data,data.summary);
assert.deepEqual(candidates.map(x=>x.characterId),['hero']);
assert.equal(candidates[0].linked,false);
assert.match(candidates[0].review,/without a section source link/);
const withLink=recordedNameCandidates(data,data.summary,{linkedCharacterIds:['hero']});
assert.equal(withLink[0].linked,true);
assert.match(withLink[0].review,/not automatically obsolete/);
const audit=synopsisAuthorityAudit(data,{bookId:'book',branchId:'branch',view:'short',scope:'plan'});
assert.equal(audit.sections.find(x=>x.id==='summary').nameCandidates.length,1);
assert.equal(audit.sections.find(x=>x.id==='s1').nameCandidates.length,1);
const html=synopsisAuthorityHTML(audit);
const doc=new JSDOM(html).window.document;
assert.equal(doc.querySelectorAll('script').length,0);
assert.match(doc.body.textContent,/Recorded alternate name without a section source link/);
assert.deepEqual(data,before);
console.log('PASS Arabic and English name boundaries, linked and unlinked source candidates, retired exclusion, no guessed authority and immutable text');
