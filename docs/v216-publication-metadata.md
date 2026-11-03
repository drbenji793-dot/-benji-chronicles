# Reader v216 | Published book revision versus current planning source

Baseline: Reader v215 on both public sites, merge e353da10a11940139db275494ab158e35deb51b1.

The saved Supabase project schema has a publication record in chronicles_dsl_projects with a revision and a published JSON object containing branch_id, branch_revision and published_at. A read only PostgREST select projects only these metadata fields, never the large published data payload, and filters by the exact current book ID.

Story and Synopsis now fetch this small publication record without blocking their initial render. They display the publication record revision, published branch and its revision, timestamp and compare the published branch to the selected working branch. Different branches or differing revisions are labeled explicitly. If metadata is absent or the read fails, publication remains unverified, not assumed current. The lookup does not approve edits or change any source.

A read only database inspection on 3 November 2026 confirmed why this distinction matters in a test book: the publication record was revision 19, the published branch revision was 179, while its same branch working revision was 262. The system must not confuse these states or present an unpublished working change as already published. No story content is included in the new request.

Tests cover the exact selected metadata projection, missing and invalid revisions, matching versus different branches, asynchronous Synopsis panel refresh, correct scope, and unchanged planning content. Existing Arabic and English tests and builds must pass before publishing.

Author decisions, full literary source reconciliation, real iPhone Safari testing, external backup SHA256 parity and recovery remain open. No manuscript, cover, HQ or SCP content changes.
