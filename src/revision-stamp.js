// Store UTC; show an explicit zone. Viewing or exporting never changes saved time.
export function formatTime(value){
 if(!value||!Number.isFinite(new Date(value).getTime()))return 'Time not recorded';
 return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(new Date(value))+' · America/New_York';
}
export function revisionStamp(record={},fallback={}){
 const revision=record.revision;
 const sourceRevision=record.sourceRevision??fallback.revision;
 const time=record.updatedAt||record.updated_at||fallback.updated_at;
 return (revision==null?(sourceRevision==null?'Revision not recorded':'Source r'+sourceRevision):'r'+revision)+' · Last modified: '+formatTime(time)+(record.updatedAt||record.updated_at?'':' · source snapshot');
}

export function technicalDetails(record={},fallback={},note=''){
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return technicalPanel('<p>'+escape(revisionStamp(record,fallback))+'</p>'+(note?'<p>'+escape(note)+'</p>':''));
}

// Internal renderers pass already escaped markup; never raw stored content.
export function technicalPanel(content){return '<details class="technical-details" dir="ltr"><summary>Technical details <span aria-hidden="true">⌄</span></summary>'+content+'</details>';}
