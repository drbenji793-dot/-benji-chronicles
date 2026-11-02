# Reader v193: current manuscript routing

Live inspection after v192 found that the legacy Ibn al Jabal planning book route opened Review against nine original chapter records, although its Chapters action led to the current manuscript book. Review and Export on that legacy route now redirect to the same current book as Chapters. The selected planning branch and other URL parameters are retained. Explicit archive=1 routes continue to read the original book. The Review screen identifies Current manuscript or Original archived manuscript so the source is visible.

No manuscript, planning record or historical chapter was moved, rewritten or deleted. Both books continue to share the original planning branch identity. The regression exercises the real library renderer for current and archive Review routes and asserts chapter request scope, retained branch, planning identity and no writes. Existing export regressions cover saved-source fidelity.

## Read-only content audit

Planning r262 still has 100 character records: 22 names marked existing, one approved, 76 candidates and one unclassified. It has 84 stored questions. Brother Yusuf bin Hilal is distinct from the candidate Younos paper maker. The corrected deferred question still references Yusuf. Ibrahim the blacksmith retains the historical alias Yusuf the teacher; aliases and embedded historical snapshots must not be globally replaced. Saad Abu al Ala is explicitly marked approved in the current character record, independently of proposed biography. The deposit keeper Abd al Hadi has a current decision and event reference; an older instruction to leave the trader unnamed must not silently overwrite it. Those sources need dated approval reconciliation before any further content change.

Audit did not write to production. Unresolved story choices and full cross-record reconciliation remain tracked separately from code completion.
