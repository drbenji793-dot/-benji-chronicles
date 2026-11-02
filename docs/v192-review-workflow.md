# Reader v192: review exchange and repair workflow

Starting live source: v191, main a762e2c56bc3489f0aa6b5c74281232107f123f1. The local starting tree matches that release.

Review now exports a structured UTF-8 JSON source packet with current planning, book language, chapter IDs and revisions, numbered saved paragraphs and instructions for attributed GPT or Claude findings. Returned files are parsed without executing content. The preview starts with no selected items. Import validates book, branch, language, planning fingerprint, saved chapter revision, exact paragraph evidence and duplicates. Only selected valid findings are appended as proposals through the existing branch revision guard. A failed batch does not partially persist. Review does not call an AI service.

A finding can link to an existing current question or event by stable ID, with a reason, without copying or changing that record. Accepted findings can have a separate exact paragraph before/after proposal. The complete before paragraph must exist in saved text and contain the cited quote. An author can approve, reject or defer that proposal with a recorded reason. Approval does not edit or publish manuscript prose. Existing repair proposals and decisions are nested under the finding and included in its record stamp and readable HTML export. Local repair drafts survive reload/conflicts.

After an approved repair is saved through the normal chapter editor, Verify saved repair checks that its exact proposed paragraph occurs once in a newer saved chapter revision, and that planning remains the cited source. Only then is the repair marked verified with evidence. This is exact passage verification, not a claim that every downstream editorial effect has been resolved. A finding is not automatically closed. Subsequent chapter changes continue to surface the original source mismatch.

Both editions use shared handlers. Existing reports, chapter bodies, current decisions and book content are preserved. No production story records are written during verification.

## Remaining boundaries

This does not automatically choose names, resolve the traitor conflict, approve protected dialogue or endings, or apply prose. Current source reconciliation, creating new linked questions, shared cross-workspace queues, independently reviewed story essence and actual iPhone Safari acceptance remain open. JSON exchange is an explicit structured reviewer handoff; the usual readable HTML review brief remains available. Claims of independent review are not made for GPT self critique.

## Validation

Regression exercises Arabic and English, wrong scope/language, stale planning and chapters, duplicate imports, exact quotations, all-or-nothing construction, existing-record links, separate approval, unchanged manuscript input, exact newer-source verification, local drafts, HTML escaping and actual repair form handlers. Full release checks and both edition builds are required before publication.

## Story views in this release

Story now selects Short synopsis, Full synopsis or Chapter plan from the same loaded planning revision. Copy and HTML export follow the selected view, with explicit planning scope, pending decisions and source stamps. The duplicate expanded section is hidden while its content is the main selected view. Only the short summary's existing editor is enabled; no new text is generated and no old planning content is promoted as approved. Pending saved answers are now included as linked decisions rather than disappearing from this overview. Tests verify selected-view content, export scope, preserved full planning and existing save guards in both languages.
