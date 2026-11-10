# Book export, release 274

Requested by Benji on 10 November 2026: expose Export beside Story, Chapters and Review and offer PDF alongside HTML. Shared navigation applies to both editions and both book storage paths. Desktop uses four columns; phones use two rows. No manuscript, planning or approval records are modified.

Independent book Export now renders its selected sections and chapter range into the existing PDF generator. The HTML and PDF derive from the same selection; planning draft labels are retained. Arabic PDF pages are rasterized with the bundled font, so HTML remains the searchable, copyable format. The downloaded package HTML also offers Print / Save PDF for offline use. Persistent file links provide the iPhone Open file, Share, Save to Files path.

PDF generation rejects a changed selection, book, navigation or detached form before delivery and ignores duplicate clicks. This is an opened-page snapshot, not a server transaction or a guarantee that no external edit occurred during generation. Existing collection books retain their existing PDF/HTML generator. No new dependency or database migration is required.

Recovery: preceding main commit 7cfd6c74867927787f74ec3d738829326c65f114. Required release suite and focused package selection regression cover both languages. Physical iPhone acceptance remains separate from browser viewport checks.
