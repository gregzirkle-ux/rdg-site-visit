# RDG Site Visit v18

A card-based field workflow for Redline staff. This is a static app for the existing GitHub/Vercel deployment; no new account or hosting service is required.

## Update

1. On your phone, open the current app and use Settings & Recovery, Save All App Data, to keep a copy first.
2. Extract this ZIP and upload the **contents** of the `rdg-site-visit` folder to the root of the existing GitHub repository, replacing the files with the same names. Include the new `tests/v18-checks.cjs`. Do not nest the folder.
3. Let Vercel redeploy at the same address.
4. On Start, tap Check for app update, install, and reopen. The bottom line reads **Build v18**.

The database, projects, visit numbers and photos are unchanged by this update.

## v18 at a glance

**Start.** One red button always shows the next step: Start SVR-00X, or Continue SVR-00X with its photo count. The project is a title block; tap it to switch projects. New project and Project details sit under it. Past reports, Backup and restore, Your information, Phone storage and Check for app update are plain rows below.

**Backup and restore.** Replaces Settings & Recovery, Restore Project and Advanced Device Backup. Create backup file builds one file with every project, visit and photo; Save backup file opens the share menu so the user picks the destination (OneDrive suggested, iCloud Drive and Google Drive also fine). Android Chrome cannot share this file type, so it downloads with instructions. The screen explains why and when to back up, shows the last backup date, and Start shows the row in red when there is work and no backup in 14 days. Restore accepts a full backup or the Recovery file from a visit package. Projects not on the phone are added. For a project already on the phone the user picks Keep the copy on this phone or Use the copy in the file. Nothing is wiped. The app also asks the browser to keep its storage persistent.

**Wrap up.** Finish Visit leads to Review and Send, three numbered steps: 1 Save the original photos (full quality, for the archive), 2 Check the report (photos, visit information, open items, general notes, layout), 3 Issue and send. Step 1 shows a check once every photo is handed off.

**Send Report.** Shows the file name and size with a plain verdict: small enough to email, or too large. A draft shows a Mark issued box first. Email Report opens the share menu. Send as a link walks through three steps: save the report to OneDrive, iCloud Drive or Google Drive, copy a share link (instructions for each service), paste it, and Open email with the link writes the subject and message. When the report is too large, Send as a link becomes the main button. Save Visit Package is the project folder ZIP.

**Report size.** The Word report aims for 14.2 MB, so it stays under about 20 MB once emailed (attachments grow by about a third in email). Photos are only resized when needed: 1800 px for most visits, stepping to 1600, 1400, 1200 or 1000 px for large ones. Even 1000 px prints at over 300 dpi in the standard layout, so PDFs stay sharp when zoomed. About 100 photos fit in an email. Originals are never changed; full quality photos go out through Save Photos and the ZIP. Change `EMAIL_LIMIT` in `report.js` if the office limit changes.

**Report.** Page one keeps the masthead and red rule; visit information is now a two column title block so the summary, items, limitations and distribution fit on page one. Photo pages have a running header (project, number, SVR and date), red observation numbers, the type in small capitals, hairlines between rows instead of boxes, and a red bar on location headings, repeated as Continued when a location runs onto the next page. Word editing: the report uses real styles (Heading 1, Heading 2, RDG Body, RDG Comment, RDG Meta, RDG Fine Print), so the look can be changed once in Word's Styles pane and the Navigation Pane lists every location. Tables have fixed widths so typing never shifts photos. A blank comment is an empty RDG Comment paragraph: click and type. The font is set in one place (`FONT` in `report.js`); it is Calibri so it opens the same everywhere, and can be switched to DIN.

**Everywhere.** Plain language, one helper line per screen, grouped rows with icons, larger tap targets, a progress bar while the report builds, and a choice sheet instead of ambiguous OK or Cancel dialogs for restore.

## Visit workflow

1. Enter Your Information once: name, company, phone, email. The profile is local to this device. Each new visit copies it; changing the profile does not change past reports.
2. Select a project or choose New Project. Edit Project Details saves name, number, address, client/owner and client contact details for future visits; existing visits keep their recorded fields.
3. Start New Visit. Report number and date are automatic. Visit Information is available here and at the end.
4. New Visit offers Visit Information, Open Items, and Continue to Photos. Saving Visit Information returns to New Visit when opened there. Open Items Back returns to New Visit; Continue to Photos starts the camera. Review carried-forward items or continue to photos. Untouched items remain not reviewed.
5. Take photos. Each photo is saved before the optional comment prompt. Use Save & Next, Skip Comment, or Retake. The location chip on the camera stamps each photo; the comment screen shows the photo's location and can change it. More Details contains type, sheet/room, responsibility, and due date.
6. Finish Visit ends the walk and offers Additional Notes. It does not lock editing.
7. Review & Share collects visit information, photos/comments, open items, additional notes, sharing/saving, and issuance. Take More Photos remains available on working reports.

Blank photo comments remain writing space in Word. Empty general notes print “No additional comments entered.” Safety items stay first and bold red; normal app controls are neutral.

## Share and save

Share and Save prepares the current Word report. Share Report opens the device share menu to choose an email app. Sending occurs there. Return and choose Save Visit Package. Download Report is the fallback when native sharing is unavailable.

The complete ZIP contains:

| Folder | Contents |
|---|---|
| SVR-002-R1/Report/ | Word report |
| SVR-002-R1/Photos/ | Individual photos in the report |
| SVR-002-R1/Photo-Index/ | CSV with photo identifiers and comments |
| SVR-002-R1/Recovery/ | Selected-project recovery snapshot |

Filenames include the project, visit, revision, and date, such as `T01_SVR-002-R1_2026-09-13.docx` and `T01_SVR-002-R1_2026-09-13.zip`. Working reports/packages include `_DRAFT`.

Save to Files or download and choose a preferred destination. The browser does not silently pick an email app, send email, verify delivery, or upload to a cloud account. “I Checked My Saved Files” records the user's confirmation of an issued package only. Sharing, saving, and marking issued are independent actions.

## Issuance and revisions

Mark Issued preserves an exact Word copy plus structured visit/photo metadata, completes the visit, and enables the next visit number.

Open a past visit from Start and choose Edit Visit. Working edits are saved and can be resumed after reopening. Each project permits one working visit/edit session at a time.

At Finalize Edits:

- Save Edits retains the report/revision number for minor corrections. The earlier issued copy stays in Report History, distinguished by timestamp.
- Create Revision increments R1, R2, etc. A reason is required. Revision number, reason, and issue date appear inside the report; filenames include the revision suffix.
- Photo additions/removals, tracked item additions/removals, status/type/responsibility/due-date changes, and project/date changes require revisions. Users must also choose revision for changes in meaning or conclusions, even if only a few words changed.
- Discard Working Edits restores the last issued visit and photo comments.

Revisions do not consume new visit numbers or rewrite later visits. If an older correction affects newer open items, review those items in the newer visit separately.

Report History downloads exact saved Word copies even after local original photos are removed. Pre-v15.2 completed visits acquire a preserved baseline on first edit, provided their photos are present. Earlier exports were not stored as immutable copies, so original exported files cannot be recreated retroactively if their source data is gone.

## Editing in Word

Word edits do not return to the app. Replace the draft report in the extracted visit folder with the finished Word document, then save that folder to the server/cloud. If keeping a ZIP as the final archive, repackage the folder after replacing its report. Regeneration from the app uses app data and will not contain external Word edits. Recovery and Report History preserve only the app-authored version.

Existing substantive report limitations wording is retained, with its editorial placeholder removed. Distribution is editable in Visit Information. Firm-standard wording remains an administrative review item; this update does not establish new contract language.

## Storage and recovery

Backup and restore is on Start. See v18 at a glance above.

Completed visits become eligible for local photo cleanup after 30 days (Phone storage). Nothing is removed automatically. Working edits are excluded. Photos supporting open items in the latest visit are protected. Exact issued Word copies and metadata remain.

The Recovery JSON inside each visit package holds that project's records, available photos and issued history. Restore it from Backup and restore, Restore from a backup file.

## Verification

Run with Node.js 22 or newer:

```text
node tests/storage-checks.cjs
node tests/archive-checks.cjs
node tests/workflow-checks.cjs
node tests/integration-checks.cjs
node tests/report-checks.cjs
node tests/layout-checks.cjs
node tests/location-checks.cjs
node tests/v17-flow-checks.cjs
node tests/v18-checks.cjs
```

Local checks cover recovery compatibility, immutable snapshots, corrections, R1/R2 sequencing, discarded edits, later-visit independence, restored snapshot references, archived Word re-export, direct share/cancel behavior, and the assembled photo-to-issue event flow using a simulated camera/database. Actual DOCX and ZIP files were generated and independently checked for content and integrity.

Browser preview access was blocked by automatic approval review. Visual layout and physical-device camera, offline behavior, native email, and Files/cloud handoff have not been visually/device-tested. Before field use, check one small visit on your normal iPhone/email setup, including sharing and saving the ZIP.

## v15.2 navigation update

Existing SVRs opens a project-specific card list of draft and issued reports before opening a selected report. Project address and client are copied into new visits and included in Word reports when entered. Existing visit snapshots are unchanged.

## v15.2 report and field update

Your Information now includes separate office and direct/mobile phones. Company defaults to Redline Design Group and office phone to 704-377-2990, including previously saved blank profiles. Enter your name, direct/mobile phone, and email once. New visits copy the profile. Missing contact fields in working visits are filled when opening Visit Information, reviewing, or generating a report; issued snapshots remain unchanged.

General Notes and Observations replaces Additional Notes and is available before and after the walk. Existing notes are retained. Mark Issued / Finalize Edits is on Share and Save and refreshes the prepared file to the issued version immediately. Separate Word/ZIP downloads remain under Other save options for failed or unavailable native sharing. Save Visit Package is still the complete archive.

Camera and report layout behavior changed in v16; see below. Project/contact information and general notes come first, then safety-first photo observations.

Status buttons update their own open-item card without rebuilding the list, preserving scroll and focus. Automated checks cover blank profile defaults, office phone flow, portrait camera crop ratio, issued-file refresh, and retained item cards. A six-image report with blank comments, longer comments, and a legacy portrait image was generated and all rendered pages visually inspected. Physical camera framing, phone layout and sharing still require an iPhone test.

## v16 camera, photo selection and report layouts

**Camera.** The live view fills the screen and shows the whole frame. The saved photo matches the preview with no crop; only digital zoom narrows it. The comment screen still opens after each photo.

**Rotation.** The app follows the phone's orientation. In landscape the camera controls sit on the left and the shutter on the right, and photos save in landscape. If the app does not rotate after updating, turn off Portrait Orientation Lock in Control Center. iOS may keep the old setting until the home screen icon is reinstalled. Removing a home screen web app deletes its data, so choose Save All App Data first and restore afterward.

**Photo selection.** In Photos & Comments, each thumbnail has a check. Tap it to leave that photo out of the Word report; Include all brings every photo back. The photo screen also has an Include in report checkbox. All photos are included by default. Report numbering counts only included photos. The ZIP keeps every photo: report photos are named Obs, the others Extra, and the Photo Index CSV has an In report column. Changing which photos are in an issued report requires a revision.

**Report layout.** Review & Share has a Report Layout tile. The choice is saved on the visit and becomes the default for new visits on this device.

| Layout | Arrangement |
|---|---|
| Photo left, comment right | Three photos per page in matching rows. Photos fit within 3.3 by 2.5 inches. |
| Large photos, fitted to shape | Landscape photos fit within 4.55 by 3.42 inches with the comment beside them. Two portrait photos taken back to back pair side by side with comments below. Pages hold two or three photos. |

Photos are scaled to fit and never cropped. Safety photos still come first. Page one now holds the visit information, safety summary, general notes, item status, limitations and distribution; every photo page starts on a new page with its own heading. Very long comments can still push a row to the next page.

**Start.** New Project is a red button.

**Checks.** All earlier checks pass. New checks cover both layouts, landscape, portrait and wide photos, photos left out of the report, the report layout choice, the include toggle and Include all, and the revision rule. Both layouts were rendered with mixed photo shapes and inspected. Screens were checked in portrait and landscape with a simulated camera. Real iPhone rotation, camera resolution and sharing still need a device test.

## v17 location, photo order and Save photos

**Location chip.** The camera's Set area button is now a location chip. It shows the current location, such as Room 204, or Set location. Tap it for a spinning wheel of the project's saved locations, with General (no location) at the top and a field to add a new one. Spin to a location and tap **Use this location**; that sets it and returns to the camera. Typing a new name and tapping Add sets it straight away. **Remove** takes the centred location off the list after a confirmation; photos keep their location. Taking photos adds no taps: the comment screen still opens after each photo.

The current location stays on every new photo until changed. It is saved on the visit, so it survives Pause, Resume and closing the app. A new visit starts on Set location; the saved list stays with the project and is included in project recovery files.

**Wheel order (v17.1).** Locations with a number come first, sorted by that number (Level 2, Stair 3, Room 9, Room 101); locations without a number follow alphabetically (Exterior North, Lobby, Roof). Locations with the same number sort by name. The same wheel is used from the camera chip, the comment screen and the gallery.

**Fixing one photo.** The comment screen has a Location row, and each thumbnail in Photos & Comments has its location underneath. Tapping either changes that photo only. The current location on the camera does not change.

**Report order.** Report photos are grouped by location in the order each location was first visited, oldest to newest within a group. Photos with no location are listed first under General. Each location has a heading; if no photo has a location there are no headings and the report looks like v16. Observation numbers run 001, 002, … in printed order. Safety photos stay in their location, bold red, and the safety summary on page one lists their numbers. Under a heading only the sheet/room repeats with each photo. Photos & Comments shows the same groups and numbers.

Visits issued before v17 keep their original order (safety first, numbered by time), including later edits and revisions, so their ZIP and photo index still match the issued Word copy. Drafts and new visits use location order.

**ZIP and photo index.** Both follow the report order. Filenames include the location, such as `T01_SVR-004_2026-10-22_Obs-003_Room-204.jpg` or `..._Extra-01_General.jpg`. The CSV has a Location column. A location typed in different capitals is grouped together and uses the first spelling.

**Save Photos.** The first, dark tile on Review & Share sends every photo in the visit (report and extra, original quality) to the share sheet. Choose Save Images for the photo album, or OneDrive, Google Drive, iCloud Drive, Dropbox and so on. Large visits go in batches: up to 20 at a time on iPhone, 10 on Android (Chrome's limit is 10 files and about 50 MB per share). Tap Save Next Batch to continue; the tile shows the count. The app records which photos were handed off. Photos added later show as Save N New Photos. Where file sharing is not available, the photos download one at a time.

Leaving Review & Share (Back, Back to Start, or Back to Start after sharing) with unsaved photos shows "Photos not saved yet. Save now?" with Save and Skip. It does not appear during the walk, on Pause, or when only viewing an older issued report.

**Share and Save, Android.** Chrome on Android cannot share Word or ZIP files, only images, PDF, text and media. There the tile reads Download Report: the Word file saves to Downloads, and Open Email starts a message with the subject filled in; attach the report from Downloads. The ZIP tile reads Download ZIP; upload it from your cloud app. On iPhone, Share Report and Share or Save ZIP still open the share sheet; the ZIP can go to a cloud app instead of email.

**Data.** Photo records are written once and never rewritten. Location and the left-out/removed flag are stored in the meta store. Older visits are migrated on first open: area becomes location, the v16 sticky area list becomes the project's saved locations, and a walk in progress keeps its area as the current location. v16 previously rewrote photo records to mark a deleted or discarded photo; that flag now lives in meta and old flags are still read.

**Android.** See `ANDROID_TEST.md`. Pinching on the camera now zooms the camera instead of the page. No iPhone-only code paths were found; sharing, camera and storage use feature detection.

**Not in this build.** Direct SharePoint upload. `photoExportSet` in `cloud.js` produces the ordered, named file list used by the ZIP and Save Photos, so an upload target can reuse it.

**Checks.** All earlier checks pass. New: `location-checks` (grouping, numbering, legacy order, filenames, real Word headings in both layouts, 40 photos with no words) and `v17-flow-checks` (migration, chip and picker, sticky location, per-photo changes, Save Photos batches, reminder, Android Word/ZIP fallback, new visit). In Chromium on an emulated Android phone, a visit was started in v16, upgraded to v17 with real IndexedDB, and taken through the location, Save Photos and report download flow; photo records were unchanged. Real iPhone and Android share sheets, camera and install still need a device test.
