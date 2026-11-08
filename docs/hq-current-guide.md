# Current HQ writing guide

HQ owns the protocol index. Arabic and English resolve independently before new work packets. Arabic current selection requires zk7 or a later eligible published edition. English follows its own published family. Exact selected version, family and SHA256 must match. Explicit draft, experimental, superseded, archived and unapproved entries are excluded.

Book and passage decisions retain their approved scope. Saved chapter methods are historical provenance and are never silently relabeled. Bundled zk6 and zk5e files remain historical references; they are not confirmed current defaults.

Current display references expire after five minutes. Malformed and future timestamps fail closed. An offline verified cache may be read as history but cannot authorize a new current work packet. Review HTML, review JSON and question exports retrieve current guidance. Versioned review imports refresh before comparing references. An unavailable guide blocks preparation with a visible explanation.

Chapter writing requests refresh the selected guide before export. Changed version or digest clears the displayed selection and requires another review. Retrieving a guide never modifies manuscripts or approves a proposal.

The shared chapter layout and writing stamp follow docs/IBN_ELGABAL_PAGE_DESIGN.md. Protocol links preserve historical identity where recorded; current guide links lead to HQ. The complete zk7 Language Lab reference is https://chatgpt.com/library?file_id=libfile_12e5dc5bf3d08191984cf4dd5437632d&account_id=personal.

This document describes the candidate integration. See current-version-implementation-handoff.md for tested scope, installation order and remaining production acceptance. The additive request and separate action endpoints are installed and passed rollback checks. Application rollout remains pending.

## Registered book request context

Ibn Al Jabal writing requests now retrieve the current planning branch revision before recording the request. The server locks that branch and the saved chapter, rejects a missing or changed planning token, and attaches the exact current decision records with their individual statuses. The exported packet includes that server-confirmed context. Manually typed notes remain separate and do not become approval evidence. The All book notes path resolves the same registration from its book URL.

This is request preparation, not prose approval. Other books retain their existing behavior until their planning sources are registered. The complete request still needs an author or editor to assess meaning and reconcile unresolved decisions. No story text or approval is changed by this release.

Installation evidence for v267: `chronicles_protocol_request_planning_context` updates the existing invoker RPC without changing grants or RLS. Rollback tests cover both chapter storage paths, missing planning tokens, stale planning revisions, exact returned decisions and valid requests. Test notes are rolled back. Manuscript fingerprint remained `97e152d15f1bfb2aab0068cfaebb4087`. Application rollback alone leaves old registered-book request exports blocked; restore the prior RPC definition from the preceding source commit only as an explicitly reviewed rollback.

Publication status: automatic approval review rejected the main branch push because explicit approval of that production mutation is required. The previous RPC definition was restored exactly and verified after the successful rollback tests, so live v266 remains compatible. This implementation is a tested local candidate, not deployed coverage. After approval, recheck main, reinstall the planning-context migration, publish the reconciled candidate to both editions, then verify live sources and update the HQ registry.
