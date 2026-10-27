# Book Navigation T001

All independent books, in Arabic and English, use the shared compact book navigation on every page.

Required tabs: Contents, Chapters, Storyline, DSL, Blender, Characters, References, Critique.

Every destination retains the current book ID. Chapters opens the first available chapter, or the book overview when empty. Blender opens the current book DSL Blender. Characters opens its DSL Characters view. Highlight the active tab and expose aria-current. Keep Story cover, Book Rules, and the matching language Library links below the tabs.

Reuse the existing responsive ink-tabs styling. Preserve chapter content, rules, revisions, and approvals. Planning tools start with each book’s own data.

Verification: node tests/book-navigation.mjs and node tests/dsl-blender-ui.mjs.
