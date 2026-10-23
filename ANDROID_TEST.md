# Android test checklist (Build v17.1)

Use an Android phone with Chrome up to date. Allow about 30 minutes. Note the phone model and Android version. For each step, write OK or describe what happened, and take a screenshot of anything unexpected.

## 1. Install

1. Open the Site Visit link in Chrome.
2. Chrome menu (⋮) → **Add to Home screen** or **Install app** → Install.
3. Open the app from the home screen icon. It should open full screen with no address bar.
4. On Start, the bottom line should read **Build v17.1**.

## 2. Setup

5. Enter Your Information (name, phone, email) and save.
6. Tap **New Project**, enter a name and number, and save.
7. Tap **Start New Visit**, then **Continue to Photos**.
8. Allow camera access when asked. The rear camera should fill the screen.

## 3. Camera and location

9. The top bar shows **Set location**. Tap it. A panel opens with a box to add a location and a wheel showing **General (no location)**.
10. Type `Room 101` and tap **Add**. The panel closes and the chip reads **Room 101**.
11. Take a photo. The comment screen opens. Its Location row reads Room 101. Tap **Skip Comment**.
12. Take two more photos and skip both. The chip still reads Room 101.
13. Tap the chip and add `Exterior North`, then add `Room 9` and `Lobby` the same way. Open the chip again: the wheel should read General, Room 9, Room 101, Exterior North, Lobby. Flick the wheel; it should spin smoothly and stop with one name in the middle band. Spin to **Exterior North** and tap **Use this location**. Take two photos.
14. On the second Exterior North photo's comment screen, tap the Location button, spin to **Room 101** and tap **Use this location**. Check that the button now reads Room 101. Skip. The camera chip must still read **Exterior North**.
15. Pinch on the camera picture. The camera should zoom in; the page itself must not zoom. Tap 1x to reset.
16. Turn the phone sideways (auto-rotate on). The controls move to the sides and photos still save. Take one photo in landscape, then turn back.
17. Tap **Pause**, close the app fully (swipe it away from recent apps), reopen it, tap **Resume Visit** → Continue to Photos. The chip must still read **Exterior North**.

## 4. Photos & Comments

18. Tap the thumbnail (bottom left). Photos are grouped under **Room 101** and **Exterior North** headings with numbers 001, 002, …
19. Under one photo, tap its location label, spin to **General (no location)** and tap **Use this location**. A **General** group appears at the top.
20. Tap Back.

## 5. Finish and Save Photos

21. Tap **Finish Visit**, then **Skip for Now** on the notes screen.
22. On Review & Share, the first dark tile reads **Save Photos** with the photo count. Tap it.
23. Expected: the Android share sheet opens with the photos (up to 10 at a time). Choose Google Photos, Drive or OneDrive, and confirm the photos arrive there with names like `..._Obs-001_General.jpg`.
24. If there are more than 10 photos, the tile reads **Save Next Batch** and shows a count. Tap it until it reads **Photos Saved**.
25. Write down which apps were offered in the share sheet, and whether there is any option to save straight to the gallery.

## 6. Word report and email

26. Tap **Share and Save**. Wait for the report to be prepared.
27. Expected on Android: the tile reads **Download Report** and an **Open Email** tile is shown. Tap Download Report. A download notice appears and the note says the report is in Downloads.
28. Tap **Open Email**. Your email app opens a new message with the subject filled in. Attach the `.docx` from Downloads with the paperclip, and send it to yourself.
29. Open the received report in Word or Google Docs. Check that it has General / Room 101 / Exterior North headings and that the observation numbers run in order.

## 7. ZIP

30. Tap **Save Visit Package**. The tile should read **Download ZIP**. Tap it and confirm the ZIP is in Downloads.
31. Open it with Files by Google (or upload it to Drive) and check the Photos folder and the Photo-Index CSV (it should have a Location column).

## 8. Reminder

32. Tap **Take More Photos** (or Resume), take one photo, then Finish Visit → Skip for Now.
33. On Review & Share, tap **Back**. Expected: **Photos not saved yet. Save now?** with Save and Skip. Tap **Save**, and the share sheet opens with the one new photo. After it is shared, the app goes to Start.

## 9. Back gesture

34. During a walk, use the Android back gesture or back button once. Write down what happens. Expected: the app closes or goes to the previous page; nothing is lost. Reopen the app and choose Resume Visit to confirm.

## 10. Report back

Send the notes, screenshots, phone model, Android version and Chrome version.

## Not verified before release

These could only be checked in desktop Chromium with an emulated Android screen and a fake camera, not on a real phone:

- The real Android share sheet: which apps appear for photos, and the 10-file / 50 MB batch limit in practice.
- Whether any gallery app offers "save to gallery" from the share sheet. On Android this is usually Google Photos (upload) or Files; there is no Save Images button like iPhone's.
- The download notice and Downloads location for the Word report and ZIP in an installed app.
- **Open Email** opening the default email app from the installed app.
- How the location wheel feels to flick on a real touchscreen (it was spun with a mouse wheel in testing).
- Real camera resolution, autofocus, native zoom and rotation on Android hardware.
- Install prompt wording, which varies by Chrome version and phone maker.
- The Android back gesture: the app keeps no back history, so back leaves the app. Work is saved, but this has not been tried on a device.
- Samsung Internet and Firefox. Only Chrome is supported for this test.
