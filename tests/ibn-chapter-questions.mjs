import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {ibnQuestionCounts,ibnChapterQuestionHTML,mountIbnChapterQuestions} from '../src/ibn-chapter-questions.js';

assert.deepEqual(ibnQuestionCounts(),[
  {chapter:1,blocks:10,questions:100},
  {chapter:2,blocks:10,questions:100}
]);
assert.equal(ibnChapterQuestionHTML({chapterNumber:3,chapterId:'other',chapterTitle:'Unplanned'}),'');
for(const n of [1,2]){
 const html=ibnChapterQuestionHTML({chapterNumber:n,chapterId:'test-'+n,chapterTitle:'Current title'});
 assert(html.includes('Chapter Questions'));
 assert(html.includes('100 questions'));
 assert(html.includes('Current title'));
 assert(html.includes('data-ibnq-review'));
 const dom=new JSDOM('<main>'+html+'</main>',{url:'https://benji-chronicles.vercel.app'});
 const {window}=dom;
 globalThis.window=window;globalThis.document=window.document;
 const root=document.querySelector('[data-ibn-questions]');
 assert.equal(root.querySelectorAll('.ibnq-block').length,10);
 assert.equal(root.querySelectorAll('.ibnq-question').length,100);
 const unmount=mountIbnChapterQuestions(root,{chapterNumber:n,chapterId:'test-'+n,chapterTitle:'Current title',revision:4});
 assert(root.querySelector('legend').textContent.includes('عنوان'));
 const radio=root.querySelector('input[type="radio"]');
 radio.checked=true;
 radio.dispatchEvent(new window.Event('change',{bubbles:true}));
 assert.match(root.querySelector('[data-ibnq-count]').textContent,/1 answered/);
 assert.equal(JSON.parse(window.localStorage.getItem('ibn-chapter-question-draft:v1:test-'+n+':'+n)).sourceRevision,4);
 root.querySelector('[data-ibnq-review]').click();
 assert(!root.querySelector('[data-ibnq-results]').hidden);
 assert(root.querySelector('[data-ibnq-results]').textContent.includes('1 / 100'));
 // These are isolated local planning drafts, not manuscript or approved decision writes.
 assert(!html.includes('chronicles_book_entries?'));
 unmount();
 dom.window.close();
}
console.log('PASS Ibn Al Jabal 100 questions in ten blocks for each of two chapters; title question, draft choice, progress, review and isolation.');
