import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {clueProposalImpact,clueProposalImpactHTML} from '../src/clue-impact-preview.js';
import {makeToolProposal,storeToolProposal} from '../src/source-tools.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';
const data={summary:'Original planning summary',events:[
 {id:'target',title:'Linked clue',type:'clue',status:'approved',revision:3,order:2,outcome:'Previously saved outcome',characterIds:['hero']},
 {id:'connected',title:'Consequential event',status:'proposed',revision:1,setupEventId:'target'}
],links:[{id:'link1',from:'target',to:'connected'}],characters:[{id:'hero',name:'Current character',revision:6,status:'approved'}],
 workshop:{questions:[
  {id:'protected',title:'Locked author decision',eventIds:['target'],status:'approved',answer:'Preserve choice'},
  {id:'pending',title:'Open connected role',characterIds:['hero'],status:'open'},
  {id:'unrelated',title:'Unrelated question',status:'open'}
 ]},chapters:[{body:'Immutable manuscript'}]};
const chapters=[{id:'chapter',title:'Linked saved chapter',chapter_number:3,revision:9,body:'Stay unchanged'}];
const ctx={bookId:'book',branchId:'branch',baseRevision:20,writer:'Benji'};
const proposal=makeToolProposal(data,{...ctx,kind:'clue',targetId:'target',author:'Benji',reason:'Review a different outcome',
 sourceRefs:[{kind:'events',id:'target'},{kind:'characters',id:'hero'},{kind:'chapters',id:'chapter'}],values:{outcome:'Proposed outcome'}},ctx,chapters);
const original=structuredClone(data),chapterCopy=structuredClone(chapters);
const impact=clueProposalImpact(data,proposal,chapters);
assert.equal(impact.canReview,true);
assert.deepEqual(impact.changes.map(x=>x.key),['outcome']);
assert.equal(impact.changes[0].before,'Previously saved outcome');
assert.equal(impact.changes[0].after,'Proposed outcome');
assert.deepEqual(impact.events.map(x=>x.id),['target','connected']);
assert.deepEqual(impact.characters.map(x=>x.id),['hero']);
assert.deepEqual(impact.questions.map(x=>x.id),['protected','pending']);
assert.equal(impact.questions[0].protected,true);
assert.equal(impact.questions[0].answer,'Preserve choice');
assert.equal(impact.brief.changed,true);
assert(impact.brief.after.includes('Proposed outcome'));
assert(!impact.brief.before.includes('Proposed outcome'));
assert.deepEqual(impact.chapterSources.map(x=>x.id),['chapter']);
const doc=new JSDOM(clueProposalImpactHTML(impact,{href:(kind,id)=>'#'+kind+'/'+id})).window.document;
assert(doc.querySelector('[data-clue-impact]'));
assert(!doc.querySelector('[data-clue-impact]').open);
assert.equal(doc.querySelectorAll('a[href^=\"#\"]').length>=3,true);
assert.match(doc.body.textContent,/Protected author decision/);
assert.match(doc.body.textContent,/No chapter prose is modified/);
assert.match(doc.body.textContent,/Current and proposed Story Brief/);
assert.equal(doc.querySelectorAll('script').length,0);
const drift=structuredClone(data);drift.characters[0].revision=7;
const changedImpact=clueProposalImpact(drift,proposal,chapters);
assert.equal(changedImpact.canReview,false);
assert(changedImpact.evidenceIssues.some(x=>x.kind==='characters'&&x.id==='hero'));
const wrong={...proposal,kind:'synopsis'};
assert.throws(()=>clueProposalImpact(data,wrong,chapters),/clue proposal/);
assert.deepEqual(data,original);assert.deepEqual(chapters,chapterCopy);

const dom=new JSDOM('<main></main>',{url:'https://local.test/#view=dsl'});
for(const key of ['window','document','location','FormData'])globalThis[key]=dom.window[key];
let working=storeToolProposal(data,proposal),dialog;
const c={model:()=>working,branch:()=>({id:'branch',revision:20}),chapters:()=>chapters,bookId:'book',writer:()=> 'Benji',
 route:(view,obj)=>'#'+view+(obj?.focusid||''),chapterLink:n=>'#chapter='+n,
 modal:(title,body)=>{dialog?.remove();dialog=document.createElement('div');dialog.innerHTML='<h3>'+title+'</h3>'+body;document.body.append(dialog);return dialog;},
 select:(name,label,opts,v)=>'<label>'+label+'<select name="'+name+'">'+Object.entries(opts).map(([id,text])=>'<option value="'+id+'">'+text+'</option>').join('')+'</select></label>',
 field:(name)=>'<input name="'+name+'">',area:(name)=>'<textarea name="'+name+'"></textarea>',submit:()=>{},download:()=>{},render:()=>{},status:()=>{}};
const ui=sourceToolsUI(c),root=document.querySelector('main');root.innerHTML=ui.cluesHTML();ui.bind(root);
const button=root.querySelector('[data-tool-review]');
assert(button);
button.click();
assert(dialog.querySelector('[data-clue-impact]'));
assert.equal(dialog.querySelectorAll('details[open]').length,0);
assert(dialog.textContent.includes('Current source snapshot'));
const css=await readFile('public/dsl.css','utf8');
assert(css.includes('.dsl-dialog [data-clue-impact] pre'));
assert(css.includes('word-break:break-word'));
assert(css.includes('.dsl-dialog [data-clue-impact] .dsl-diff{grid-template-columns:minmax(0,1fr)}'));
assert(dialog.textContent.includes('Current character'));
assert(dialog.textContent.includes('Locked author decision'));
assert.deepEqual(working.events,original.events);
console.log('PASS clue proposal before and after, source scoped connected impacts, protected decision labels, current Story Brief and actual review dialog');
