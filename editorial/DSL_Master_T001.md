# DSL Master Template T001

**Dynamic Storyline Studio | Universal Novel Architecture Base**

Template: `DSL-T001` | Revision: `2` | Introduced with Chronicles Reader v102 | October 26, 2026

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

## Revision 2: Story Blender (Reader v103)

Story Blender is an integrated DSL tool, not a separate website. It reads the selected book and branch. Select event ingredients and reading or chronological order, name the scenario, and assemble an editable storyline from the actual event descriptions and outcomes. The original chapter manuscript is never changed.

Every saved blend retains a unique ID, author, time, source branch and revision, selected event IDs, order, scenario and immutable ingredient snapshot. Drafts are saved in the existing branch JSON using its revision guard, Supabase synchronization and history. Compare any two drafts. Repeated blending with unchanged ingredients is deterministic in assembly mode; it does not claim to invent fresh alternatives.

Creative AI workflow: download a grounded brief, discuss it with an AI assistant, paste the response into the editable result, and save a new draft. No live AI generation is configured. Free text scenarios are recorded as hypotheses, not automatically interpreted. Direct AI generation requires a server side model connection and appropriate usage controls.

Adopt Version previews the old and proposed summary and changes only the selected branch summary. Events, rules and chapters remain unchanged. Publishing the readable Storyline still uses the existing explicit Preview and Publish workflow. Older summaries and drafts remain in revision history. Opening this release never migrates existing book data; new fields are introduced only on an explicit save. Blank T001 includes an empty blender object and no example fiction.
