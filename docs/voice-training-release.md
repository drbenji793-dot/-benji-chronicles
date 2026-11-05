# Chapter notes and voice training

Released implementation: Reader 248. HQ package v006, rule VOICE01.

Both chapter readers use one notes component. The book Notes view reads the same rows. Notes support multiple types, quotation/source revision, author attribution, optimistic edit checks, replies, resolution and an optional applied chapter revision. Existing notes are preserved. Neither note operations nor voice training write manuscript text.

The selected writer defaults to Default only when no valid saved choice exists. Default is brown. Existing author attribution remains intact. Benji approval gates remain unchanged.

Voice training stores sessions, audio, exact transcripts, separate reading copies and example comparisons in IndexedDB on the current origin/device. JSON export/import includes audio. No cloud upload or automatic transcription endpoint is connected. Imported duplicate IDs preserve existing records. Voice notes enter the workspace as unapproved candidates. Local approved editions retain an evidence snapshot and predecessor. Publishing an edition to HQ remains a separate explicit action; no approved new style edition has been invented.

Database upgrades applied: chapter_notes_voice_training and chapter_notes_insert_metadata. Existing shared note access was preserved. Chapter note revisions and previous values enter the private recovery history. Default was added to existing writer allowlists without changing approval guards. Anonymous-role insert, update and resolve operations were verified in rollback-only transactions for both note tables. Security advisors report no new warning; private recovery tables deliberately have no public policy.

Validation: full release checks, both language builds, focused chapter note tests, voice session/edition tests and audio backup import with codec MIME. Physical iPhone microphone and download acceptance remains a user-device check.
