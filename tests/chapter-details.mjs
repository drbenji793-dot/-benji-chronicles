import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {chapterActivity,chapterMetrics} from '../src/chapter-details.js';
import {mountTechnicalFooter} from '../src/technical-footer.js';
import {technicalPanel} from '../src/revision-stamp.js';
for(const language of ['ar','en'])for(const id of ['prose','chronicles-entry-body']){
 const dom=new JSDOM('<main><section class="editor-area">'+technicalPanel(chapterActivity({revision:6,chapter_number:1,updated_by:'Benji',updated_at:'2026-11-08T18:05:22Z'},{esc:String})+'<div class="chapter-word-count">4 words</div>')+'<article id="'+id+'" lang="'+language+'"><p>One two</p><p>Three four</p></article></section></main><nav class="edition-bridge"><a href="/english">English Library</a></nav><footer>'+technicalPanel('<p>Reader v267 · 2026-11-08T03:31:09Z · UTC</p>')+'</footer>');
 for(const k of ['document','MutationObserver'])globalThis[k]=dom.window[k];
 const main=document.querySelector('main');const stop=mountTechnicalFooter(main,document.querySelector('footer'));
 const panel=main.querySelector('[data-page-technical]');assert(panel.textContent.includes('Benji'));assert(panel.textContent.includes('America/New_York'));assert(panel.textContent.includes('4 words'));assert(panel.textContent.includes('2 paragraphs'));assert(!panel.querySelector('.edition-bridge'));assert(document.querySelector('.edition-bridge').isConnected);assert.equal(main.querySelectorAll('[data-page-technical]').length,1);
 const article=document.getElementById(id);article.innerHTML='<p>New paragraph</p>';await new Promise(r=>setTimeout(r,0));assert(panel.textContent.includes('1 paragraphs'));assert(panel.textContent.includes('Nov 08, 2026'));stop();dom.window.close();
}
assert(chapterActivity({},{esc:String}).includes('Not recorded'));
console.log('PASS shared chapter details across both editions and reader paths, preserved stamps, live counts, navigation outside panel');
