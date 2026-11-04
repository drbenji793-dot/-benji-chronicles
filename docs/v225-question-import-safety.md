# Reader v225 | Question import consistency and lifecycle acceptance

Baseline: verified GitHub main Reader v224 at 0d3f63e70eea8c0123cf0bea5d1c36f434b169bf.

The author question editor already prevents incompatible multiple answer selections. The question package import previously checked selected answers, duplicates and single selection but did not enforce the question's explicit incompatibleOptionPairs. This means an imported suggestion could bypass the manual author contradiction rule.

The portable response validator now calls the same shared validateQuestionSelection used by manual saving. Contradictory choice pairs are rejected before any imported response proposal can be stored. It still verifies exact book, language, planning branch/revision, chapter source list, source fingerprint, current options and protected decisions.

A new complete bilingual workflow regression exercises a locked character identity, a genuinely open role decision, deferral preservation, incompatible selections in both manual and imported paths, current source preflight, stale chapter and event data, and attributed GPT proposal review. Acceptance of an imported suggestion saves an answer as pending and never approves or applies it automatically. The original manuscript, character identity, events and author choices are preserved.

This is a reusable machine fix only. No production book records, novel prose, covers, HQ, SCP, database schema or earlier decisions are edited. Actual iPhone Safari end to end acceptance and external archive restoration remain separately unverified.
