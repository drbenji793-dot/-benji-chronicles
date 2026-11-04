import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {makeToolProposal,storeToolProposal,reviewToolProposal,verifyToolProposal,toolProposalReview,clueRecords,sourcePackage} from '../src/source-tools.js';
import {retirementDependencies} from '../src/source-retirement.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';
for(const language of ['ar','en']){
 const initial={summary:'Unchanged',events:[{id:'old',title:language==='ar'?'قديم':'Old',type:'clue',truth:'Original fact',status:'approved',revision:1},
  {id:'new',title:'Replacement',type:'clue',truth:'Replacement fact',revision:2}],characters:[],workshop:{questions:[]},chapters:[{body:'Original saved prose'}]};
 const ctx={bookId:'book',branchId:'branch',baseRevision:3,writer:'Benji'};
 const input=(id,values)=>({...ctx,kind:'clue',targetId:id,values,sourceRefs:[{kind:'events',id}],reason:'Explicit author review',author:'Benji'});
 const replacement=makeToolProposal(initial,input('new',{truth:'Verified replacement fact'}),ctx);
 let data=storeToolProposal(initial,replacement);
 data=reviewToolProposal(data,replacement.id,'approved',ctx,[],'Checked replacement');
 const retire=input('old',{recordStatus:'superseded',replacementEventId:'new'});
 assert.throws(()=>makeToolProposal(data,retire,ctx),/Verify the approved replacement/);
 data=verifyToolProposal(data,replacement.id,{...ctx,baseRevision:4},'Checked saved replacement',[]);
 const original=structuredClone(data),proposal=makeToolProposal(data,retire,ctx);
 assert(proposal.sources.some(s=>s.id==='new'));
 for(const values of [{recordStatus:'archived',replacementEventId:'new'},{recordStatus:'superseded',replacementEventId:'old'},{recordStatus:'superseded',replacementEventId:'missing'},{recordStatus:'superseded',replacementEventId:'new',truth:'Silent rewrite'}])assert.throws(()=>makeToolProposal(data,input('old',values),ctx));
 const mutations=[
  d=>d.workshop.questions.push({id:'protected',status:'resolved',application:{fieldClaims:[{id:'old',fields:{truth:'Original fact'}}]}}),
  d=>d.links=[{id:'linked',from:'new',to:'old'}],
  d=>d.events.push({id:'knowledge',requiredKnowledge:[{characterId:'reader',factEventId:'old'}]}),
  d=>d.events.push({id:'reader',knowledgeRecords:[{factEventId:'old'}]}),
  d=>d.synopsisSections=[{id:'s',sources:[{kind:'events',id:'old'}]}],
  d=>d.editorialFindings=[{id:'f',links:[{kind:'event',id:'old'}]}]
 ];
 for(const mutate of mutations){const blocked=structuredClone(data);mutate(blocked);assert(retirementDependencies(blocked,'old').length);assert.throws(()=>makeToolProposal(blocked,retire,ctx),/still reference/);}
 const staged=storeToolProposal(data,proposal);
 assert.throws(()=>reviewToolProposal(staged,proposal.id,'approved',{...ctx,writer:'Ahmed'},[],'Review'),/Select Benji/);
 const stale=structuredClone(staged);stale.events[1].truth='Changed replacement';assert.throws(()=>reviewToolProposal(stale,proposal.id,'approved',ctx,[],'Review'),/changed/);
 const newlyLinked=structuredClone(staged);newlyLinked.links=[{id:'later',from:'new',to:'old'}];assert.throws(()=>reviewToolProposal(newlyLinked,proposal.id,'approved',ctx,[],'Review'),/still reference/);
 const deferred=reviewToolProposal(staged,proposal.id,'deferred',ctx,[],'Later');assert.equal(clueRecords(deferred).length,2);
 const applied=reviewToolProposal(deferred,proposal.id,'approved',ctx,[],'Compared replacement and references');
 assert.deepEqual(clueRecords(applied).map(e=>e.id),['new']);
 assert.equal(applied.events[0].truth,'Original fact');assert.equal(applied.events[0].status,'approved');
 assert.deepEqual(applied.chapters,initial.chapters);assert.equal(applied.summary,initial.summary);
 assert.equal(applied.workshop.toolProposals.find(p=>p.id===proposal.id).before.truth,'Original fact');
 const recovered=JSON.parse(JSON.stringify(applied));
 const verified=verifyToolProposal(recovered,proposal.id,{...ctx,baseRevision:4},'Checked retained original and ordinary views',[]);
 assert(toolProposalReview(verified,verified.workshop.toolProposals.find(p=>p.id===proposal.id),{chapters:[]}).ready);
 assert.deepEqual(sourcePackage(verified,ctx,{kind:'clue'}).targets.map(e=>e.id),['new']);
 const changed=structuredClone(verified);changed.links=[{id:'newlink',from:'new',to:'old'}];assert.throws(()=>verifyToolProposal(changed,proposal.id,{...ctx,baseRevision:5},'Recheck',[]),/still reference/);
 assert.deepEqual(data,original);
 const dom=new JSDOM('<main></main>',{url:'https://test.invalid/'});globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
 let model=structuredClone(data),form,save;
 const ui=sourceToolsUI({model:()=>model,branch:()=>({id:'branch',revision:3}),chapters:()=>[],bookId:'book',writer:()=> 'Benji',route:()=> '#source',
  select:(n,l,options,v)=>'<label>'+l+'<select name="'+n+'">'+Object.entries(options).map(([id,label])=>'<option value="'+id+'" '+(v===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>',
  field:(n,l,v)=>'<label>'+l+'<input name="'+n+'" value="'+v+'"></label>',
  area:(n,l,v)=>'<label>'+l+'<textarea name="'+n+'">'+v+'</textarea></label>',
  modal:(title,body)=>{const d=document.createElement('div');d.innerHTML=body;document.body.append(d);return d;},
  submit:(f,build)=>{form=f;save=()=>{model=build(new FormData(f));};}});
 const root=document.querySelector('main');root.innerHTML=ui.cluesHTML();ui.bind(root);
 root.querySelector('[data-tool-retire="old"]').click();form.elements.replacementEventId.value='new';form.elements.reason.value='Superseded with reviewed replacement';save();
 assert.equal(model.events[0].recordStatus,undefined);assert.equal(model.workshop.toolProposals.at(-1).status,'proposed');assert.equal(model.workshop.toolProposals.at(-1).values.recordStatus,'superseded');dom.window.close();
}
console.log('PASS bilingual retirement proposal UI, verified replacement, protected and active references, stale approval guards, defer/review/apply/reopen, recovery and source export exclusion without manuscript edits');
