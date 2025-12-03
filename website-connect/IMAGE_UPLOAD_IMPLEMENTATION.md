# Image Upload Implementation Guide

## Overview
This document explains all the new code added to support **Base64 image uploads** that save directly to Firebase Realtime Database. Images are embedded in booking records, so admins can attach before/after photos that everyone can see.

---

## Architecture Diagram
```
Admin selects image file
         ↓
handleMediaFileChange() - Reads file as Base64
         ↓
Input field stores Base64 string
         ↓
Admin clicks "Submit"
         ↓
handleMediaSubmit() - Validates size & saves to Firebase
         ↓
Firebase Realtime Database stores Base64 in booking
         ↓
Public pages fetch booking → Display Base64 image
```

---

## New/Modified Code

### 1. **handleMediaFileChange()** in `js/admin.js`
**Location:** Line 1486 (approximately)

**Purpose:** Reads a file selected by admin and converts it to Base64 Data URL

**What it does:**
- Validates file size (max 8 MB)
- Reads file using HTML5 FileReader API
- Converts to Base64 encoding
- Stores in hidden input field
- Shows preview image
- Logs to console for debugging

**Code:**
```javascript
function handleMediaFileChange(event, inputId, previewId) {
  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
  const file = event.target.files?.[0];
  
  if (!file) {
    console.log(`[File Select] No file selected for ${inputId}`);
    return;
  }
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    customAlert.error(`File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max 8 MB.`);
    console.warn(`[File Select] ❌ File exceeds 8 MB limit: ${file.name} (${file.size} bytes)`);
    event.target.value = ''; // Clear input
    return;
  }
  
  console.log(`[File Select] Reading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const input = document.getElementById(inputId);
    if (input) {
      input.value = dataUrl;
      console.log(`[File Select] ✅ Converted to Base64 Data URL (${(dataUrl.length / 1024).toFixed(2)} KB) for ${inputId}`);
    }
    updateMediaPreview(previewId, dataUrl);
  };
  reader.onerror = (err) => {
    console.error(`[File Select] ❌ FileReader error for ${inputId}:`, err);
    customAlert.error('Failed to read file. Please try again.');
  };
  reader.readAsDataURL(file);
}
```

**Key variables:**
- `MAX_FILE_SIZE` - Hard limit of 8 MB (8388608 bytes)
- `file` - The File object from input
- `reader` - HTML5 FileReader to convert file to Base64
- `dataUrl` - The Base64 string (format: `data:image/jpeg;base64,/9j/4AAQ...`)

**Console logs you'll see:**
```
[File Select] Reading file: photo.jpg (250 KB)
[File Select] ✅ Converted to Base64 Data URL (333 KB) for beforeImageInput
```

---

### 2. **handleMediaSubmit()** in `js/admin.js`
**Location:** Line 1433 (approximately)

**Purpose:** Saves the uploaded images (as Base64) to Firebase Realtime Database in the booking record

**What it does:**
- Validates image sizes again (safety check)
- Fetches the booking from Firebase
- Replaces `beforeImage` and `afterImage` fields with Base64 strings
- Calls `saveBookings()` to persist to Firebase
- Logs all steps to console
- Shows success/error alerts
- Refreshes the gallery feed

**Code:**
```javascript
async function handleMediaSubmit(bookingId) {
  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB in bytes
  const beforeInput = document.getElementById('beforeImageInput');
  const afterInput = document.getElementById('afterImageInput');
  
  // Validate data URLs/inputs for size
  const beforeValue = beforeInput?.value?.trim() || '';
  const afterValue = afterInput?.value?.trim() || '';
  
  // Rough check: Data URLs are ~1.33x the original size
  if (beforeValue.length > MAX_FILE_SIZE * 1.5) {
    customAlert.error('Before image is too large (max 8 MB). Please choose a smaller file.');
    console.warn('Before image exceeds 8 MB limit. Size:', beforeValue.length);
    return;
  }
  if (afterValue.length > MAX_FILE_SIZE * 1.5) {
    customAlert.error('After image is too large (max 8 MB). Please choose a smaller file.');
    console.warn('After image exceeds 8 MB limit. Size:', afterValue.length);
    return;
  }
  
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) {
    customAlert.error('Booking not found.');
    console.error('Booking not found for ID:', bookingId);
    return;
  }
  
  booking.beforeImage = beforeValue;
  booking.afterImage = afterValue;
  
  try {
    console.log(`[Media Upload] Saving booking ${bookingId} with images...`);
    console.log(`[Media Upload] Before image size: ${beforeValue.length} bytes`);
    console.log(`[Media Upload] After image size: ${afterValue.length} bytes`);
    
    await saveBookings(bookings);
    
    console.log(`[Media Upload] ✅ Successfully saved booking ${bookingId} to Firebase`);
    
    logBookingHistory({
      bookingId,
      action: 'media_updated',
      message: 'Updated grooming gallery',
      actor: 'admin'
    });
    closeModal();
    customAlert.success('✅ Gallery updated for the customer!');
    await renderCommunityReviewFeed('adminReviewFeed', 6);
  } catch (error) {
    console.error(`[Media Upload] ❌ Failed to save booking ${bookingId}:`, error);
    customAlert.error('Failed to save gallery. Check console for details.');
  }
}
```

**Key variables:**
- `beforeValue` / `afterValue` - Base64 strings from input fields
- `bookings` - Array of all bookings fetched from Firebase
- `booking` - Single booking object being updated

**Console logs you'll see:**
```
[Media Upload] Saving booking abc123 with images...
[Media Upload] Before image size: 333456 bytes
[Media Upload] After image size: 0 bytes
[Media Upload] ✅ Successfully saved booking abc123 to Firebase
```

**Error console logs:**
```
[Media Upload] ❌ Failed to save booking abc123 to Firebase: Error: Permission denied
```

---

### 3. **getPublicReviewEntries()** in `js/main.js`
**Location:** Line 1007 (modified to be async)

**Purpose:** Fetches bookings from Firebase and filters those with images for public display

**What changed:**
- **Before:** Read from localStorage only (stale data)
- **After:** Fetches fresh bookings from Firebase using `await getBookings()`

**Code (modified):**
```javascript
async function getPublicReviewEntries(limit = 8) {
  // Fetch fresh bookings from Firebase (not localStorage) to get latest uploaded images
  let bookings = [];
  try {
    if (typeof getBookings === 'function') {
      bookings = await getBookings();  // ← NOW AWAITS FIREBASE
    }
  } catch (e) {
    console.warn('Failed to fetch bookings from Firebase, falling back to localStorage:', e);
    bookings = localStorage.getItem('bookings') 
      ? JSON.parse(localStorage.getItem('bookings'))
      : [];
  }
  
  if (!Array.isArray(bookings)) {
    return [];
  }
  
  const entries = bookings
    .filter(booking => booking.beforeImage && booking.afterImage)  // ← FILTERS BOOKINGS WITH IMAGES
    .map(booking => {
      // ... rest of mapping code
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.id);
      const dateB = new Date(b.date || b.id);
      return dateB - dateA;
    });
  return entries.slice(0, limit);
}
```

**Why this is important:**
- Public pages now get **real-time** bookings with images
- Falls back to localStorage if Firebase fails
- Only returns bookings that have BOTH `beforeImage` AND `afterImage`

---

### 4. **renderCommunityReviewFeed()** in `js/main.js`
**Location:** Line 1060 (modified to be async)

**Purpose:** Displays gallery of before/after images on public pages

**What changed:**
- **Before:** Called `getPublicReviewEntries()` synchronously (didn't wait)
- **After:** Awaits the async function to get fresh data

**Code (key line):**
```javascript
async function renderCommunityReviewFeed(targetId = 'adminReviewFeed', limit = 6) {
  const container = document.getElementById(targetId);
  if (!container || typeof getPublicReviewEntries !== 'function') return;
  const entries = await getPublicReviewEntries(limit);  // ← NOW AWAITS
  
  if (!entries.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0;">No shared galleries yet.</p>';
    return;
  }
  
  container.innerHTML = entries.map(entry => `
    <article class="review-card">
      <div class="review-card-gallery" onclick="openGalleryZoom('${entry.beforeImage}', '${entry.afterImage}', '${escapeHtml(entry.petName)}');" style="cursor: pointer;">
        <img src="${entry.beforeImage}" alt="Before ${escapeHtml(entry.petName)}">
        <img src="${entry.afterImage}" alt="After ${escapeHtml(entry.petName)}">
      </div>
      <!-- rest of card HTML -->
    </article>
  `).join('');
}
```

**Key feature:**
- Displays Base64 images directly in `<img src="${entry.beforeImage}">` 
- Base64 strings work natively in HTML (no external URL needed)

---

## File Changes Summary

### `js/admin.js`
**Lines modified: ~90 lines total**
- `handleMediaFileChange()` - Complete rewrite with validation & logging (38 lines)
- `handleMediaSubmit()` - Complete rewrite with Firebase save logic & error handling (56 lines)

### `js/main.js`
**Lines modified: ~50 lines total**
- `getPublicReviewEntries()` - Made async, now fetches from Firebase (48 lines)
- `renderCommunityReviewFeed()` - Made async, now awaits `getPublicReviewEntries()` (1 line change, but crucial)

### `index.html`
**Lines added: 2**
```html
<script type="module" src="js/firebase-config.js"></script>
<script type="module" src="js/firebase-db.js"></script>
```
- Allows public pages to fetch bookings from Firebase

### `reviews.html`
**Lines added: 2**
```html
<script type="module" src="js/firebase-config.js"></script>
<script type="module" src="js/firebase-db.js"></script>
```
- Allows reviews page to fetch bookings from Firebase

### `admin-dashboard.html`
**Lines added: 1**
```html
<script src="js/custom-alert.js"></script>
```
- Needed for `customAlert` object in upload functions

### `groomer-dashboard.html`
**Lines added: 1**
```html
<script src="js/custom-alert.js"></script>
```
- Needed for `customAlert` object in upload functions

---

## How Data Flows

### Upload Flow (Admin perspective)
```
1. Admin clicks "Attach Before & After" button
   → Opens media modal
   
2. Admin selects image file
   → handleMediaFileChange() triggered
   → File read as Base64
   → Stored in input field (in memory)
   → Preview shown
   
3. Admin clicks "Submit"
   → handleMediaSubmit() triggered
   → Fetches booking from Firebase
   → Sets booking.beforeImage = Base64string
   → Sets booking.afterImage = Base64string
   → Calls saveBookings() to persist
   → Success alert shown
   → Modal closed
```

### Display Flow (Public viewer perspective)
```
1. Public opens index.html or reviews.html
   → Firebase modules loaded
   → renderCommunityReviewFeed() called
   → Awaits getPublicReviewEntries()
   
2. getPublicReviewEntries() fetches from Firebase
   → Filters bookings with images
   → Returns array of image entries
   
3. renderCommunityReviewFeed() renders HTML
   → <img src="data:image/jpeg;base64,...">
   → Browser displays Base64 image natively
```

---

## Console Debugging Logs

When admin uploads an image, watch the console for:

```
✅ FILE SELECTION PHASE:
[File Select] Reading file: photo.jpg (250 KB)
[File Select] ✅ Converted to Base64 Data URL (333 KB) for beforeImageInput

✅ UPLOAD PHASE:
[Media Upload] Saving booking abc123 with images...
[Media Upload] Before image size: 333456 bytes
[Media Upload] After image size: 0 bytes
[Media Upload] ✅ Successfully saved booking abc123 to Firebase

❌ ERROR EXAMPLES:
[File Select] ❌ File exceeds 8 MB limit: bigimage.jpg (9000000 bytes)
[Media Upload] ❌ Failed to save booking abc123 to Firebase: Error: Permission denied
```

---

## Testing Checklist

- [ ] Admin uploads before image → See `[File Select] ✅ Converted to Base64`
- [ ] Admin uploads after image → Same log
- [ ] Admin clicks Submit → See `[Media Upload] ✅ Successfully saved`
- [ ] Firebase Console shows `beforeImage` and `afterImage` fields with `data:image/jpeg;base64,...`
- [ ] Public pages load images (index.html, reviews.html)
- [ ] Try uploading >8 MB file → See error alert
- [ ] Try uploading without submit → Image stored in memory only, not in Firebase

---

## Technical Notes

### Base64 Encoding
- Binary file → Text string (safe for JSON/DB)
- Size increases ~33% compared to original
- Example: 250 KB JPG → 333 KB Base64 string

### Firebase Realtime Database Storage
- Base64 strings stored as text in booking record
- **Pros:** No external service, travels with booking
- **Cons:** Bloats database size, slower for many images
- **Limit:** Realtime DB has 16 MB per write, so images must be <8 MB

### Browser Support
- Base64 Data URLs work in all modern browsers
- `FileReader` API supported in IE 10+
- `<img src="data:image/...">` works natively

---

## Future Improvements (Optional)

If you want to optimize later:

1. **Image Compression** - Compress before Base64 (client-side)
2. **Firebase Storage** - Upload to Storage instead, save URL to DB
3. **Cloudinary Integration** - Upload to Cloudinary, save URL to DB
4. **Thumbnail Generation** - Create smaller preview images

---

## Questions?

- **Why Base64?** Free, no external service, images embedded in bookings
- **Why 8 MB limit?** Firebase Realtime DB write limit is 16 MB per request
- **Why console logs?** So you can debug uploads and see what's happening
- **Why Firebase modules in public pages?** Public pages need to read bookings with images

---

## Summary of New Functions

| Function | File | Purpose |
|---|---|---|
| `handleMediaFileChange()` | `admin.js` | Reads file, converts to Base64, validates size |
| `handleMediaSubmit()` | `admin.js` | Saves Base64 images to Firebase booking record |
| `getPublicReviewEntries()` | `main.js` | Fetches bookings from Firebase (now async) |
| `renderCommunityReviewFeed()` | `main.js` | Renders images on public pages (now async) |

