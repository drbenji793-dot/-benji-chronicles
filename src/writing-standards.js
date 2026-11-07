import {resolveCurrentHQProtocol,assertCurrentGuide} from './hq-protocol.js';
import standards from './writing-standards-data.js';
import {escapeHTML as h} from './dsl-engine.js';
export async function syncCurrentWritingStandard(language,options={}){
 if(!standards[language])return null;
 try{
  const data=assertCurrentGuide(await resolveCurrentHQProtocol(language,options),language),p=data.protocol;
  if(!Array.isArray(p.foundation)||!p.foundation.length||!Array.isArray(p.refinements))throw Error('Incomplete HQ guide.');
  const u=new URL(p.source);if(u.origin!=='https://benji-hq.dr-z01.chatgpt.site')throw Error('Unexpected guide source.');
  const section=p.foundation.find(x=>/operating rules/i.test(x.title));
  const rules=section?section.text.split(/(?=ZK\d+\.\d+\.)/).slice(1).map(x=>x.replace(/\s+/g,' ').trim()):p.foundation.map(x=>x.text);
  if(!rules.length)throw Error('HQ guide has no rules.');
  Object.assign(standards[language],{code:p.family,version:p.version,craftBaseline:p.version,sourceURL:p.source,sourceSha256:p.sourceSHA256||data.sha256,localURL:p.source,rules,observations:p.refinements.map(x=>x.rule),hqProtocol:p,hqProtocolSha256:data.sha256,currentConfirmed:!data.offline,checkedAt:data.checkedAt,connection:data.offline?'Verified offline copy; latest HQ status unavailable':'Current guide verified from HQ'});
 }catch(error){standards[language].currentConfirmed=false;standards[language].connection='Current guide unavailable: '+error.message;}
 return writingStandard(language);
}
export function writingStandard(language){
 const s=standards[language],checked=Date.parse(s?.checkedAt),now=Date.now();
 if(!s?.currentConfirmed||!Number.isFinite(checked)||checked>now+60000||now-checked>300000)return null;
 return JSON.parse(JSON.stringify(s));
}
export async function loadCurrentWritingStandard(language,options={}){
 const current=await syncCurrentWritingStandard(language,options);
 if(!current)throw Error('Current HQ guidance could not be confirmed. New work packets need a current guide; saved book text is unchanged.');
 return current;
}

export function writingStandardReference(language){const s=writingStandard(language);return s?{code:s.code,version:s.version,craftBaseline:s.craftBaseline,sourceSha256:s.sourceSha256,sourceURL:s.sourceURL}:null;}
export function writingStandardHTML(language){
 const s=writingStandard(language);if(!s)return '<p>Current writing guide is not confirmed. Reconnect to HQ before preparing new work. Saved book methods and historical guides remain separate.</p>';
 return '<details data-writing-standard><summary>Writing standard · '+h(s.code)+' · '+h(s.version)+'</summary><p>'+h(s.register)+'</p><p>'+h(s.scope)+'</p><p>'+h(s.connection||'Bundled reference')+'</p><p>Book decisions and approved continuity take priority. Historical source examples are not current book canon.</p><ol>'+s.rules.map(r=>'<li>'+h(r)+'</li>').join('')+'</ol>'+(s.observations?.length?'<details><summary>Source observations</summary>'+s.observations.map(x=>'<p dir=auto>'+h(x)+'</p>').join('')+'</details>':'')+'<p><a href="'+h(s.sourceURL)+'" target="_blank" rel="noopener">Open full source guide</a> · <a href="'+h(s.localURL)+'" download>Download guide</a> · <a href="/standards/">ZCodes and adoption</a></p><p>Guide '+h(s.version)+' · Craft baseline '+h(s.craftBaseline)+' · Source SHA256 '+h(s.sourceSha256)+'</p></details>';
}
export function assertWritingStandard(reference,language){
 if(!reference)return; // Older packets remain explicitly unversioned, never backfilled.
 const current=writingStandardReference(language);
 if(!current||['code','version','craftBaseline','sourceSha256'].some(k=>reference[k]!==current[k]))throw Error('Writing standard changed or belongs to another language. Export a current review packet.');
}
