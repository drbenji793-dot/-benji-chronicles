import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {handoffText,handoffCSS} from '../src/handoff-format.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const title of ['خارج الزمن','Future book']){
 const html=handoffText({title,summary:'A saved scene <script>bad</script>',dateLabel:'القاهرة، ٢٨ أكتوبر ١٩٨٦',status:'proposal',sourceId:'internal-id',sourceAuthor:'Benji',sourceRevision:3,customField:'Preserved additional information'},esc);
 const doc=new JSDOM(html).window.document;
 assert.equal(doc.querySelector('h4').textContent,title);
 assert.equal(doc.querySelector('details').hasAttribute('open'),false);
 assert.match(doc.querySelector('pre').textContent,/internal-id/);
 assert.match(doc.querySelector('pre').textContent,/Preserved additional information/);
 doc.querySelectorAll('details').forEach(e=>e.remove());
 assert(!doc.body.textContent.includes('sourceAuthor'));
 assert(!doc.body.textContent.includes('internal-id'));
 assert(doc.body.textContent.includes('proposal'));
 assert(doc.body.textContent.includes('A saved scene'));
 assert.equal(doc.querySelector('script'),null);
 assert.equal(doc.querySelector('dl'),null);
}
assert.match(handoffCSS,/@media\(max-width:600px\)/);
console.log('Readable exports preserve content and collapse metadata in Arabic and English.');
