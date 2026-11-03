import standards from './writing-standards-data.js';
import {escapeHTML as h} from './dsl-engine.js';
export function writingStandard(language){return standards[language]?structuredClone(standards[language]):null;}
export function writingStandardReference(language){const s=writingStandard(language);return s?{code:s.code,version:s.version,craftBaseline:s.craftBaseline,sourceSha256:s.sourceSha256,sourceURL:s.sourceURL}:null;}
export function writingStandardHTML(language){
 const s=writingStandard(language);if(!s)return '<p>Writing standard not selected. Confirm the story language and book rules.</p>';
 return '<details data-writing-standard><summary>Writing standard · '+h(s.code)+' · '+h(s.version)+'</summary><p>'+h(s.register)+'</p><p>'+h(s.scope)+'</p><p>Book decisions and approved continuity take priority. Historical source examples are not current book canon.</p><ol>'+s.rules.map(r=>'<li>'+h(r)+'</li>').join('')+'</ol><p><a href="'+h(s.sourceURL)+'" target="_blank" rel="noopener">Open full source guide</a> · <a href="'+h(s.localURL)+'" download>Download guide</a> · <a href="/standards/">ZCodes and adoption</a></p><p>Guide '+h(s.version)+' · Craft baseline '+h(s.craftBaseline)+' · Source SHA256 '+h(s.sourceSha256)+'</p></details>';
}
export function assertWritingStandard(reference,language){
 if(!reference)return; // Older packets remain explicitly unversioned, never backfilled.
 const current=writingStandardReference(language);
 if(!current||['code','version','craftBaseline','sourceSha256'].some(k=>reference[k]!==current[k]))throw Error('Writing standard changed or belongs to another language. Export a current review packet.');
}
