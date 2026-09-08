# RDG Site Visit v11-photo

Photo-quality update only. Automatic cloud sync and 30-day removal are NOT implemented.

- Requests a 3840 x 2160 camera stream where supported, preserving the actual available frame dimensions after zoom.
- Saves JPEGs at quality 0.92 instead of 0.7, removing the 1600-pixel capture limit.
- These are camera-stream images, not guaranteed full-resolution sensor originals. Device/browser capabilities determine actual resolution. Existing photos cannot gain lost detail.
- Word reports use separate copies capped at 1600 pixels and JPEG quality 0.8; stored photos remain unchanged.
- Existing database and backup format remain compatible. Higher-quality photos use more device storage.
- Existing manual backup/restore remains available until verified cloud storage exists. No automatic deletion is enabled.

## Install
Back up existing projects first. Replace hosted files at the SAME site address. Use Check for update, return to Start, then reopen. Verify camera capture on the target iPhone before a site visit.

## Cloud limitation
Safari cannot retain writable access to a chosen iCloud Drive folder or reliably detect Wi-Fi versus cellular. CloudKit web containers are not ordinary iCloud Drive folders. The requested automatic iCloud Drive workflow requires a native iPhone component and Apple development setup. Manual Save to Files is possible but is not verified automatic cloud sync.
