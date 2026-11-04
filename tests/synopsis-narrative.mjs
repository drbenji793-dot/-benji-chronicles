import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {savedNarrative} from '../src/synopsis-narrative.js';
import {selectedSynopsis,sourcePackage} from '../src/source-tools.js';
import {selectedStoryText,storyViewHTML} from '../src/story-workspace.js';
import {sourceReviewHTML,sourceToolsUI} from '../src/source-tools-ui.js';
for(const prose of ['He returned to the city.','عاد إلى المدينة.']){
 const data={summary:'Short summary',storyDraft:{synopsis:prose,chapters:[{id:'ch',summary:'outline note'}]},events:[{id:'e',title:'Repair instruction',summary:'Do not invent an ending',status:'question'}],workshop:{questions:[]}};
 const before=structuredClone(data);assert.equal(savedNarrative(data),prose);assert.equal(selectedSynopsis(data,{view:'full'})[0].text,prose);assert.equal(selectedStoryText(data,'full'),prose);
 const storyDoc=new JSDOM(storyViewHTML(data,'full',{title:'Book',language:'ar',branch:{id:'p',revision:2}})).window.document;assert.match(storyDoc.querySelector('[data-retained-planning]').textContent,/Do not invent/);assert.equal(storyDoc.querySelector('[data-retained-planning]').open,false);
 const pkg=sourcePackage(data,{bookId:'b',branchId:'p',baseRevision:2},{kind:'synopsis',view:'full'}),doc=new JSDOM(sourceReviewHTML(pkg)).window.document;
 assert.equal(pkg.targets[0].text,prose);assert.match(doc.querySelector('[data-retained-planning]').textContent,/Do not invent/);assert.equal(doc.querySelector('[data-retained-planning]').open,false);
 const c={model:()=>data,branch:()=>({id:'p',revision:2}),bookId:'b',chapters:()=>[],writer:()=> 'Benji',route:()=> '#',select:()=>'<select></select>'};
 const ui=new JSDOM(sourceToolsUI(c).synopsisHTML()).window.document;assert(ui.querySelector('[data-synopsis-pending]'));assert.equal(ui.querySelector('[data-synopsis-pending]').open,false);assert.match(ui.querySelector('[data-synopsis-pending]').textContent,/Do not invent/);
 assert.deepEqual(data,before);const missing={events:data.events};assert.equal(savedNarrative(missing),'');assert.match(selectedStoryText(missing,'full'),/No full narrative/);assert.equal(selectedSynopsis(missing,{view:'full'})[0].text,'');
 assert.equal(savedNarrative({...data,storyBrief:{text:'<script>literal authored text</script>'}}),'<script>literal authored text</script>');
}
console.log('PASS narrative fields separated from compiled notes, retained collapsed export and UI, empty state, Arabic/English and unchanged sources');
