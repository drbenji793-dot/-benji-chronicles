// Portable planning recovery only. Manuscript and publication are separate stores.
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(value)))))].map(b=>b.toString(16).padStart(2,'0')).join('');
function validateData(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Planning data is missing.');
 for(const key of ['events','links','characters','places','objects','decisions']){
  if(data[key]===undefined)continue;
  if(!Array.isArray(data[key]))throw Error('Invalid planning list: '+key);
  const ids=new Set();for(const row of data[key]){if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||ids.has(row.id))throw Error('Missing or repeated identity in '+key);ids.add(row.id);}
 }
 if(!Array.isArray(data.events)||!Array.isArray(data.links))throw Error('Recovery requires event and connection lists.');
}
export async function makePlanningRecovery(bookId,branch){
 if(!bookId||!branch?.id||!Number.isInteger(branch.revision)||branch.partialData)throw Error('Load the complete planning revision before exporting.');
 if(branch.book_id&&branch.book_id!==bookId)throw Error('Planning belongs to another book.');validateData(branch.data);
 const snapshot={format:'chronicles-dsl',version:2,purpose:'Planning recovery only. Restore as a separate path; saved manuscript and publication are not included.',exportedAt:new Date().toISOString(),bookId,branch:structuredClone(branch)};
 return {...snapshot,integrity:{algorithm:'SHA-256',digest:await digest(snapshot)}};
}
export async function readPlanningRecovery(text,bookId){
 if(typeof text!=='string'||text.length>20000000)throw Error('Choose a planning JSON file smaller than 20 MB.');
 let p;try{p=JSON.parse(text);}catch{throw Error('This is not valid planning JSON.');}
 if(p?.format!=='chronicles-dsl'||p.bookId!==bookId||p.branch?.book_id&&p.branch.book_id!==bookId)throw Error('This recovery file belongs to another book or has an unsupported format.');
 if(!p.branch?.id||!Number.isInteger(p.branch.revision)||p.branch.partialData)throw Error('This snapshot has incomplete planning data or source metadata.');
 validateData(p.branch.data);
 if(p.version!==undefined&&![1,2].includes(p.version))throw Error('Unsupported recovery version.');
 if(p.version===2){const {integrity,...payload}=p;if(integrity?.algorithm!=='SHA-256'||integrity.digest!==await digest(payload))throw Error('Recovery checksum does not match. The file may be damaged or edited.');}
 return {data:structuredClone(p.branch.data),source:{bookId:p.bookId,branchId:p.branch.id,revision:p.branch.revision,exportedAt:p.exportedAt||null},verified:p.version===2};
}
