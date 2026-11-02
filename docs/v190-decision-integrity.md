# Reader v190: question integrity and connected review

Base: published v189, merge commit 6459cdd679878fdd112c6f6e1ce05edd5e0fcfca.

Editing one question previously rebuilt the array from active questions, dropping retained superseded records. The new identity-preserving updater changes only the selected record and refuses retired or missing identities. Deferring preserves the answer and notes. Applied, approved and resolved decisions cannot be silently reopened or overwritten through the answer form. Conflicts remain in the attention queue.

Connected changes cannot mark a question Applied without an actual event or summary change. Application records retain source and resulting revisions, affected event IDs, selected writer and scope. Exported proposal briefs exclude historical source snapshots and retain question identity. Readable answer exports exclude retired cards while the explicit embedded backup retains complete data.

The connected event queue now offers an individual review, its recorded cause when available, and a note required before completing a check. Missing references remain visible. Review completion checks the source revision and event content, preserves event text and does not approve manuscript prose. Unknown causes are explicitly identified, not invented.

## Scoped live name correction

Planning branch 9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1 at r260 identified Yusuf bin Hilal by stable character ID 26df9740-c7b6-44ab-a04d-9b72df78be9e, sourceKey char_brother_name, nameUseStatus existing. A distinct character is Younos the paper maker. Question 2ece6f7b-4f0f-4181-ae14-fd5c717352aa referred to the brother as Younos.

Recovery r260 exists in chronicles_dsl_history. Guarded update r261 changed only that question's title and explanatory note to Yusuf and linked its character ID. Its deferred state, answer and options were preserved. Question and workshop stamps were updated. Readback verified all other questions, other workshop fields and unrelated planning roots unchanged. r262 records that verification and corrects a wording typo in the update log only. No manuscript table was updated. This does not resolve the deferred question or approve proposed biographies.

## Verification and remaining work

All 33 configured test programs passed before publication, including new lifecycle and connected review evidence tests. Edition and build checks are recorded separately at release time. Actual iPhone acceptance remains open. Broader name reconciliation, structured self critique findings, selective approved repair application and character knowledge tracking remain incomplete. No automatic AI critique has been added or claimed.
