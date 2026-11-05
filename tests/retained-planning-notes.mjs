import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {retainedPlanningNotesHTML} from '../src/retained-planning-notes.js';
const data={escapeMechanics:{text:'خطة <script>unsafe</script>'},historicalResearch:['Unverified source'],editorialReviews:[{status:'proposal',text:'Keep as proposal'}],decisions:[{answer:'Approved record'}],storyBrief:{text:'Original combined notes'},chapters:[{text:'Unchanged prose'}],readerSynopsis:{ar:{short:'Reader text'}}};
const original=structuredClone(data),doc=new JSDOM(retainedPlanningNotesHTML(data)).window.document;
assert.equal(doc.querySelectorAll('[data-note-group]').length,5);
assert.equal(doc.querySelectorAll('script').length,0);
for(const el of doc.querySelectorAll('[data-note-field]')){const value=data[el.dataset.noteField];assert.equal(el.querySelector('pre').textContent,typeof value==='string'?value:JSON.stringify(value,null,2));}
assert.equal(doc.querySelectorAll('details[open]').length,0);
assert.deepEqual(data,original);assert(!doc.body.textContent.includes('Unchanged prose'));
assert.match(retainedPlanningNotesHTML({}),/No retained planning notes/);
console.log('PASS subject groups, exact original values, escaped Arabic, collapsed notes and no data mutation');
