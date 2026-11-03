# Reader v212 | Chapter placement and source protection for clues

Starting point: verified Reader v211 production commit f2165c4d42e287c596c39d0dca3649d3a65884b5.

The Twists and Clues editor now permits explicitly planned setup and reveal chapter IDs in addition to existing setup, reinforcement and reveal event links. The UI describes these as planned placement, never as proof of saved prose. Current chapter titles and revisions are resolved from stable IDs on every render, without rewriting old story wording.

Proposals include linked chapter revision snapshots and reject unknown chapters, stale source changes and wrong book/path/branch. Approval retains existing guarded review and does not directly change manuscript text. Clue audits notice when setup chapter order follows reveal order, treating the finding as a potentially intentional structure rather than a proven story error. A reviewed result becomes stale when linked chapter revisions change.

A new targeted regression test covers setup and reveal chapter and event links, stale and unavailable source rejection, order warnings, current renamed titles, approval and unchanged original content. Both language releases use the shared implementation.

Remaining: recorded literary source reconciliation, reader facing spoiler policy, actual iPhone Safari acceptance, external ZIP parity and recovery, and author choices. No manuscript, production planning records, HQ, SCP, covers or unrelated design changed during software release.
