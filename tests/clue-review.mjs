import {pendingWork} from '../src/pending-work.js';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {clueAudit,clueReviewEvidence,clueReviewState,reviewClue} from '../src/clue-audit.js';
import {sourcePackage} from '../src/source-tools.js';
import {renderDSL} from '../src/dsl.js';
for(const language of ['ar','en']){
 const base={summary:'Summary',rules:'Preserve',characters:[{id:'hero',name:language==='ar'?'سالم':'Salem',aliases:['Old alias']}],places:[],events:[{id:'c',title:'Unresolved mystery',type:'clue',status:'proposal',characterIds:['hero'],sourceId:'ch',sourceRevision:1},{id:'related',title:'Related'}],links:[{id:'l',from:'c',to:'related'}],objects:[],workshop:{questions:[]}},chapters=[{id:'ch',revision:1,title:'Chapter'}],context={bookId:'book',branchId:'branch',sourceRevision:4,writer:'Benji'};
 const expected=clueReviewEvidence(base,'c',chapters),input={eventId:'c',decision:'unchanged',note:'Intentional mystery; reviewed source metadata',expected};
 assert.throws(()=>reviewClue(base,{...input,note:''},context,chapters),/reason/);
 const reviewed=reviewClue(base,input,context,chapters);assert.deepEqual(reviewed.events,base.events);assert.deepEqual(reviewed.characters,base.characters);assert.equal(clueReviewState(reviewed,'c',chapters).pending,false);assert.equal(clueAudit(reviewed,chapters).rows[0].notices.length,3);
 const restored=JSON.parse(JSON.stringify(reviewed));assert.equal(clueReviewState(restored,'c',chapters).pending,false);
 for(const edit of [d=>d.events[0].truth='New',d=>d.events[1].title='Changed',d=>d.characters[0].name='New name',d=>d.links.push({id:'new',from:'c',to:'missing'})]){const d=structuredClone(reviewed);edit(d);assert.equal(clueReviewState(d,'c',chapters).stale,true);assert(pendingWork(d,{...context,chapters}).some(r=>r.key==='clue:c'));assert.throws(()=>reviewClue(d,input,context,chapters),/changed/);}
 assert.equal(clueReviewState(reviewed,'c',[{...chapters[0],revision:2}]).stale,true);assert.equal(clueReviewState(reviewed,'c',[]).stale,true);
 const stamped=structuredClone(reviewed);stamped.events[0].updatedAt='later';stamped.events[0].revision=5;assert.equal(clueReviewState(stamped,'c',chapters).stale,false);
 for(const decision of ['deferred','proposal','clarification']){const d=reviewClue(reviewed,{...input,decision},context,chapters);assert.equal(clueReviewState(d,'c',chapters).pending,decision!=='deferred');assert.equal(d.workshop.clueReviews.length,2);}
 const pack=sourcePackage(reviewed,{bookId:'book',branchId:'branch',baseRevision:4},{kind:'clue',chapters});assert.equal(pack.pendingReviews.clues[0].review.review.note,input.note);
 const dom=new JSDOM('<button data-writer="Benji" aria-pressed="true"></button><main></main>',{url:'https://test.invalid/#book=book&view=dsl&dslview=twists&lang='+language});for(const k of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[k]=dom.window[k];globalThis.requestAnimationFrame=f=>f();globalThis.confirm=()=>true;dom.window.HTMLDialogElement.prototype.showModal=function(){};
 let branch={id:'branch',revision:4,name:'Main',data:structuredClone(base)},writes=0;
 const api=async(path,opts)=>{if(opts){assert(path.startsWith('chronicles_dsl_branches?'));assert(path.includes('revision=eq.'+branch.revision));writes++;branch={...branch,...JSON.parse(opts.body),revision:branch.revision+1};return [structuredClone(branch)];}if(path.startsWith('chronicles_dsl_projects'))return [{revision:1}];if(path.startsWith('chronicles_dsl_branches'))return [structuredClone(branch)];if(path.startsWith('chronicles_books'))return [{id:'book',title:'Test',language}];if(path.startsWith('chronicles_book_entries'))return chapters;return [];};
 const q=s=>document.querySelector(s);await renderDSL(q('main'),api,'book');q('[data-review-clue="c"]').click();let f=q('[data-clue-review]');f.elements.decision.value='unchanged';f.elements.note.value=input.note;await f.onsubmit({preventDefault(){}});assert.equal(writes,1);assert.deepEqual(branch.data.events,base.events);await renderDSL(q('main'),api,'book');assert(q('main').textContent.includes('0 records awaiting review'));assert(q('main').textContent.includes(input.note));branch.data.characters[0].name='Changed later';await renderDSL(q('main'),api,'book');assert(q('main').textContent.includes('Sources changed; review again'));dom.window.close();
}
console.log('PASS clue review outcomes, reasons, source invalidation, saved history, exports and shared rendered forms in both languages');process.exit(0);
