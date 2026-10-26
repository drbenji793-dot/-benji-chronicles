# DSL 1, Reader v3.1

This additive authoring workspace keeps manuscripts unchanged. It adds an editable event graph, independent experimental branches, story objects, comments, server revision history, compare and explicit Storyline publication.

## Data boundary

Only chronicles_dsl_projects, chronicles_dsl_branches and chronicles_dsl_history receive DSL writes. Chapter entries are read for source references and revision warnings. No automatic chapter rewrite or transfer to Benji Ink occurs.

The initial Outside Time workspace has 5 summaries sourced from written drafts and 7 clearly marked outline proposals or questions. It is not a final approved plot. The first published snapshot is deliberately null.

## Collaboration

Save uses the existing id and revision as an optimistic concurrency lease. A conflicting edit is rejected and the local draft can be recovered as another branch. Changes are checked every 12 seconds while the page is visible. This is polling, not realtime presence or character-level collaborative editing.

The current public building mode uses writer labels only, not verified authentication. The Benji publication control is a workflow convention, not a secure owner identity boundary. No DELETE access is granted to the DSL tables. Revision records are created by triggers and cannot be directly changed by the public client.

## Publication

Preview shows a readable outline and changes. Publishing requires review and selects an exact branch revision and project revision in a transaction. The readable Storyline consumes that snapshot. Proposals remain labelled even after a snapshot is published. History restoration creates a new branch rather than overwriting later work.

## Honest limits

Dependency impact follows explicit links. Continuity checks cover dates, dangling links and source revision drift; they do not claim literary understanding. The ChatGPT action exports context as TXT; no live model calls, credentials, costs or automatic generation are introduced. Blank templates and project snapshots export as JSON; a full new-book template launcher and import/merge UI remain future work. Events are edited in forms; this release does not implement free-position drag-and-drop or automatic prose revision.

## Verification

Pure logic tests cover dates, branch independence, graph cycles, impact traversal, source drift and escaped output. Chromium interaction tests with isolated data cover event/comment save, branch creation, unchanged parent, publication, Storyline rendering, conflict recovery, no manuscript writes and 390px mobile rendering. Anon-role database tests were run inside a transaction and rolled back: save history, stale save rejection, blocked deletion, blocked direct history insertion, writer workflow and publication concurrency. Manuscript hash before and after: 825591bf6f1fd624e736271e4265869e.

Baseline: production dpl_38uo4D84jBmtLw9ufdUGszhwdqPs, Git 8673834ab74a2e0cee718cc788bfffc82993c9d1.
