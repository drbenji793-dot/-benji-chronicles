# Connected Arabic and English Chronicles

Arabic production: https://benji-chronicles.vercel.app/
English production: https://benji-chronicles-english.vercel.app/

Both Vercel projects build the same GitHub repository and application. The English project sets SITE_LANGUAGE=en; Arabic defaults to ar. One source keeps themes, logos, alignment, mobile controls and editing tools consistent. Run npm run build before serving. The build sets the document language, title, brand and installed-app manifest for the selected site.

The existing Supabase books, chapter identifiers, language values, histories, approvals and Ink connections remain intact. Separation is by site routing and library language, not by destructive copying. Old links pointing to the other language redirect to its site. Arabic and English remain shared public collaboration workspaces with the existing writer selector; the selector is not authentication.

On Arabic book and chapter pages, Translate to English and Create English adaptation open a saved-chapter selection panel. Benji approves the selected source revisions. The atomic RPC creates a linked English book and blank English draft chapters, attaching immutable Arabic source snapshots. It does not claim to generate a translation and never inserts Arabic text as finished English prose. Translation and adaptation are separate linked editions. Repeat sends skip previously linked source chapters. A changed source revision rejects a stale send.

English drafts use the existing editor, save, history, review, and approval workflow. The source panel displays source revisions, original Arabic snapshots and later Arabic changes. Confirming a source review records only the reviewed revision, never overwriting English prose. Existing English books retain their original Arabic relationships and approval checks; no source revision is invented retroactively.

Saved cloud content is shared across origins. Device-only unsaved drafts remain on the origin where they were written. Save existing English drafts before following an old English link to the new site.

Validation: npm run test:editions exercises both sites with browser DOM fixtures. tests/english-bridge.sql verifies the RPC as the public client in a rolled-back transaction. db/english-editions.sql is the applied additive Supabase migration. Existing legacy tests have independent harness problems with import.meta and missing browser globals; they are not a substitute for the edition integration checks.
