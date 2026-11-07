# Current version implementation checkpoint

Status: implemented in a development branch, not deployed or verified. Benji requested implementation first with testing and author approval later.

## Added coverage

The separate Approve action now captures the planning source before opening its confirmation, checks it again on submission, and passes it to a server transaction. Separate transfer passes its reviewed token to its own transaction endpoint. Both endpoints lock the chapter and the registered planning branch and delegate to the existing approval or transfer implementation. Combined approval and transfer retain the deployed endpoint.

The SQL file is the complete additive installation source. Do not deploy the client until the new endpoints have been applied and tested. No production migration or content mutation was performed for this checkpoint.

## Pending acceptance

Run the full release suite, extend actual UI tests for separate approval and transfer, run anonymous-role transaction and rollback tests for both new endpoints, check direct legacy RPC coverage, then publish both editions. Keep the production release number unchanged until that release.

## Guide authority

Current general Arabic guide: zk7.0, complete Language Lab: https://chatgpt.com/library?file_id=libfile_12e5dc5bf3d08191984cf4dd5437632d&account_id=personal

HQ protocol selection remains dynamic and language scoped. Preserve book and passage choices and do not relabel old zk6 experiments. Manuscript changes, biography and relationship decisions remain separate author review items.

## Current source enforcement continuation

Reconciled with main 83dfc22eb40ad508a7017b2a42d30fe3d1ac30b2, including the English method display and compact chapter tools. The saved method remains factual provenance and is never silently relabeled.

Arabic current guide selection rejects editions below the approved zk7 major. Later eligible published majors still resolve dynamically. Explicit historical guide requests remain available for history. Current selectors exclude explicitly draft, experimental, archived, superseded or unapproved index entries. Both languages keep independent caches and hash checks.

Bundled guidance and offline caches cannot appear as confirmed current guidance in new work packets. Current display references expire after five minutes. Review and question packet exports retrieve current guidance again; a versioned review import does too. The chapter request exporter refreshes the guide and stops if its edition or digest changed since display. Original manuscript and book decisions are not edited by retrieval.

Chapter method options use the current language guide when confirmed, plus the saved historical method and Manual. Old zk5/zk6/zkalam4 choices are not offered as current defaults. The saved historical method is retained on edits unless the user explicitly changes it.

The protocol request attribution write now calls chronicles_record_protocol_request. The additive SQL source locks the chapter, compares its exact revision and inserts the request note while holding that lock. It records the supplied guide reference, not authentication of HQ approval. Install db/protocol-request-source-guard.sql before deploying the client. No table policies or privileges are widened.

Syntax parsing completed for changed JavaScript. Functional regression suites, database installation, production release and browser acceptance remain pending. In particular, older tests that assumed bundled zk6 as the current guide need replacement fixtures proving current zk7 retrieval and refusal of unavailable guidance. Do not deploy this branch before those checks pass.

## Continuation

Current Book Brief now declares whether its guide is confirmed, distinguishes reference-only exports when unavailable and explicitly grants no approval. Current-guide timestamps reject malformed or future cache values. A guide change during request export clears the displayed reference and requires a fresh load so the user cannot accidentally review the old link while submitting the new version. These changes remain implementation-only pending acceptance.
