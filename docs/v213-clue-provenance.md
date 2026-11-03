# Reader v213 | Clue provenance and replacement references

Source baseline: Reader v212 verified production commit dd6580db5886de15f219181c26963f04a8da0ca9.

The shared author Twists and Clues cards now expose a collapsed record metadata panel: stable record ID, type, recorded approval/status classification, linked chapter source revision, record revision, modification author and timestamp, and optional current replacement event link. Existing records missing metadata are labeled Not recorded; no author, approval or source evidence is invented.

An optional replacement event selection is supported in clue proposals with a live event ID and guarded against self links, unknown records and retired targets. Source revision snapshots include any selected replacement event. Proposal approval saves the modification author and time without silently changing the recorded literary approval status or retiring original records. A missing replacement produces a source audit notice and does not modify manuscript content.

Both Arabic and English editions use the same source; no frontend reader facing spoiler content is changed. No historical names, canonical story facts, protected prose, or cover files changed. Targeted regression test asserts stable IDs, source review status, timestamp, replacement link, rejection of missing/retired/self IDs, immutable original state and visible current card data.

Remaining open: source resolution of competing records, intentional alias and spoiler protection, actual iPhone acceptance, external backup ZIP parity and restoration.
