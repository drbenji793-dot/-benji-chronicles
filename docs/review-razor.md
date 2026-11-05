# Review simplicity contract

Approved by Benji on 5 November 2026. Rule: _razor, HQ RAZOR01.

Review has one job: read feedback and choose improvements. The initial page has Export for review, Add feedback and active feedback only. Empty panels, rulebooks, templates and revision history are absent from the daily workspace.

Export selects all or selected saved chapters and creates one HTML file containing instructions and text. Its optional structured return packet can be imported through Add feedback. Plain reports are pasted in the same dialog. Imports retain source, scope, version and exact quote validation and require selection. The page does not run an AI service.

Existing editorialReviews and editorialFindings remain in place. UI task decisions use reviewDisposition and reviewHistory, leaving prior finding status, repair approval, continuity and verification records unchanged. Mark resolved requires the author to describe checking the saved text. It is an author task disposition, never automated repair verification. Completed records can be reopened. Every save uses the planning revision guard and update stamps; chapter data is never written by Review.

HQ package hq-v005 is pinned under public/standards/hq, including _razor and current reference codes. Existing writing baseline adoption remains independent. Future interface changes must show purpose, primary action, data preservation and uncluttered empty state.

Verification: tests/review-razor.mjs covers empty page, save/reopen, keep/resolve, selected source-matching import, optimistic conflict draft retention and unchanged manuscript. tests/critique-export.mjs covers Arabic/English safe exports and stale save rejection. Actual iPhone Safari download/share/reopen acceptance remains separately tracked.
