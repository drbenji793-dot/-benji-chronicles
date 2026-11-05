export const HQ='https://benji-hq.dr-z01.chatgpt.site';
export async function protocolHash(protocol){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(protocol))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function resolveHQProtocol(code,{fetcher=fetch,storage=globalThis.localStorage}={}){
 if(!/^_zk[1-9]\d*e?(?:\.\d+)?$/.test(code))throw Error('Enter a writing code such as _zk6 or _zk6.1.');
 const key='hq-protocol:'+code;let data;
 try{const r=await fetcher(HQ+'/api/protocols?code='+encodeURIComponent(code),{cache:'no-store',signal:AbortSignal.timeout(12000)});if(r.status===404){try{storage.removeItem(key)}catch{}throw Object.assign(Error('This edition is not published in HQ. Choose another explicitly.'),{unpublished:true});}if(!r.ok)throw Error('HQ is unavailable.');data=await r.json();if(!data.protocol||data.resolved!==data.protocol.version||await protocolHash(data.protocol)!==data.sha256)throw Object.assign(Error('HQ protocol verification failed.'),{invalid:true});try{storage.setItem(key,JSON.stringify(data))}catch{}return {...data,offline:false};
 }catch(e){if(e.unpublished||e.invalid)throw e;try{data=JSON.parse(storage.getItem(key));if(data?.requested===code&&data.resolved===data.protocol?.version&&await protocolHash(data.protocol)===data.sha256)return {...data,offline:true};}catch{}throw Error('HQ is unavailable and no verified copy exists for this code.');}
}

export async function resolveCurrentHQProtocol(language,{fetcher=fetch,storage=globalThis.localStorage}={}){
 if(!['ar','en'].includes(language))throw Error('Choose Arabic or English.');
 const pattern=language==='ar'?/^_zk\d+\.\d+$/:/^_zk\d+e\.\d+$/;
 const key='hq-current-protocol:'+language;
 try{
  const response=await fetcher(HQ+'/api/protocols',{cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error('HQ is unavailable.');
  const index=await response.json();
  if(!Array.isArray(index.editions))throw Error('HQ index is unavailable.');
  const rows=index.editions.filter(x=>pattern.test(x.version)).sort((a,b)=>{const x=a.version.match(/\d+/g).map(Number),y=b.version.match(/\d+/g).map(Number);return y[0]-x[0]||y[1]-x[1]});
  if(!rows.length)throw Object.assign(Error('No current protocol is published for this language.'),{unpublished:true});
  const selected=rows[0],data=await resolveHQProtocol(selected.version,{fetcher,storage});
  if(data.resolved!==selected.version||data.sha256!==selected.sha256||!pattern.test(data.resolved)||data.protocol.family!==selected.version.split('.')[0])throw Object.assign(Error('HQ current protocol verification failed.'),{invalid:true});
  const value={...data,currentLanguage:language};
  try{storage?.setItem(key,JSON.stringify(value))}catch{}
  return value;
 }catch(error){
  if(error.invalid||error.unpublished)throw error;
  try{const cached=JSON.parse(storage?.getItem(key));if(cached?.currentLanguage===language&&pattern.test(cached.resolved)&&cached.resolved===cached.protocol?.version&&await protocolHash(cached.protocol)===cached.sha256)return {...cached,offline:true};}catch{}
  throw Error('Current HQ guide unavailable. No verified current copy is saved for this language.');
 }
}

export function sendCandidateToHQ(record,onStatus){
 const nonce=crypto.randomUUID(),popup=window.open(HQ+'/training/index.html#receive='+nonce,'hq-training');
 if(!popup){onStatus('Allow the HQ window, or export this note and import it in HQ.');return;}
 onStatus('HQ opened. Sign in there and confirm the feedback transfer.');
 const handler=e=>{if(e.origin!==HQ||e.source!==popup||e.data?.nonce!==nonce)return;if(e.data.type==='hq-training-ready')popup.postMessage({type:'hq-training-candidate',nonce,record},HQ);if(e.data.type==='hq-training-saved'){onStatus('Feedback saved privately in HQ for review. It is not an approved rule.');window.removeEventListener('message',handler);clearTimeout(timer);}};
 window.addEventListener('message',handler);const timer=setTimeout(()=>{window.removeEventListener('message',handler);onStatus('Transfer window expired. The chapter note remains saved. Try again or export it.');},300000);
}
export function downloadJSON(value,name){const u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);}
export function mountProtocol(root,{chapter,chapterURL,esc,recordRequest,language='ar'}){
 root.innerHTML=`<details><summary>Writing protocol</summary><p class="small">The current guide for this language is retrieved automatically from HQ.</p><form data-protocol><label>HQ code<input name="code" value="Current from HQ" readonly></label><label>Register<select name="register"><option value="">Choose for this request</option><option value="_am">_am · Egyptian colloquial</option><option value="_f">_f · Literary Fusha</option><option value="English">English</option></select></label><label>Chapter points<textarea name="points" dir="auto" placeholder="Purpose, events, viewpoint and ending"></textarea></label><label>Approved book decisions for this request<textarea name="decisions" dir="auto" placeholder="Include relevant decisions or paste the approved book brief"></textarea></label><button>Load from HQ</button><button type="button" data-packet disabled>Export writing request</button></form><p data-protocol-status role="status"></p><div data-protocol-details></div><p class="small">The request includes the exact HQ protocol and chapter reference. Take it to your writing assistant. Exporting does not generate or replace chapter text.</p></details>`;
 const form=root.querySelector('form'),status=root.querySelector('[data-protocol-status]'),button=root.querySelector('[data-packet]');let resolved=null;
 if(language==='en')form.elements.register.value='English';
 form.onsubmit=async e=>{e.preventDefault();button.disabled=true;status.textContent='Retrieving HQ protocol…';try{resolved=await resolveCurrentHQProtocol(language);form.elements.code.value=resolved.protocol.family;status.textContent=(resolved.offline?'Verified offline copy. Latest HQ status could not be checked. ':'Retrieved from HQ. ')+resolved.resolved;root.querySelector('[data-protocol-details]').innerHTML=`<a target="_blank" rel="noopener" href="${HQ}/api/protocols?code=${encodeURIComponent(resolved.resolved)}">${esc(resolved.resolved)}</a> · <small>${esc(resolved.sha256.slice(0,12))}</small>`;button.disabled=false;}catch(e){resolved=null;status.textContent=e.message;}};
 void form.onsubmit({preventDefault(){}});
 button.onclick=async()=>{if(!resolved)return;if(!form.elements.register.value||!form.elements.points.value.trim())return status.textContent='Choose a register and add a few chapter points first.';if((resolved.protocol.family.includes('e'))!==(form.elements.register.value==='English'))return status.textContent='Choose an English protocol for English, or an Arabic protocol with _am or _f.';button.disabled=true;try{const packet={format:'benji-writing-request',createdAt:new Date().toISOString(),chapter:{id:chapter.id,title:chapter.title,revision:chapter.revision,url:new URL(chapterURL,location.origin+'/').href},requested:resolved.requested,resolved:resolved.resolved,sha256:resolved.sha256,protocol:resolved.protocol,offline:resolved.offline,register:form.elements.register.value,points:form.elements.points.value,bookDecisions:form.elements.decisions.value,instruction:'Use this exact protocol, the supplied chapter points and approved book decisions. Ask for missing manuscript or continuity context. Do not invent approvals or modify previous chapters.'};await recordRequest(packet);downloadJSON(packet,'chapter-writing-request.json');status.textContent='Writing request exported and its protocol reference saved in chapter notes.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
}
