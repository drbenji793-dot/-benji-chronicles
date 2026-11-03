# Reader v209 | Shared question integrity

Base: production Reader v208, GitHub commit 666c40ec7db4298e94c417b5b7a3739a8279616c.

## Changes
1. Show concise current impact from linked event IDs, character IDs, protected decisions, unavailable records and source snapshot drift directly under each question. These are review candidates, not automatic story edits.
2. Allow an author to define incompatible option pairs in the question editor under an optional collapsed advanced control. A multiple-choice answer is refused if it selects both sides of an explicitly incompatible pair. Single-choice and unknown/duplicate option guards remain.
3. Apply these option guards through the shared answer persistence path, including imported question responses. Keep author choice, approval, structured application and prose review separate.
4. Add deterministic regression tests for impact, protected source links, missing sources, contradictory options, stale choices, editor validation and preservation of input data.

## Scope and verification
This release modifies the shared Chronicles application for Arabic and English. No database schema change is required. No story fact, chapter prose, cover, author preference or saved planning record is edited. Actual iPhone Safari Download, Share and reopening remain separately unverified. External backup equality and restoration have not been established in this release. No manuscript acceptance is implied.

## Follow-up
Continue current source reconcilia¶»§q«^