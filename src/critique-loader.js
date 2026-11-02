// Review opens with current metadata only. Manuscript bodies are loaded on export.
export const reviewFingerprint=rows=>JSON.stringify(rows.map(c=>[c.id,c.revision]).sort());
export function reviewPath(sourcePath,fields,{offset=0,limit=100,ids}={}){
 const [table,query='']=sourcePath.split('?');const q=new URLSearchParams(query);
 q.set('select',fields);q.set('order','chapter_number.asc,id.asc');q.set('limit',String(limit));q.set('offset',String(offset));
 if(ids)q.set('id','in.('+ids.join(',')+')');
 return table+'?'+q.toString();
}
export async function reviewMetadata(api,sourcePath){
 const rows=[];for(let offset=0;;offset+=100){const page=await api(reviewPath(sourcePath,'id,chapter_number,title,revision,updated_at',{offset}));rows.push(...page);if(page.length<100)return rows;}
}
export async function reviewBranch(api,bookId,branchId){
 const q=new URLSearchParams({book_id:'eq.'+bookId,archived:'eq.false',select:'id,book_id,name,revision,updated_at',order:'updated_at.asc',limit:'1'});
 if(branchId)q.set('id','eq.'+branchId);
 const rows=await api('chronicles_dsl_branches?'+q);if(!rows[0]){if(branchId)throw Error('Selected planning path is unavailable.');return null;}
 const b=rows[0],reports=await api('chronicles_dsl_branches?book_id=eq.'+bookId+'&id=eq.'+b.id+'&revision=eq.'+b.revision+'&select=reviews:data->editorialReviews&limit=1');
 if(!reports[0])throw Error('Planning changed while opening Review. Retry.');
 return {...b,data:{editorialReviews:reports[0].reviews||[]}};
}
export async function reviewBodies(api,sourcePath,metadata,isCurrent=()=>true){
 const rows=[];for(let i=0;i<metadata.length;i+=10){if(!isCurrent())throw Error('Review was closed.');const batch=metadata.slice(i,i+10);const page=await api(reviewPath(sourcePath,'id,chapter_number,title,body,revision,updated_at',{ids:batch.map(c=>c.id),limit:10}));
 if(page.length!==batch.length||page.some(c=>batch.find(m=>m.id===c.id)?.revision!==c.revision))throw Error('Chapters changed. Reopen Review before exporting.');rows.push(...page);}
 const latest=await reviewMetadata(api,sourcePath);if(reviewFingerprint(latest)!==reviewFingerprint(metadata))throw Error('Chapters changed. Reopen Review before exporting.');
 return metadata.map(c=>rows.find(r=>r.id===c.id));
}
