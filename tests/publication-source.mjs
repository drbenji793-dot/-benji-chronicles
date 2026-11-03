import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {publicationMetadata,publicationMetadataPath} from '../src/publication-source.js';
import {synopsisAuthorityAudit,synopsisAuthorityHTML} from '../src/synopsis-authority.js';
import {sourceToolsUI} from '../src/source-tools-ui.js';
assert.match(publicationMetadataPath('book'),/^chronicles_dsl_projects\?book_id=eq.book&select=/);
assert.match(publicationMetadataPath('book'),/branch_revision:published->>branch_revision/);
assert.throws(()=>publicationMetadataPath(''),/Current book ID/);
const record={revision:19,branch_id:'branch',branch_revision:'179',published_at:'2026-10-31T03:16:24Z'};
const parsed=publicationMetadata([record]);
assert.deepEqual(parsed,{branchId:'branch',branchRevision:179,recordRevision:19,publishedAt:record.published_at,available:true});
assert.equal(publicationMetadata([{revision:22,branch_revision:'',branch_id:''}]).branchRevision,null);
assert.equal(publicationMetadata([{revision:23,branch_revision:'NaN'}]).branchRevision,null);
assert.equal(publicationMetadata([{revision:2,branch_revision:'-2'}]).branchRevision,null);
assert.equal(publicationMetadata([]).available,false);
const planning={summary:'Story remains unchanged',workshop:{questions:[]},events:[],characters:[]};
const before=structuredClone(planning);
const audit=synopsisAuthorityAudit(planning,{bookId:'book',branchId:'branch',revision:262,publishedRevision:179,publishedBranchId:'branch',publicationRecordRevision:19,publishedAt:record.published_at});
assert.match(audit.publishedState,/Working revision differs/);
const html=synopsisAuthorityHTML(audit);
assert.match(html,/Publication record r19/);
assert.match(html,/Published branch revision: 179/);
assert.equal(synopsisAuthorityAudit(planning,{bookId:'book',branchId:'other',revision:262,publishedRevision:179,publishedBranchId:'branch'}).publishedState,'A different planning branch is published');
assert.equal(synopsisAuthorityAudit(planning,{bookId:'book',branchId:'branch',revision:179,publishedRevision:179,publishedBranchId:'branch'}).publishedState,'Published branch revision matches this working source');
assert.deepEqual(planning,before);

const dom=new JSDOM('<main id="root"></main>',{url:'https://example.test/#view=dsl&dslview=synopsis'});
globalThis.location=dom.window.location;
let queries=[];
const c={model:()=>planning,branch:()=>({id:'branch',revision:262}),chapters:()=>[],bookId:'book',writer:()=> 'Benji',
 route:()=> '#source',chapterLink:()=> '#chapter',api:async path=>{queries.push(path);return [record];},
 select:(n,l,values,v)=>'<label>'+l+'<select name="'+n+'">'+Object.keys(values).map(key=>'<option value="'+key+'" '+(key===v?'selected':'')+'>'+values[key]+'</option>').join('')+'</select></label>',
 field:(n)=>'<input name="'+n+'">',area:(n)=>'<textarea name="'+n+'"></textarea>',status:()=>{}};
const ui=sourceToolsUI(c),root=dom.window.document.querySelector('#root');
root.innerHTML=ui.synopsisHTML();
assert.match(root.querySelector('[data-synopsis-source-map]').textContent,/not established/);
ui.bind(root);
for(let i=0;i<5;i++)await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(queries.length,1);
assert.match(root.querySelector('[data-synopsis-source-map]').textContent,/Published branch revision: 179/);
assert.match(root.querySelector('[data-synopsis-source-map]').textContent,/Working revision differs/);
assert.deepEqual(planning,before);
delete globalThis.location;
console.log('PASS publication metadata projection, revisions, branch scope, invalid values, lazy Synopsis refresh and immutable story');
