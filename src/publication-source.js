export function publicationMetadataPath(bookId){
 if(!bookId||!String(bookId).trim())throw Error('Current book ID is required.');
 return 'chronicles_dsl_projects?book_id=eq.'+encodeURIComponent(bookId)+
  '&select=revision,branch_id:published->>branch_id,branch_revision:published->>branch_revision,published_at:published->>published_at&limit=1';
}

export function publicationMetadata(rows){
 const record=Array.isArray(rows)?rows[0]:null;
 const numeric=value=>value==null||String(value).trim()===''?null:Number(value);
 const n=numeric(record?.branch_revision);
 const recordRev=numeric(record?.revision);
 return {
  branchId:typeof record?.branch_id==='string'&&record.branch_id.trim()?record.branch_id:null,
  branchRevision:Number.isSafeInteger(n)&&n>=0?n:null,
  recordRevision:Number.isSafeInteger(recordRev)&&recordRev>=0?recordRev:null,
  publishedAt:typeof record?.published_at==='string'&&record.published_at.trim()?record.published_at:null,
  available:!!record
 };
}
