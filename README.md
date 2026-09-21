# RDG Site Visit v16

A card-based field workflow for Redline staff. This is a static app for the existing GitHub/Vercel deployment; no new account or hosting service is required.

## Update

1. Save a backup of current work from the existing app.
2. Extract this ZIP and upload the **contents** of `rdg-site-visit` to the root of the existing GitHub repository. Include the new `workflow.js` and `workflow.css` and all updated files. Do not nest the folder in the repository.
3. Let Vercel redeploy at the same website address.
4. In Settings & Recovery, choose Check for App Update, install, return to Start, and reopen. Confirm **Build v16**.

The app keeps the same IndexedDB database, projects, visit IDs, and numbering. Do not clear website data to update. The same link does not synchronize data between people, devices, or browsers.

## Visit workflow

1. Enter Your Information once: name, company, phone, email. The profile is local to this device. Each new visit copies it; changing the profile does not change past reports.
2. Select a project or choose New Project. Edit Project Details saves name, number, address, client/owner and client contact details for future visits; existing visits keep their recorded fields.
3. Start New Visit. Report number and date are automatic. Visit Information is available here and at the end.
4. New Visit offers Visit Information, Open Items, and Continue to Photos. Saving Visit Information returns to New Visit when opened there. Open Items Back returns to New Visit; Continue to Photos starts the camera. Review carried-forward items or continue to photos. Untouched items remain not reviewed.
5. Take photos. Each photo is saved before the optional comment prompt. Use Save & Next, Skip Comment, or Retake. More Details contains type, area, room/sheet, responsibility, and due date.
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

Settings & Recovery contains project restoration, phone storage review, updates, and Advanced Device Backup. Routine storage prompts appear only when cleanup is available.

Completed visits become eligible for local photo cleanup after 30 days. Nothing is removed automatically. Working edits are excluded. Photos supporting open items in the latest visit are protected. Exact issued Word copies and metadata remain.

Recovery JSON contains the selected project's current records, available photos, and issued history, including photos retained for earlier issued versions. It is not limited to the selected visit. Issued Word copies increase recovery size over time. Keep older ZIPs/recovery files when original photos have been removed; newer snapshots cannot recreate those original bytes.

Extract a ZIP and choose the JSON in its Recovery folder to restore. Restoration replaces the matching project's snapshot after confirmation, including any newer work, and keeps other projects. It does not merge. A saved working edit session can also be restored.

Full-device backup/restore covers project records and report history. Device profile/settings remain local to each device. If current report photos are archived, use Report History for an issued Word copy or restore original recovery data before editing/rebuilding a complete package.

## Verification

Run with Node.js 22 or newer:

```text
node tests/storage-checks.cjs
node tests/archive-checks.cjs
node tests/workflow-checks.cjs
node tests/integration-checks.cjs
node tests/report-checks.cjs
node tests/layout-checks.cjs
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
