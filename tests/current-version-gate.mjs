import assert from 'node:assert/strict';
import {currentVersionGate as gate} from '../src/current-version-gate.js';
const chapter={id:'chapter',book_id:'c911584d-bd5b-42fe-b41c-a2a456c64d41',chapter_number:1,revision:4,body:'دخل سعد أبو العلا.'};
const branch={id:'9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1',book_id:'66739f5d-2bac-4d75-a4fd-6df93da8ac7e',revision:264,data:{decisions:[{id:'claude-before-ch11-03',status:'approved',source:'Author correction',text:'يقدم سعد أبو العلا باسمه.'}]}};
let saved=structuredClone(chapter),plan=structuredClone(branch),calls=[];
const api=async path=>{calls.push(path);return structuredClone(path.startsWith('chronicles_book_entries')?[saved]:plan?[plan]:[])};
const token=await gate(api,chapter,'extra');assert.equal(token.branchRevision,264);
assert(calls.some(p=>p.includes('archived=eq.false')));
saved.body='<span>س</span><span>عد</span> أبو العلا';assert(await gate(api,chapter,'extra'));
saved.body='دخل صاحبه.';await assert.rejects(gate(api,chapter,'extra'),/missing the approved introduction/);
saved=structuredClone(chapter);saved.revision=5;await assert.rejects(gate(api,chapter,'extra'),/saved chapter changed/);
saved=structuredClone(chapter);plan.revision++;await assert.rejects(gate(api,chapter,'extra',token),/changed during review/);
plan=structuredClone(branch);plan.data.decisions[0].status='proposal';await assert.rejects(gate(api,chapter,'extra'),/reconciliation/);
plan=structuredClone(branch);plan.data.decisions[0].recordStatus='superseded';await assert.rejects(gate(api,chapter,'extra'),/reconciliation/);
plan=null;await assert.rejects(gate(api,chapter,'extra'),/could not be verified/);
plan=structuredClone(branch);saved.chapter_number=2;saved.body='Other chapter';assert(await gate(api,{...chapter,chapter_number:2},'extra'));
assert.equal(await gate(()=>{throw Error('Unexpected call')},{...chapter,book_id:'unregistered'},'extra'),null);
assert.equal(await gate(()=>{throw Error('Unexpected call')},chapter,'main'),null);
console.log('PASS current version gate: current source, missing name, stale chapter, changed decisions, proposal, retired decision, unavailable source, chapter scope and unregistered books');

// Real approval UI must stop before the write RPC, not merely report a warning.
const {JSDOM}=await import('jsdom');const {createWorkflow}=await import('../src/workflow.js');
const dom=new JSDOM('<main id="main"><section class="editor-area"><div class="toolbar"></div><p class="save-meta"></p></section></main><dialog id="modal"><h2 id="modal-title"></h2><div id="modal-content"></div></dialog>');
globalThis.document=dom.window.document;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
let writes=0,messages=[],workflowRow=[],serverConflict=false;
saved={...chapter,kind:'chapter',language:'ar',title:'Fixture',body:'دخل صاحبه.'};plan=structuredClone(branch);
const uiApi=async(path,options)=>{
 if(path.startsWith('rpc/')){writes++;assert.equal(path,'rpc/chronicles_reviewed_approve_and_transfer');const payload=JSON.parse(options.body);assert.equal(payload.p_branch_id,branch.id);assert.equal(payload.p_branch_revision,plan.revision);if(serverConflict)throw Error('CURRENT_SOURCE: decisions changed. Reopen Review before approval.');workflowRow=[{approved_revision:4,ink_entry_id:'ink',transferred_revision:4}];return {};}
 if(path.startsWith('chronicles_workflow?'))return workflowRow;
 if(path.startsWith('chronicles_book_controls?'))return [{ink_book_id:'target'}];
 if(path.startsWith('ink_entries?'))return path.includes('id=eq.ink')?[{...saved,id:'ink'}]:[];
 return api(path);
};
const ui=createWorkflow({api:uiApi,esc:String,clean:String,storage:{},say:m=>messages.push(m),date:String,getWriter:()=> 'Benji',getIndex:()=>[],refresh:()=>{},diffHTML:()=>'',supplements:[]});
await ui.mount(saved,'extra','Fixture',()=>false);
await document.querySelector('[data-wf=approve-send]').onclick();assert.equal(writes,0);assert(messages.at(-1).includes('missing the approved introduction'));
saved.body=chapter.body;
await document.querySelector('[data-wf=approve-send]').onclick();
const checkbox=document.querySelector('#reviewed-send');checkbox.checked=true;checkbox.onchange({target:checkbox});
plan.revision++;await document.querySelector('#confirm-approve-send').onclick();assert.equal(writes,0);assert(document.querySelector('#approve-send-status').textContent.includes('changed during review'));
await document.querySelector('[data-wf=approve-send]').onclick();
const checked=document.querySelector('#reviewed-send');checked.checked=true;checked.onchange({target:checked});
serverConflict=true;await document.querySelector('#confirm-approve-send').onclick();assert.equal(writes,1);assert.equal(workflowRow.length,0);assert(document.querySelector('#approve-send-status').textContent.includes('CURRENT_SOURCE'));assert.equal(document.querySelector('#confirm-approve-send').disabled,false);
serverConflict=false;await document.querySelector('#confirm-approve-send').onclick();assert.equal(writes,2);assert.equal(workflowRow.length,1);
dom.window.close();delete globalThis.document;
console.log('PASS real approval UI: missing name and review drift prevent writes; server conflict stays visible and corrected reviewed source succeeds on retry');
