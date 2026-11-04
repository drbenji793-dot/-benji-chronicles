import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {makeToolProposal,storeToolProposal,reviewToolProposal} from '../src/source-tools.js';
import {clueAudit,clueReviewEvidence,clueReviewState,reviewClue} from '../src/clue-audit.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';

const data={
 events:[
  {id:'action',title:'Action scene',type:'clue',status:'proposed',order:4,truth:'Known secret',setup:'Recorded',revealEventId:'reveal'},
  {id:'fact',title:'Secret fact',order:1,revision:2,truth:'Recorded truth'},
  {id:'reveal',title:'Reveal event',order:9}
 ],
 characters:[{id:'hero',name:'Hero',revision:3}],workshop:{questions:[]},summary:'Unchanged',chapters:[{body:'Immutable prose'}]
};
const before=structuredClone(data),context={bookId:'b',branchId:'br',baseRevision:6,writer:'Benji'};
const values={requiredKnowledge:[{characterId:'hero',factEventId:'fact',note:'Must know the code to open the lock'}]};
const input={...context,kind:'clue',targetId:'action',author:'Benji',reason:'Explicit fact needed for the scene',sourceRefs:[{kind:'events',id:'action'}],values};
const p=makeToolProposal(data,input,context,[]);
assert(p.sources.some(r=>r.kind==='characters'&&r.id==='hero'));
assert(p.sources.some(r=>r.kind==='events'&&r.id==='fact'));
assert.throws(()=>makeToolProposal(data,{...input,values:{requiredKnowledge:[values.requiredKnowledge[0],values.requiredKnowledge[0]]}},context,[]),/already requires/);
assert.throws(()=>makeToolProposal(data,{...input,values:{requiredKnowledge:[{...values.requiredKnowledge[0],factEventId:'absent'}]}},context,[]),/current fact event/);
assert.throws(()=>makeToolProposal(data,{...input,values:{requiredKnowledge:[{...values.requiredKnowledge[0],note:''}]}},context,[]),/Provide a holder/);
const changed=structuredClone(data);changed.events[1].revision=3;
const pending=storeToolProposal(data,p);
assert.throws(()=>reviewToolProposal({...pending,events:changed.events},p.id,'approved',context,[],'Approved'),/sources changed/i);
const approved=reviewToolProposal(pending,p.id,'approved',context,[],'Source linked, not manuscript approval');
assert.deepEqual(approved.events[0].requiredKnowledge,values.requiredKnowledge);
assert.equal(approved.chapters[0].body,'Immutable prose');
const notices=clueAudit(approved).rows.find(r=>r.event.id==='action').notices;
assert(notices.some(n=>n.code==='required-knowledge-not-recorded:hero:fact'));
const reviewed=reviewClue(approved,{eventId:'action',decision:'unchanged',note:'Gap to resolve',expected:clueReviewEvidence(approved,'action',[])},{bookId:'b',branchId:'br',sourceRevision:7},[]);
const stale=structuredClone(reviewed);stale.events[1].title='Fact renamed';
assert.equal(clueReviewState(stale,'action',[]).stale,true);
const clone=structuredClone(approved),nextInput={...input,baseRevision:7,values:{requiredKnowledge:[]},reason:'Retire an old prerequisite proposal'};
const removeProposal=makeToolProposal(approved,nextInput,{...context,baseRevision:7},[]);
const reverted=reviewToolProposal(storeToolProposal(approved,removeProposal),removeProposal.id,'approved',{...context,baseRevision:7},[],'Requirement explicitly retired by author');
assert.deepEqual(reverted.events[0].requiredKnowledge,[]);
assert.deepEqual(data,before);

// Exercise the actual Add prerequisite button through the shared author UI handlers.
const dom=new JSDOM('<main></main>',{url:'https://test.local/#view=dsl'});
for(const k of ['window','document','location','FormData'])globalThis[k]=dom.window[k];
let working=structuredClone(data),dialog,saves=0,ui;
const root=document.querySelector('main');
const c={
 model:()=>working,branch:()=>({id:'br',revision:6}),chapters:()=>[],bookId:'b',writer:()=> 'Benji',route:()=> '#source',chapterLink:()=>null,
 modal:(title,body)=>{dialog?.remove();dialog=document.createElement('div');dialog.innerHTML='<h2>'+title+'</h2>'+body;document.body.append(dialog);return dialog;},
 select:(n,l,options,selected)=>'<label>'+l+'<select name="'+n+'">'+Object.entries(options).map(([key,value])=>'<option value="'+key+'" '+(key===selected?'selected':'')+'>'+value+'</option>').join('')+'</select></label>',
 field:(n,l,v='')=>'<label>'+l+'<input name="'+n+'" value="'+v+'"></label>',
 area:(n,l,v='')=>'<label>'+l+'<textarea name="'+n+'">'+v+'</textarea></label>',
 submit:(form,build)=>{form.onsubmit=ev=>{ev.preventDefault();working=build(new FormData(form));saves++;};},
 download:()=>{},render:()=>{},status:()=>{}
};
ui=sourceToolsUI(c);
root.innerHTML=ui.cluesHTML();ui.bind(root);
root.querySelector('[data-tool-required]').click();
assert.match(dialog.textContent,/Review required knowledge/);
const form=dialog.querySelector('form');
form.elements.holder.value='hero';form.elements.fact.value='fact';form.elements.note.value='Action depends on this fact';form.elements.reason.value='Track source consequence';
form.onsubmit({preventDefault(){}});
assert.equal(saves,1);
assert(working.workshop.toolProposals?.length===1);
assert.equal(working.events[0].requiredKnowledge,undefined);
assert.deepEqual(data,before);
console.log('PASS guarded add and retire knowledge requirements, source drift, notice, stale review, real author UI and unchanged prose');
