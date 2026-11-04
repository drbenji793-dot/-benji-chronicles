import {textContainsName} from './story-name-review.js';
import {escapeHTML as h} from './dsl-engine.js';
export function clueProseReview(event,chapter,paragraphs,term){
 term=String(term||'').trim();
 if(term.length<2)throw Error('Enter at least two characters from the fact or name to review.');
 if(!event?.id||!chapter?.id||chapter.revision==null)throw Error('Saved source identity and chapter revision are required.');
 return {eventId:event.id,eventRevision:event.revision??null,chapterId:chapter.id,chapterRevision:chapter.revision,title:chapter.title,term,
 matches:paragraphs.flatMap((quote,i)=>textContainsName(quote,term)?[{paragraph:i+1,quote}]:[])};
}
export function clueProseReviewHTML(result){
 return '<section data-prose-flags><p>Saved chapter: '+h(result.title||result.chapterId)+' · r'+h(result.chapterRevision)+' · Event r'+h(result.eventRevision??'Unknown')+'</p><p>'+result.matches.length+' matching paragraphs for editorial review. Matching text does not establish an error or approval. Only this selected saved chapter was checked; wording variants may not match. No prose was changed.</p>'+result.matches.map(m=>'<details><summary>Review paragraph '+m.paragraph+'</summary><p dir="auto" style="white-space:pre-wrap;overflow-wrap:anywhere">'+h(m.quote)+'</p></details>').join('')+'</section>';
}
