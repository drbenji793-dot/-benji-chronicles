import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {makeToolProposal,storeToolProposal,reviewToolProposal,sourcePackage,selectedSynopsis} from '../src/source-tools.js';
import {selectedStoryText,storyViewHTML} from '../src/story-workspace.js';
import {sourceToolsUI,sourceReviewHTML} from '../src/source-tools-ui.js';
import {synopsisAuthorityAudit} from '../src/synopsis-authority.js';

// The supported approval path overlays the narrative. Never replace the original bible.
for(const language of ['ar','en']){
 const original=language==='ar'?'القصة الأصلية\nتعليمات المراجعة\nنهايات بديلة لم تعتمد':'Original story bible\nEditorial instructions\nUnapproved alternative endings';
 const narrative=language==='ar'?'عاد المسافر إلى مدينته بحثًا عن أخيه.':'The traveller returned to his city to find his brother.';
 const data={summary:'Original short summary',storyBrief:{text:original,styleGuide:'Preserve source guidance'},events:[{id:'e',title:'Return',summary:'He returns',status:'approved',revision:3}],characters:[],workshop:{questions:[{id:'open',title:'Choose the ending',status:'deferred'},{id:'settled',title:'Settled choice',status:'approved',answer:'Return'}]}};
 const chapters=[{id:'chapter',body:'Untouched saved manuscript',revision:7}],before=structuredClone(data),savedChapters=structuredClone(chapters);
 const context={bookId:'book',branchId:'branch',baseRevision:5,writer:'Benji'};
 const proposal=makeToolProposal(data,{...context,kind:'synopsis',targetId:'full',author:'Reviewer',reason:'Separate narrative from retained instructions',values:{text:narrative},sourceRefs:[{kind:'events',id:'e'}]},context,chapters);
 const pending=storeToolProposal(data,proposal);
 assert.equal(selectedStoryText(pending,'full'),original);
 assert.throws(()=>reviewToolProposal(pending,proposal.id,'approved',{...context,writer:'Guest'},chapters,'Review'),/Benji/);
 const stale=structuredClone(pending);stale.events[0].summary='Changed event';
 assert.throws(()=>reviewToolProposal(stale,proposal.id,'approved',context,chapters,'Review'),/changed/);
 const approved=reviewToolProposal(pending,proposal.id,'approved',context,chapters,'Narrative reviewed; endings remain unresolved');
 // Simulate save and reopen through JSON, the database representation.
 const reopened=JSON.parse(JSON.stringify(approved));
 assert.equal(selectedStoryText(reopened,'full'),narrative);
 assert.equal(selectedSynopsis(reopened,{view:'full'})[0].text,narrative);
 assert.deepEqual(reopened.storyBrief,before.storyBrief);
 assert.deepEqual(reopened.events,before.events);
 assert.deepEqual(reopened.workshop.questions,before.workshop.questions);
 assert.equal(reopened.summary,before.summary);
 assert.deepEqual(chapters,savedChapters);assert.deepEqual(data,before);
 const story=new JSDOM(storyViewHTML(reopened,'full',{title:'Book',language,branch:{id:'branch',revision:6}})).window.document;
 const retained=story.querySelector('[data-retained-planning]');
 assert.equal(retained.open,false);assert(retained.textContent.includes(original));assert(!retained.textContent.includes(narrative));
 assert.equal(story.querySelector('body > div').textContent,narrative);
 assert.equal(story.querySelector('body > div').getAttribute('dir'),language==='ar'?'rtl':'ltr');
 const pkg=sourcePackage(reopened,context,{kind:'synopsis',view:'full',chapters});
 const exported=new JSDOM(sourceReviewHTML(pkg)).window.document;
 assert.equal(pkg.targets[0].text,narrative);assert.equal(pkg.planningNotes,original);
 assert.equal(exported.querySelector('[data-retained-planning]').open,false);
 assert(exported.querySelector('[data-retained-planning]').textContent.includes(original));
 const ui=sourceToolsUI({model:()=>reopened,branch:()=>({id:'branch',revision:6}),bookId:'book',chapters:()=>chapters,writer:()=> 'Benji',route:()=> '#source',select:()=> '<select></select>'});
 const page=new JSDOM(ui.synopsisHTML()).window.document;
 assert.equal(page.querySelector('[data-synopsis-pending]').open,false);
 assert(page.querySelector('[data-synopsis-pending]').textContent.includes(original));
 const audit=synopsisAuthorityAudit(reopened,{view:'full',chapters});
 assert.deepEqual(audit.questions.map(q=>q.id),['open']);
 // A later approved narrative still leaves the complete source bible intact.
 const next={...context,baseRevision:6};
 const p2=makeToolProposal(reopened,{...next,kind:'synopsis',targetId:'full',author:'Benji',reason:'Reviewed wording',values:{text:narrative+' Again.'},sourceRefs:[{kind:'events',id:'e'}]},next,chapters);
 const twice=reviewToolProposal(storeToolProposal(reopened,p2),p2.id,'approved',next,chapters,'Reviewed');
 assert.equal(twice.storyBrief.text,original);assert.equal(twice.workshop.toolProposals[0].before.text,original);assert.equal(twice.workshop.toolProposals[1].before.text,narrative);
}
console.log('PASS approved narrative overlay, original notes retained in both exports and UI, reopen, repeated review, unresolved decisions, Arabic/English and source guards');
