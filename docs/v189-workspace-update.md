# Reader v189 implementation and acceptance

Starting point: both production editions were READY on commit 382c23fd89535bf2d421c4553367070aca9a1a3f, Reader v188. Locked v181 baseline remains in history. HQ and SCP are outside this change.

## Review availability

The old Review loader requested all planning branches with select=*, including archived data and base snapshots, plus chapter bodies before rendering. Ibn al Jabal has 18 branches, 17 archived. Their data fields alone expand to roughly 40 MB JSON. The replacement reads current branch metadata, only its editorial reports, and chapter metadata. A live read of the new path returned HTTP 200 for all three requests, 1,635 bytes total, branch r260. SQL EXPLAIN of the active metadata lookup completed in approximately 5 ms. Replaying the exact old request returned HTTP 500 after 13.3 seconds with “canceling statement due to statement timeout”. This reproduces the screenshot error; the bounded replacement succeeded. No timeout settings or database schema were changed.

Bodies load in batches of ten only for an export. Every chapter revision is checked against the displayed snapshot, with a final metadata check to detect additions, removals or changes. Reports are saved only after refreshing chapter revisions and reading the complete selected branch at the expected revision. No partial planning projection is used as a replacement payload.

Review owns its loading/error/retry states and suppresses late results after navigation or replacement. Failure does not imply empty history. Reports and drafts remain intact. Downloads have persistent Download HTML and Open file links. UI checks cover simulated timeout, Retry, overlapping loads, source conflicts and navigation.

## Story and navigation

Shared primary navigation is Story, Chapters, Story World, Review. Existing Notes, Export, Synopsis and chapter URLs remain functional. Story has compact Edit, Copy and Export actions, displays the existing summary, and collapses long planning, chapter plans, characters, pending decisions and help. No story summary is generated or silently adopted.

Source mapping:

| Display | Source | Behavior |
| --- | --- | --- |
| Concise story | selected branch data.summary | guarded edit of this field; marks synopsis for review |
| Full synopsis and planning notes | savedStoryBrief(selected data) | retained details, collapsed |
| Chapter plan | storyDraft.chapters, otherwise currentStory.chapters | explicitly planning, not manuscript |
| Characters | current branch character IDs | links to existing cards |
| Decisions | shared questionGroups projection | linked original records, no copies |
| Story Bible for The Last Hour | existing Bible renderer | preserved at view=bible, linked in resources |
| Export | displayed working branch, or published snapshot only on published Storyline route | separate source and export timestamps |

The original Ibn al Jabal book and its 49 chapter review edition keep their existing chapter scopes. Review on the latter now uses the shared Ibn al Jabal planning branch for reports, matching its existing Story World mapping.

## Decisions

Needs your decision excludes deferred questions and saved answers. Pending application retains saved answers until they are applied or resolved. Deferred is separate and collapsed. Event questions already linked to a question card are not counted twice. Choices/context and secondary controls are collapsed. The same state projection powers Story and Questions.

## Remaining work

Editorial reconciliation of old names, approval conflicts and detailed synopsis notes is not completed by these presentation changes. The newer proposal for a single structured clue/secret model and independent character knowledge still needs implementation and migration review. Evidence based self critique remains a manual review/import workflow; this release adds no AI service. Original chapter prose is untouched. Actual iPhone Safari acceptance, sharing and reopening still require device testing. Desktop checks do not establish iPhone acceptance.
