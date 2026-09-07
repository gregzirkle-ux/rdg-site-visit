# RDG Site Visit v9

## Upload to GitHub and Vercel

1. Extract this ZIP on your computer.
2. Open your existing GitHub repository.
3. Choose Add file, then Upload files.
4. Drag the extracted files into the repository root, where index.html already lives. Upload the files themselves, not the ZIP or its surrounding folder.
5. Commit the changes. Your existing Vercel connection will redeploy them.
6. Close and reopen the app at its existing address. Confirm that the Start screen shows Build v9.

Keep the same Vercel address and browser. Do not clear website data or remove the installed app to troubleshoot an update; your existing visits live on that device. If the old build persists, close other app windows and reload the existing address in Safari. Once v9 is loaded, use Check for update for future updates.

## What changed

1. Projects have their own visit sequences and complete report history.
2. Existing report numbers and photo records are preserved during the upgrade. Future numbers continue from the highest existing number for that project.
3. Issues and actions carry into the next visit with permanent item references.
4. Review each carried item as Still open or Closed. Untouched items remain open and print as not reviewed this visit.
5. Closed items appear in the visit documenting closure, then leave the next visit's list.
6. Add items without a photo. Link new photos to existing items from the photo detail screen.
7. Owner, actual due dates, area, and a visit update are available for each item.
8. Exporting does not complete a visit. Choose Complete this visit when finished. Completed visits are read only and can be exported again.
9. Back up all projects downloads one JSON file with projects, visits, item history, notes, and photos. Restore backup replaces the app's current data after validation and confirmation.
10. Photo saves wait for database completion. Notes stay separate from photo blobs. Visit loading uses a photo index, and older visits are no longer limited to eight.

## Simple workflow

Select or add a project. Start a visit. Review carried items now or continue to the camera. Take photos as usual. Tag a photo Issue or Action to track it. At Finish, review items and build the Word report. Save or share it, then complete the visit.

Each project can have one unfinished visit. Different projects can remain unfinished independently. Complete a project's current visit before starting its next one.

For example, item 003.02 is the second item first entered during visit 003. Its reference stays the same in later reports.

## Existing v8 visits

The upgrade groups visits by project number, or by project name when no number exists. Existing Issue and Action photos become tracked items. Older exported reports retain their original item lists when regenerated; later visits carry the outstanding history forward. If more than one old visit for a project was unfinished, only its latest unfinished visit remains active. All earlier visits remain in history.

Photo tags in separate old visits become separate items because v8 did not record links between them. Close any historical duplicates during the first review. Edit project updates its directory details for future visits; previous report details remain as recorded.

## Important usage notes

Word edits do not return to the app. Make item status changes in the app before exporting.

Data remains on the current device and browser. This version does not add cloud sync or team sharing. Save a backup after upgrading and regularly afterward. Restore currently accepts backups created by v9.

The report's limitations and distribution wording still contains the original placeholders. Replace those with approved RDG wording before issuing a report.

## Validation

Local tests passed for legacy note clearing, due date calculation, v8 migration, unchanged photo records, repeated migration, independent project numbering, carried item references, closed item removal, historical status preservation, backup decoding, and rejection of broken backup references. Word generation passed with a carried closed item and no photos. Application scripts pass syntax checks.

Browser preview access was blocked in this session. This build still needs an iPhone check for camera capture, photo editing and export, touch layout, offline use, and backup restore. Start with a short test visit before using it for a full site walk.
