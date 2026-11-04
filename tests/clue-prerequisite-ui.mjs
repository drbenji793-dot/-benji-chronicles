import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {makeToolProposal,storeToolProposal,reviewToolProposal} from '../src/source-tools.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';
const data={events:[{id:'action',title:'Action',type:'clue',status:'proposed',order:4,truth:'Truth',setup:'Setup'},
 {id:'fact',title:'Fact',revision:2,order:1}],characters:[{id:'hero',name:'Hero',revision:1}],workshop:{questions:[]}};
const unchanged=structuredClone(data),context={bookId:'book',branchId:'br',baseRevision:5,writer:'Benji'};
const values={requiredKnowledge:[{characterId:'hero',factEventId:'fact',note:'Required source'}]};
const input={...context,kind:'clue',targetId:'action',author:'Benji',reason:'Track prerequisite',sourceRefs:[{kind:'events',id:'action'}],values};
const proposal=makeToolProposal(data,input,context);
assert(proposal.sources.some(s=>s.kind==='characters'&&s.id==='hero'));
assert(proposal.sources.some(s=>s.kind==='events'&&s.id==='fact'));
assert.throws(()=>makeToolProposal(data,{...input,values:{requiredKnowledge:[values.requiredKnowledge[0],values.requiredKnowledge[0]]}},context),/already requires/);
assert.throws(()=>makeToolProposal(data,{...input,values:{requiredKnowledge:[{...values.requiredKnowledge[0],factEventId:'unknown'}]}},context),/current fact/);
const pending=storeToolProposal(data,proposal);
assert.throws(()=>reviewToolProposal({...pending,events:pending.events.map(e=>e.id==='fact'?{...e,revision:3}:e)},proposal.id,'approved',context,[],'Author reviewed'),/changed/);
const accepted=reviewToolProposal(pending,proposal.id,'approved',context,[],'Reviewed source dependency');
assert.deepEqual(accepted.events[0].requiredKnowledge,values.requiredKnowledge);
assert.deepEqual(data,unchanged);
const doc=new JSDOM('<main></main>',{url:'https://test.local/#view=dsl'});
for(const k of ['window','document','location','FormData'])globalThis[k]=doc.window[k];
let current=structuredClone(data),dialog,saves=0;
const root=document.querySelector('main');
const c={model:()=>current,branch:()=>({id:'br',revision:5}),bookId:'book',chapters:()=>[],writer:()=> 'Benji',route:()=> '#source',status:()=>{},download:()=>{},render:()=>{},
 modal:(title,body)=>{dialog?.remove();dialog=document.createElement('div');dialog.innerHTML='<h2>'+title+'</h2>'+body;document.body.append(dialog);return dialog;},
 select:(n,l,items,v)=>'<label>'+l+'<select name="'+n+'">'+Object.entries(items).map(([key,label])=>'<option value="'+key+'" '+(key===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label>',
 field:(n,l,v='')=>'<label>'+l+'<input name="'+n+'" value="'+v+'"></label>',
 area:(n,l,v='')=>'<label>'+l+'<textarea name="'+n+'">'+v+'</textarea></label>',
 submit:(form,build)=>{form.onsubmit=e=>{e.preventDefault();current=build(new FormData(form));saves++;};}};
const ui=sourceToolsUI(c);root.innerHTML=ui.cluesHTML();ui.bind(root);
root.querySelector('[data-tool-required]').click();
assert.match(dialog.textContent,/Review required knowledge/);
const form=dialog.querySelector('form');form.elements.holder.value='hero';form.elements.fact.value='fact';form.elements.note.value='Source needed';form.elements.reason.value='Author review';
form.onsubmit({preventDefault(){}});
assert.equal(saves,1);assert(current.workshop.toolProposals?.length===1);
assert.equal(current.events[0].requiredKnowledge,undefined);
assert.deepEqual(data,unchanged);
console.log('PASS guarded knowledge proposal and actual author UI without direct story mutation');
