# Version 204

Clue source notices now support Reviewed unchanged, Proposal needed, Deferred and Needs clarification, each requiring a reason. These are review outcomes, not story approvals. No story fields or chapter prose change when a review is saved.

Reviews retain the branch revision, author, reason and evidence for the event, directly connected and setup/reveal events, stable character records and linked chapter revisions. Changed or unavailable evidence reopens the review. Save stamps alone do not reopen it. Review history survives JSON reopening; source packages include notices and review evidence. Previously reviewed items that need attention appear in Pending work.

The source check panel reports records awaiting review, preserves deferred and unchanged notices, and distinguishes deterministic metadata checks from story errors. Saving uses the existing branch revision guard and local recovery mechanism.

Validation covers both languages, all review outcomes, required reasons, stale sources, linked character/event/connection/chapter changes, export/reopen and rendered forms. No production content writes. Actual iPhone Safari acceptance and external backup parity remain open.
