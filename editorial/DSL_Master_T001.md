# DSL Master Template T001

**Dynamic Storyline Studio | Universal Novel Architecture Base**

Template: `DSL-T001` | Revision: `1` | Introduced with Chronicles Reader v102 | October 26, 2026

## Purpose

Reusable, content-free novel planning framework. Reproduce the approved Chronicle DSL visual approach: Coffee / Parchment / Sage; compact connected event cards, year lanes, object icons, independent reading order, clear author attribution, working branches, review and history. Start a fresh book with no characters, plots, secrets, dates or objects copied from any other novel.

## Core model

* `template.id`, `template.revision` identify the reusable schema independent of the website version.
* `foundation` records premise, language, genre, audience, theme, central conflict, stakes, promise to the reader, starting approach, complexity and collaboration preference.
* `world` records physical settings, historical reference, technology, hard rules and exceptions.
* `characters` records name, role, desire, fear, secret, character arc and relationships, with optional links to events.
* `events` records independent permanent identifiers, calendar date precision, chronology, reading order, participants, knowledge, stakes, twist setup, outcome, state, source chapter and writer edits.
* `links` records cause, setup, reveal, contradiction, evidence and intentional cross-time connections.
* `objects` records identity, copies, owner, location, history and linked events.
* `decisions` allows future decision-specific records, while current decisions live on event cards.

## Views

Story Map, Timeline, Reading Order, Decisions, Characters, Knowledge, Twists, Objects, Story Health, Review and History. The original map is the visual anchor, not a replaceable placeholder.

## Creative work cycle

1. Start a new book from T001, choosing genre, structure and starting approach.
2. Describe the story in a short paragraph and add events even before chapters exist.
3. Connect events by explicit causal relationships.
4. Record character goals, knowledge changes, twists, false impressions and objects.
5. Explore alternatives in separate branches; the original is preserved.
6. Use Story Health for concrete questions about outcomes, missing causes, character arcs and unresolved decisions; no fake narrative score.
7. Preview and explicitly approve the readable Storyline; publishing it never rewrites chapter manuscripts.
8. Review affected chapters individually before using any proposed prose revisions.

## Collaboration, data and safety

Author labels are attribution and are not secure identity verification without sign-in. Database edits use the existing per-branch revision guard and history. No active story is changed when downloading T001 or opening its guide. Future template upgrades never silently update existing novels.

## Language conventions

Operational interface labels and hints in English. Authors retain control of writing language; Arabic fiction, titles, character names and substantive story notes remain Arabic when written that way.

## Relationship to HQ and Google Drive

Benji HQ is the intended reusable template catalog. Google Drive retains a separate reference copy. The template must not be marked synchronized until verified in both the actual HQ site and Drive. A GitHub production release, Google Drive backup, and HQ website update are distinct operations.

## Release tracking

Chronicles reader version numbers start with v101 and increment v102, v103, etc. The master template remains T001 revision 1 unless the reusable structure itself is intentionally revised.
