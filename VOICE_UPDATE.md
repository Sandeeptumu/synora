Synora voice recording update

Applied to the running project in Documents/synora.

Record a new note in Check-in, stop recording, preview it, and submit on the Review step. Saved audio is stored in PostgreSQL voice_recordings, attached to the check-in. The assigned counselor can open the case and select Voice notes, then Load voice note and Play. Owners and assigned counselors are the only roles allowed to retrieve recordings; active voice consent is required. Revoking consent blocks future requests but cannot recall audio already loaded. Recordings remain in the database until explicitly deleted under your retention process. Database backups should include this table.

Safari MP4 and Chromium WebM MIME types are preserved. Uploads are limited to 10 MB. Filenames alone from older check-ins cannot restore audio that was never saved. Re-record old failed previews.

Added directional question transitions, selected-choice feedback, and case-tab transitions. Existing global motion controls and reduced-motion support remain.

Validation: frontend production build; backend test suite including voice upload byte preservation, owner/counselor authorization, unassigned counselor and officer denial, revoked consent, cross-case recording IDs, invalid types and oversized uploads. Database table confirmed on the running PostgreSQL instance. Real microphone capture and listening in Safari still need a user check.

Firebase frontend environment and backend credentials have not been included in this backup. Keep your existing frontend/.env.local and backend environment when restoring. The running auth-provider endpoint returned firebase=true.
