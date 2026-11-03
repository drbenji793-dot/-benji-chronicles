import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {renderStoryWorkspace} from '../src/story-workspace.js';

const css=await readFile('public/last-hour.css','utf8');
for(const token of [
 '.story-workspace [data-source-report] pre',
 'white-space:pre-wrap',
 'overflow-wrap:anywhere',
 'word-break:break-word',
 '.story-workspace [data-story-source-group]',
 '@media(max-width:480px)'
])assert(css.includes(token),token+' missing');

const content={summary:'Short story source',storyBrief:{text:'Long planning remains saved'},
 events:[{id:'event',title:'Historical event',status:'approved',revision:2}],
 characters:[],workshop:{questions:[]},
 synopsisSections:[{id:'section',title:'Author source',view:'short',scope:'plan',text:'Current source',status:'proposed',sources:[]}]};
const unchanged=structuredClone(content);
for(const language of ['ar','en']){
 const dom=new JSDOM('<main></main>',{url:'https://test.local/#book=b&view=brief'});
 for(const key of ['window','document','location','MutationObserver','localStorage','FormData'])globalThis[key]=dom.window[key];
 globalThis.confirm=()=>true;
 const branch={id:'br',book_id:'b',revision:8,updated_at:'2026-11-03T00:00:00Z',data:structuredClone(content)};
 const api=async path=>{
  if(path.includes('chronicles_book_entries')||path.includes('chronicles_chapters'))return [];
  if(path.includes('chronicles_dsl_projects'))return [];
  return [branch];
 };
 await renderStoryWorkspace(document.querySelector('main'),api,{bookId:'b',title:'A book',language,root:'#book=b'});
 const parent=document.querySelector('[data-story-source-group]');
 assert(parent);
 assert(!parent.open);
 assert(parent.querySelector('[data-synopsis-evidence]'));
 assert(parent.querySelector('[data-synopsis-authority]'));
 assert.equal(document.querySelectorAll('[data-story-source-group]').length,1);
 assert.equal(document.querySelector('[data-summary]').textContent,'Short story source');
 assert.match(parent.textContent,/Sources and revision checks/);
 assert.deepEqual(content,unchanged);
 dom.window.close();
}
console.log('PASS one collapsed source group, responsive overflow wrapping, preserved Story source evidence and unchanged Arabic/English content');
