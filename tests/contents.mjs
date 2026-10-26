import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {storyContents} from '../src/contents.js';
import {collectionNavigation} from '../src/collection-workspace.js';
const chapters=[{chapter_number:2,title:'Second'},{chapter_number:1,title:'<img src=x onerror=alert(1)>'}];const before=JSON.stringify(chapters);const dom=new JSDOM(storyContents('قطار الليل',chapters));const d=dom.window.document;
assert.equal(d.querySelectorAll('img').length,0);assert(d.querySelector('.contents-label').textContent.includes('<img'));assert.equal(d.querySelector('.contents-chapter').getAttribute('href'),'#story=1&lang=ar&chapter=1');assert.equal(d.querySelectorAll('.contents-resource').length,20);assert.equal(JSON.stringify(chapters),before);
assert(collectionNavigation(1,new URLSearchParams('view=contents')).includes('Contents'));assert(!collectionNavigation(2,new URLSearchParams('view=contents')).includes('Contents'));
const refreshed=new JSDOM(storyContents('قطار الليل',[...chapters,{chapter_number:3,title:'New chapter'}]));assert.equal(refreshed.window.document.querySelectorAll('.contents-chapter').length,3);console.log('PASS Contents ordering, chapter links, fresh titles, supporting links, escaping and first story scope');dom.window.close();refreshed.window.close();
