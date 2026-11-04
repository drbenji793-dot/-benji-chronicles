# Reader v224 | Repair verification requires actual replacement evidence

Baseline: public Reader v223 at GitHub merge 572c9f733499c2f7f710dd5fec24d495f4589f11.

The shared Review repair verification check is stricter. Previously, an approved replacement paragraph appearing once somewhere in a newer saved chapter could count as verified even when the original paragraph remained in the chapter. This could certify an incomplete or unrelated edit.

Verification now requires all of the following from current saved chapter evidence: same stable chapter ID, newer revision than the original proposal, loaded nonempty paragraphs, exactly one matching approved replacement, the original paragraph absent, and the replacement present at the saved finding paragraph location. A moved or duplicated replacement or lingering original remains unverified and provides a reason for editorial review. This is conservative: a legitimately moved paragraph can be manually rechecked rather than silently approved.

The existing planning fingerprint, author approval state, source revision and separate prose workflow restrictions remain intact. Successful verification records the exact new chapter revision and verified paragraph. It does not declare larger story continuity corrected or change manuscript contents.

Dedicated regression covers Arabic and English, stale revision, moved/duplicate replacement, old text still present, missing paragraphs, success and immutable saved source. Existing full Review flow and both edition builds must pass. Physical iPhone Safari acceptance and external backup SHA256 parity remain separately open.
