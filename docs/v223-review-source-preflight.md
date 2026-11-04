# Reader v223 | Evidence backed source checks for Review

Baseline: Reader v222 at verified production merge 0aae43bf0f5b09df7987018bc3f13b4064b3ad41.

Before reviewing stored critique findings, the shared Review workspace now offers a collapsed read only Current source checks panel. It reports the current planning record statuses, distinguishes approvals, proposals, conflicts, unresolved choices and retired records, and identifies mystery or clue records without assuming they are mistakes.

For each stored finding the panel compares the saved chapter revision with current saved chapter metadata, flags missing or retired linked sources, and resolves explicit linked events, questions and characters by stable ID. It identifies recorded older names and intentional aliases as review candidates using the existing Unicode aware source name matching, never as automatic replacements. Research gaps are explicitly not independently validated, and GPT self critique is labeled as a separate non independent pass.

Every status is a metadata observation only. It cannot certify literary correctness, infer an unstated story motivation, approve a historical claim, publish a decision or edit a manuscript. Existing review finding decisions, repairs, imports, exports and actual source records remain unchanged. The UI remains English; saved source names and quotes preserve original language.

A dedicated regression covers Arabic and English linked names, chapter drift, review status, missing chapter sources, conflicting facts, intentionally unresolved mysteries, HTML escaping, empty states and data immutability. All configured regression tests and both edition builds must pass before production. Actual iPhone Safari acceptance and external ZIP restore checks remain unverified.
