import {formatTime} from './revision-stamp.js';
export function chapterActivity(record,{esc,version=n=>'r'+n,date=formatTime}){
 const row=(label,value)=>'<div class="chapter-detail-row"><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>';
 return '<section class="chapter-detail-group save-meta"><h3>Chapter activity</h3><dl>'+row('Last modification',record.updated_at?date(record.updated_at):'Not recorded')+row('Edited by',record.updated_by||'Not recorded')+row('Last saved',record.saved_at?date(record.saved_at):record.updated_at?date(record.updated_at):'Not recorded')+row('Chapter revision',record.revision==null?'Not recorded':version(record.revision))+row('Chapter',record.chapter_number??'Book rules')+'</dl></section>';
}
export function chapterMetrics(root){
 const copy=root.cloneNode(true);copy.querySelectorAll('script,style').forEach(n=>n.remove());
 copy.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));
 copy.querySelectorAll('p,div,li,h1,h2,h3,blockquote').forEach(n=>n.append('\n'));
 const text=copy.textContent.replace(/\u00a0/g,' ').trim();
 return {words:text?text.split(/\s+/).length:0,characters:Array.from(text).length,paragraphs:text?text.split(/\n+/).filter(x=>x.trim()).length:0};
}
