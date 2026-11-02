import assert from 'node:assert/strict';
import {saveNoteResolution} from '../src/note-save.js';
let stored={id:'n',entry_id:'c',body:'Preserve Arabic: سالم',resolved_at:null};
const api=async(path,options)=>{
 const query=new URLSearchParams(path.split('?')[1]);
 assert.equal(query.get('entry_id'),'eq.c');
 assert.equal(options.headers.Prefer,'return=representation');
 const expected=stored.resolved_at?'eq.'+stored.resolved_at:'is.null';
 if(query.get('resolved_at')!==expected)return [];
 stored={...stored,...JSON.parse(options.body)};return [structuredClone(stored)];
};
const initial=structuredClone(stored);
const resolved=await saveNoteResolution(api,initial,'c','Benji');
assert(resolved.resolved_at);assert.equal(resolved.resolved_by,'Benji');
await assert.rejects(()=>saveNoteResolution(api,initial,'c','Ahmed'),/another device/);
const reopened=await saveNoteResolution(api,resolved,'c','Ahmed');
assert.equal(reopened.resolved_at,null);assert.equal(reopened.body,initial.body);
await assert.rejects(()=>saveNoteResolution(api,initial,'other','Benji'),/no longer/);
console.log('PASS note resolution conflicts, chapter scoping, reopen and preserved text');
