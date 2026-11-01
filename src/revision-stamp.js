// Store UTC; show an explicit zone. Viewing or exporting never changes saved time.
export function formatTime(value){
 if(!value||!Number.isFinite(new Date(value).getTime()))return 'Time not recorded';
 return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(new Date(value))+' · America/New_York';
}
export function revisionStamp(record={},fallback={}){
 const revision=record.revision??record.sourceRevision??fallback.revision;
 const time=record.updatedAt||record.updated_at||fallback.updated_at;
 return (revision==null?'Revision not recorded':'r'+revision)+' · '+formatTime(time)+(record.updatedAt||record.updated_at?'':' · source snapshot');
}
