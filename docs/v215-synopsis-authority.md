# Reader v215 | Source authority for Story and Synopsis

Production baseline: Reader v214, GitHub commit 1229d8f63c47038829ba08f8db3ff3a729ca7ce6.

## New shared capability

Story and Synopsis now consume one read only, collapsed Current source checks panel. It reports the exact book ID, branch ID, working planning revision and explicitly labels any unavailable published book revision as unestablished rather than guessing.

For each currently selected synopsis section, the panel traces stored character, event, question, decision, place and chapter references. It shows current source labels, the recorded source status, saved versus current revision, missing or retired sources, proposals and conflicts. Old character names or aliases in text are review candidates tied to a stable character ID. They are never marked automatically obsolete and are never globally replaced.

Within the author Synopsis workspace, open, deferred and conflicting questions and active structured critique findings appear separately in collapsed Pending decisions and Editorial review notes subsections. The displayed narrative text remains unchanged. Story reuses the same source evidence but does not duplicate its existing shared pending queue.

## Safety and verification

The implementation is read only. No book content, saved manuscript, source decision, cover, translation, user preferences, HQ or SCP data is changed. All text is escaped before rendering. It does not infer that a working revision equals a published book version or that a metadata label establishes literary truth. Source reconciliation proposals and final author choices remain open.

New regression tests cover both languages, missing and retired links, proposals versus approvals, source revision changes, explicit publication uncertainty, alias candidates, HTML escaping, pending decisions, notes, empty states and data immutability. Existing Story and Synopsis save and export behavior remains in place.

Actual iPhone Safari acceptance and external backup restoration remain separately unverified.
