# Current version implementation checkpoint

Status: candidate implementation with isolated release checks passed after reconciliation. The three additive database endpoints are installed and their rolled back checks pass. Application production deployment and acceptance remain pending. Benji requested system work without manuscript writing or author prose approval.

## Added coverage

The separate Approve action now captures the planning source before opening its confirmation, checks it again on submission, and passes it to a server transaction. Separate transfer passes its reviewed token to its own transaction endpoint. Both endpoints lock the chapter and the registered planning branch and delegate to the existing approval or transfer implementation. Combined approval and transfer retain the deployed endpoint.

The SQL file is the complete additive installation source. The separate approval, separate transfer and protocol request endpoints were installed on 8 November 2026. Their anonymous role transaction checks passed. No manuscript or approval fixture was persisted.

## Pending acceptance

Separate action UI and database checks now pass. Direct legacy RPC clients still lack reviewed planning tokens. Production deployment and browser acceptance remain pending. Keep the production release number unchanged until that release.

## Guide authority

Current general Arabic guide: zk7.0, complete Language Lab: https://chatgpt.com/library?file_id=libfile_12e5dc5bf3d08191984cf4dd5437632d&account_id=personal

HQ protocol selection remains dynamic and language scoped. Preserve book and passage choices and do not relabel old zk6 experiments. Manuscript changes, biography and relationship decisions remain separate author review items.

## Current source enforcement continuation

Reconciled with main b47ce70a6c7e3814107d5bd8b8c31c8319666809, including the shared Ibn Elgabal chapter template, saved writing stamp, author default and three compact footer disclosures. The saved method remains factual provenance and is never silently relabeled.

Arabic current guide selection rejects editions below the approved zk7 major. Later eligible published majors still resolve dynamically. Explicit historical guide requests remain available for history. Current selectors exclude explicitly draft, experimental, archived, superseded or unapproved index entries. Both languages keep independent caches and hash checks.

Bundled guidance and offline caches cannot appear as confirmed current guidance in new work packets. Current display references expire after five minutes. Review and question packet exports retrieve current guidance again; a versioned review import does too. The chapter request exporter refreshes the guide and stops if its edition or digest changed since display. Original manuscript and book decisions are not edited by retrieval.

The shared chapter stamp uses editable provenance fields from the current main branch, not a menu of obsolete guide defaults. Its Arabic register buttons retain _am and _f. The saved historical method is retained on edits unless the user explicitly changes it.

The protocol request attribution write now calls chronicles_record_protocol_request. The additive SQL source locks the chapter, compares its exact revision and inserts the request note while holding that lock. It records the supplied guide reference, not authentication of HQ approval. Installed from db/protocol-request-source-guard.sql; both storage paths passed rollback checks. No table policies or privileges are widened.

The full release suite passed after reconciliation: all 94 configured test scripts and the Arabic/English edition checks. The Arabic production build also passed. Tests now use synthetic published zk7 Arabic and independent English fixtures; bundled guides are checked as historical assets only. Offline, stale, malformed and future current references are rejected. Higher experimental or explicitly unapproved editions are excluded. Application production release and browser acceptance remain pending.

## Continuation

Current Book Brief now declares whether its guide is confirmed, distinguishes reference-only exports when unavailable and explicitly grants no approval. Current-guide timestamps reject malformed or future cache values. A guide change during request export clears the displayed reference and requires a fresh load so the user cannot accidentally review the old link while submitting the new version. The isolated checks cover these states. Production acceptance remains pending.

## Review export closure

Books without a planning branch now retrieve current HQ guidance before exporting review HTML. The actual export handler test proves an unavailable guide produces no new download. The approval test awaits the source preflight before using its confirmation, matching the asynchronous UI instead of assuming a synchronous dialog.

No production application branch, manuscript text or author approval was changed. Additive database functions were installed separately.

Validation date: 8 November 2026. Current main reference rechecked at b47ce70a6c7e3814107d5bd8b8c31c8319666809. Remote preview status is independent of these local checks.

## Installed database coverage

Migrations: chronicles_reviewed_separate_actions_and_protocol_requests and chronicles_reviewed_transfer_existing_target. The latter fixes an existing Ink target lookup when workflow mapping is absent, while retaining exact target revision comparison. All endpoints are SECURITY INVOKER with an empty search path. Existing table privileges and row policies are unchanged.

Anonymous role tests in tests/reviewed-separate-actions.sql reject stale chapters, stale or missing planning tokens and the missing approved name; corrected fixtures transfer, roll back fully and retry. tests/protocol-request-source.sql checks both chapter storage paths, rejects stale revision, offline, bad digest, historical Arabic and mismatched registers, and records valid Arabic and English references inside the rollback only. The server records the caller reference; it does not authenticate HQ publication.

Manuscript fingerprint before and after: 296ceff5d3b0fa9ecc7d1e5ad562b97e, 50 entries, zero recorded approvals. Browser regression checks require comparing an existing Ink target before separate transfer and send its exact revision. Both remote builds for preceding candidate 0ef40c56 passed.

## v263 release preparation

Preceding production on both aliases: b47ce70a6c7e3814107d5bd8b8c31c8319666809, v262. Candidate 91750c4138c1a1f2002c97433a2891b3e685c7fc passed both remote Vercel builds. Both production aliases and main were reread before release preparation. Live HQ resolution returned Arabic _zk7.0 (eba9079fe0ab738175a27ce69a985e5b4882b52cce85b14a45b34d00fcdce106) and English _zk5e.0 (c5614244533152327a2338baa3711ae4077f8b42c098328c89d2afd4c4a07432), online with matching protocol digests.

v263 carries the installed source transactions and guide checks to the application. Verify the production aliases against the resulting release commit before marking rollout live. Rollback application to b47ce70 if needed; retain the additive database functions and all history.
