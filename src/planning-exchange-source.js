// Verify the remote revisions used by a planning exchange without changing data.
export async function verifyPlanningExchange(api,{bookId,branchId,revision,chapters,chapterPath}){
 if(!bookId||!branchId||!Number.isSafeInteger(revision))throw Error('Planning source identity is incomplete. Reopen the workspace.');
 const rows=await api('chronicles_dsl_branches?book_id=eq.'+encodeURIComponent(bookId)+'&id=eq.'+encodeURIComponent(branchId)+'&select=id,book_id,revision,archived&limit=1');
 const saved=rows?.[0];if(!saved||saved.id!==branchId||saved.book_id!==bookId||saved.revision!==revision||saved.archived)throw Error('Planning changed or is archived. Reopen before exchanging review files.');
 if(chapters){
  const stamp=items=>{if(!Array.isArray(items)||items.some(x=>!x?.id||!Number.isSafeInteger(x.revision))||new Set(items.map(x=>x.id)).size!==items.length)throw Error('Chapter source revisions are incomplete. Reload before exporting.');return JSON.stringify(items.map(x=>[x.id,x.revision]).sort((a,b)=>a[0].localeCompare(b[0])));};
  const expected=stamp(chapters),live=await api(chapterPath+'&select=id,revision');if(stamp(live)!==expected)throw Error('Chapters changed while preparing this review. Reload and export again.');
 }
}
