import {writingStandardHTML,writingStandardReference} from './writing-standards.js';
import {findingWorkspace,bindFindings,findingContent} from './critique-findings-ui.js';
import {reviewMetadata,reviewBranch,reviewBodies,reviewFingerprint} from './critique-loader.js';
import {stampPlanningChanges} from './current-book-brief.js';
import createDOMPurify from 'dompurify';
import {technicalPanel,formatTime} from './revision-stamp.js';
import {handoffCSS} from './handoff-format.js';
import {escapeHTML as h,clone} from './dsl-engine.js';
export const critiqueLink=root=>'<a class="harsh-critique" href="'+root+'&view=critique">Harsh Critique</a>';
export const CRITIQUE_CRITERIA=['Opening and narrative promise','Pacing and scene necessity','Character motivation and agency','Dialogue, viewpoint and narrative voice','Originality and cultural adaptation','Mystery logic and evidence','Chronology and continuity','Period and procedural credibility','Ending and emotional payoff','Prioritized Keep / Rewrite / Cut repairs'];
export function critiqueCriteria(language){
 return CRITIQUE_CRITERIA.map((c,i)=>i===3?(language==='ar'?'Dialogue and Arabic voice (_zk5; book selected E or F)':'Dialogue and _zk5e voice'):i===4?(language==='ar'?'Originality and cultural setting':'Originality and cultural adaptation'):c);
}
export const REVIEW_INSTRUCTIONS='Critique the work, not the author. Cite chapter evidence for each issue, explain its effect and suggest a concrete repair. Separate facts from interpretation. Flag research gaps without inventing evidence. Do not rewrite chapters automatically.';
export function reviewBriefHTML({context,chapters,fingerprint,findings=[],generatedAt=new Date().toISOString()},clean){
 const language=context.language==='ar'?'ar':'en';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review Brief · '+h(context.title)+'</title><style>'+handoffCSS+'</style></head><body><h1>Review Brief</h1><h2 dir="auto">'+h(context.title)+'</h2>'+'<h3>Review instructions</h3><p>'+h(REVIEW_INSTRUCTIONS)+'</p><ol>'+critiqueCriteria(language).map(c=>'<li>'+h(c)+'</li>').join('')+'</ol>'+writingStandardHTML(language)+'<p>Review only the supplied text. Identify missing or empty chapters. Return proposed repairs separately from the manuscript.</p><h3>Saved chapter text</h3>'+chapters.map(c=>'<section><h3>Chapter '+h(c.chapter_number)+'</h3><h4 dir="auto">'+h(c.title||'')+'</h4>'+(String(c.body||'').trim()?'<div lang="'+language+'" dir="'+(language==='ar'?'rtl':'ltr')+'">'+clean(c.body)+'</div>':'<p>No saved text supplied for this chapter.</p>')+'</section>').join('')+(findings.length?'<h3>Saved findings and repair proposals</h3>'+findings.map(f=>'<section><h4 dir="auto">'+h(f.title)+'</h4><p>'+h(f.status)+'</p>'+findingContent(f)+'</section>').join(''):'')+technicalPanel('<p>Template v5 · Exported '+h(formatTime(generatedAt))+'</p><p>Book: '+h(context.bookId)+' · Story language: '+language+'</p><p>Saved source snapshot. Unsaved edits are excluded.</p><pre>'+h(fingerprint)+'</pre>'+chapters.map(c=>'<p>Chapter '+h(c.chapter_number)+' · <bdi>'+h(c.title||'')+'</bdi> · Source r'+h(c.revision)+' · '+h(c.id)+' · Last modified '+h(formatTime(c.updated_at))+'</p>').join('')+findings.map(f=>'<p>Finding '+h(f.id)+' r'+h(f.revision??'unavailable')+' · Chapter source r'+h(f.chapterRevision)+' · Planning source '+h(f.branchId)+' r'+h(f.planningRevision)+' · Last modified '+h(formatTime(f.savedAt||f.createdAt))+'</p>').join(''))+'</body></html>';
}
export {renderCritique} from './review-simple.js';
