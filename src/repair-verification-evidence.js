const normalized=value=>String(value??'').replace(/\s+/gu,' ').trim();
// Verify an exact saved replacement without declaring its wider story effects resolved.
// A moved or duplicated replacement requires a fresh manual review rather than guessed success.
export function repairVerificationEvidence(repair,finding,chapter){
 if(!chapter||chapter.id!==finding.chapterId)return {ok:false,reason:'Current saved chapter is unavailable for repair verification.'};
 if(!Number.isInteger(chapter.revision)||chapter.revision<=repair.chapterRevision)return {ok:false,reason:'A newer saved chapter revision is required.'};
 if(!Array.isArray(chapter.paragraphs)||!chapter.paragraphs.length)return {ok:false,reason:'Current saved chapter paragraphs are unavailable.'};
 const after=chapter.paragraphs.map(normalized).filter(s=>s===normalized(repair.after)).length;
 if(after!==1)return {ok:false,reason:'The approved passage is not uniquely present in a newer saved chapter.',afterCount:after};
 const beforeStillPresent=chapter.paragraphs.some(s=>normalized(s)===normalized(repair.before));
 if(beforeStillPresent)return {ok:false,reason:'The original saved paragraph is still present. Verify the intended replacement before resolving the repair.',beforeStillPresent};
 const newIndex=chapter.paragraphs.findIndex(s=>normalized(s)===normalized(repair.after));
 const originalIndex=Number(finding.paragraph)-1;
 if(Number.isInteger(originalIndex)&&originalIndex>=0&&newIndex!==originalIndex)return {ok:false,reason:'The approved passage appears in a different paragraph location. Recheck surrounding source context before verification.',newIndex};
 return {ok:true,afterCount:after,beforeStillPresent:false,chapterRevision:chapter.revision,verifiedParagraph:newIndex+1};
}
