# RDG Site Visit v12

## Install
1. Save a backup of current work before updating.
2. Replace the files in your existing GitHub repository and let Vercel redeploy. Keep the SAME website address. Include the new cloud.js file.
3. In the app, use Check for update. Return to Start and reopen the app. Confirm Build v12.

## Save a visit to iCloud Drive
1. Complete the visit. Open it from Past visits and tap Save to Cloud.
2. When you are on Wi-Fi, save the report, photo batches, photo index and project recovery file.
3. On iPhone, select Save to Files, then iCloud Drive. Create or choose a project / visit folder and use that folder for each group.
4. Check the files in Files and let iCloud finish uploading. The optional confirmation button records YOUR check; it is not automatic verification.
5. Download the folder contents from iCloud to your server when convenient.

Photos are separate JPEGs (or their original saved image format), not a ZIP. Filenames match the report observation numbers. A CSV photo index preserves notes, time, location and tags. If batch sharing is unavailable, use the individual Save buttons. Download is a fallback: move downloaded files to iCloud Drive yourself.

The project recovery file (.json) includes the selected project's visit history, photo annotations and all photos still stored for that project. It is separate from the Word report and individual images. Keep dated recovery files; later copies cannot recreate photos you already removed from the phone.

Saving an unfinished visit is a draft export. Complete it and save again for final records. The app does not detect Wi-Fi or start uploads automatically. Your phone manages the actual cloud upload after Save to Files.

## Clean up phone storage
- A notice appears when a completed visit is at least 30 days past completion and has removable photos. Older visits without a completion timestamp use the visit date.
- Choose Review phone storage, then Save / review files first or Remove local photos.
- Removal requires an explicit confirmation that the report, photos and recovery file are safely saved in your cloud or server. Nothing is deleted automatically.
- Project details, visit numbering, notes and item history stay on the device. Photos supporting currently open items stay too. Retained photos can be removed later once the items are closed.
- After removal, old observations show a clear placeholder. Use the cloud report or restore a recovery file containing those photos to rebuild the old report.

## Restore a project
From Start, choose Open project recovery file and select its JSON file in Files. If the project already exists, confirmation explains that this replaces its current visits, including newer work. Save current work first. Other projects are preserved. This restores a snapshot; it does not merge newer work.

More storage options retains Save all app data and Restore backup for full-device recovery. Restore backup replaces ALL app projects. v9/v10/v11 version-1 backups remain supported. v12 files with removed-photo records require v12 or newer.

## Photo quality
Requests a 3840 x 2160 camera stream where supported, removes the old 1600-pixel capture cap and saves JPEGs at quality 0.92. Actual resolution depends on the device and browser. These are camera-stream captures, not guaranteed full sensor originals. Existing photos cannot gain lost detail. Word reports use smaller copies without changing stored photos.

## Verification
JavaScript syntax and local data checks passed, covering project recovery, exact saved photo bytes, ID remapping, preservation of other projects, cancelled restore/share, corrupt recovery rejection, legacy backups, 30-day cleanup boundaries and protection of open-item evidence. Tests use a simulated database transaction layer, not a physical iPhone.

Browser preview access was denied in this session. The iPhone camera, native share sheet and iCloud handoff need a device check before field use. Try one test visit, save all groups, check the cloud files and open the project recovery file on another device before removing important local photos.

For repeatable local checks with Node.js 22 or newer: node tests/storage-checks.cjs
