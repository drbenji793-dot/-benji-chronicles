// Registration identifies live sources, never a frozen manuscript snapshot.
const registrations={
 'c911584d-bd5b-42fe-b41c-a2a456c64d41':{bookId:'66739f5d-2bac-4d75-a4fd-6df93da8ac7e',branchId:'9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1'}
};
const normalize=t=>String(t||'').normalize('NFKC').replace(/<[^>]*>/g,' ').replace(/[\u064b-\u065f\u0670]/g,'').replace(/\s+/g,' ');
export async function currentVersionGate(api,chapter,kind,reviewed=null){
 const registration=kind==='extra'&&registrations[chapter.book_id];
 if(!registration)return null; // Unregistered books retain their existing approval workflow.
 const [chapters,branches]=await Promise.all([
  api('chronicles_book_entries?id=eq.'+encodeURIComponent(chapter.id)+'&book_id=eq.'+encodeURIComponent(chapter.book_id)+'&select=id,book_id,chapter_number,revision,body'),
  api('chronicles_dsl_branches?id=eq.'+registration.branchId+'&book_id=eq.'+registration.bookId+'&archived=eq.false&select=id,book_id,revision,data')
 ]);
 const saved=chapters?.[0],branch=branches?.[0];
 if(!saved||saved.id!==chapter.id||saved.book_id!==chapter.book_id||saved.revision!==chapter.revision)throw Error('The saved chapter changed. Reopen its current revision before approval.');
 if(!branch||branch.id!==registration.branchId||branch.book_id!==registration.bookId||!Number.isInteger(branch.revision)||!Array.isArray(branch.data?.decisions))throw Error('Current decisions could not be verified. Keep your draft and reopen the book before approval.');
 if(reviewed&&(reviewed.branchId!==branch.id||reviewed.branchRevision!==branch.revision||reviewed.chapterId!==saved.id||reviewed.chapterRevision!==saved.revision))throw Error('The chapter or its decisions changed during review. Reopen Review before approval.');
 if(saved.chapter_number===1){
  const decision=branch.data.decisions.find(d=>d.id==='claude-before-ch11-03');
  if(!decision||decision.status!=='approved'||(decision.recordStatus&&decision.recordStatus!=='current')||!decision.source||!normalize(decision.text).includes('سعد أبو العلا'))throw Error('The approved friend introduction needs reconciliation with the current decision record.');
  if(!normalize(saved.body).includes('سعد أبو العلا'))throw Error('Chapter 1 is missing the approved introduction of سعد أبو العلا. Review and save the correction before approval or transfer.');
 }
 return {branchId:branch.id,branchRevision:branch.revision,chapterId:saved.id,chapterRevision:saved.revision};
}
