# Version 205

This release combines planning recovery, synopsis coverage and connected review improvements. It does not modify production manuscript or planning records.

Planning JSON exports now preserve complete selected branch data with a SHA256 checksum. Restore file validates format, book, stable identities, source metadata and integrity, then previews a separate recovered path. Legacy files remain readable with an explicit lack-of-checksum notice. Corrupted, wrong-book and partial files are rejected. Unknown future fields and review histories survive recovery.

Synopsis source reviews include places and saved chapter revisions, retain prior reviews and recover unsaved review notes. Newly added sources, changes to any selected record content, missing chapters and changed related synopsis views reopen review. Pending work exposes these warnings. Approved concise summaries route through proposals rather than direct overwrite.

Connected event reviews retain the triggering events/records and source revision. Direct dependencies are distinguished from indirect recorded connections, without inferring narrative consequences. Pending cards and review dialogs display this context.

Validation includes Arabic and English rendered recovery flows, all question state counters after JSON reopening, branch guards, unchanged manuscript sources, selected chapter and related synopsis invalidation, direct/indirect dependencies and source review draft recovery. See story-route-map.md for the current route/source inventory and concrete backup limitations.

Manual question creation now requires a reason, blocks exact normalized duplicates of active questions or decisions, supports explicit single versus compatible multiple choice policies, and records linked source snapshots. Source changes are displayed before answering. These checks do not claim to determine semantic contradictions or whether an author preference is correct. Legacy compatible multiple selections remain unchanged.

Copied applications from another path now remain visible for contextual review instead of being hidden as verified. Newly added and changed chapter metadata are rechecked before synopsis review saves; source review links open the appropriate Story view.

Clue cards now contain their review outcomes and notices directly, with linked saved chapter titles and revision evidence. The inventory points back to those cards instead of duplicating their review controls. Character and event display links continue to resolve current stable identities.
