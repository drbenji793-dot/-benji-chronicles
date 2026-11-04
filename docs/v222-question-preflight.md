# Reader v222 | Sourced question preflight

Baseline: verified public Reader v221 at GitHub commit 653df16323e38a7e5b12dc5c4292b757c5946d44.

The shared question editor now exposes a compact collapsed source check before presenting or changing a question. It reads the current selected book, language, branch and planning revision, the saved Story Brief, linked event and character IDs, loaded chapter metadata, duplicate question titles, saved protected decisions and flagged stale or missing evidence. It does not infer approval or create a question automatically.

Authors may link a saved chapter as question evidence. The current chapter ID and revision are stored with the question through the existing revision guarded save path. If the chapter was retired, missing or changed, the source is identified for review rather than replaced silently. Existing selection modes and incompatible answer pair safeguards remain unchanged.

A targeted regression program checks both Arabic and English source identities, duplicate detection, protected decisions, missing and retired links, chapter drift, escaped HTML, data immutability, and the actual question editing form with a saved chapter selection. All configured release and edition checks and both language builds must pass before publication.

The separate outdated standalone answer demonstration was not used as the release gate because it expects retired Arabic interface labels and a historical sourceDocument mirror. Those assumptions are not a basis to rewrite production story data. The current supported lifecycle continues to be checked by the configured test suite.

No manuscript, story prose, cover, source approval, HQ, SCP or production data was modified. iPhone Safari acceptance and independent archive restore remain open.
