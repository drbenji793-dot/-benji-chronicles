# Version 208

Decisions now supports a portable question JSON package with the current book, language, branch revision, planning fingerprint, saved chapter metadata, current planning context, existing answers, protected decisions and versioned writing guide. The instructions specify response attribution, exact choice values and proposal-only treatment.

Import previews current and proposed answers with reasons. Selected responses are saved as proposals, without changing answers or story records. Wrong book/path/language, changed planning or chapters, protected/missing questions, duplicate responses, unsupported choices and multiple single-choice selections are rejected. A current pending response prevents a duplicate import for that question.

Review can atomically accept selected responses as saved answers, reject, defer or reopen deferred proposals. Every selected acceptance is checked against the same unchanged source before one revision-guarded save. Any intervening source changes require a fresh package. Accepted answers still require the existing separate impact and application workflow. Pending work exposes unanswered response proposals; current brief exports retain proposed and deferred response context. Full recovery exports retain the history.

Tests exercise Arabic and English packages and actual file preview, explicit import and adoption handlers, including source drift and protected decisions. No production manuscript or planning records were edited during verification. Actual iPhone file selection, download and Share acceptance remains open.

Question context also exposes existing protected decisions linked to the same events or characters. The author can record Missing decision, Author preference or Factual inconsistency, urgency and whether writing is blocked. Older questions keep explicit unrecorded states rather than invented classifications. Exported packages retain these fields.
