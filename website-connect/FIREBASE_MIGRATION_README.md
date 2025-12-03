Firebase Migration Guide
=========================

Goal
----
Move the current web app (BestBuddies pet grooming) to a *new* Firebase project and ensure the featured gallery, Base64 image uploads, and public pages work the same. This guide explains what needs to change in your codebase, what Firebase services to enable, example security rules, CLI commands to import initial data, and verification steps.

Summary — Minimal code changes
--------------------------------
- In most cases you only need to update `js/firebase-config.js` with your new project's config (apiKey, authDomain, databaseURL, projectId, appId, etc.).
- Verify `js/firebase-db.js` does not contain any hard-coded database URLs. If it does, update them to point to the new `databaseURL` from the console.
- Ensure your HTML files still include `js/firebase-config.js` and `js/firebase-db.js` before other scripts that use Firebase.
- Optionally check `firebase-init-data.js` and `firebase-initial-data.json` if you plan to import seeded data.

Files to edit (typical)
-----------------------
- `js/firebase-config.js`  ← required
- `js/firebase-db.js`      ← check for hard-coded DB URL (usually not needed)
- `firebase-init-data.js` / `firebase-initial-data.json` ← optional (seed data import)
- `FIREBASE_SETUP_INSTRUCTIONS.md` or other project docs ← update references if you keep them

Minimal change example (what to replace)
----------------------------------------
You will replace the object in `js/firebase-config.js` with the one from the Firebase console for the new project. Typical content to update:

```javascript
// js/firebase-config.js
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:...",
  measurementId: "G-..." // optional
};

// Then initialize the app as your code currently does.
```

If your `js/firebase-config.js` currently uses window globals (e.g., sets `window.firebaseAuth`), replace keys but keep the initialization pattern identical so other modules still get the same global references.

Do I need to change other code?
------------------------------
- Most app code uses `getBookings()`, `saveBookings()` and other helpers in `js/firebase-db.js`. Those are written to use the Firebase instance exported/created in `firebase-config.js`.
- If you only update `firebase-config.js`, the rest of the code should work unchanged.
- Only change other files if you find hard-coded references to the old project (search for the old `databaseURL`, project id, or a full REST DB URL in the codebase).

Services to enable in the new Firebase project
----------------------------------------------
1. Authentication
   - Enable **Email/Password** provider (used by signup/login flows).
   - Optionally add other providers if you need them.
2. Realtime Database
   - Create a Realtime Database instance and set rules (see example below).
   - Choose a location (e.g., `asia-southeast1`) close to your users.
3. (Optional) Firebase Hosting
   - If you plan to host the site on Firebase, enable Hosting and follow the CLI steps.
4. (Optional) Firebase Storage
   - Not required by this project as images are saved as Base64 in DB. Consider enabling for future migration (recommended long-term).

Security rules — recommended starting point
-------------------------------------------
Below are starter rules to balance functionality and safety. Adapt to your security model.

Realtime Database (example)

```json
{
  "rules": {
    // Public read for public data such as featured galleries and community reviews
    "bookings": {
      ".read": "auth != null || (data.exists() && data.child('isPublic').val() === true) || (data.exists() && data.child('isFeatured').val() === true)",
      // Write only by authenticated users with admin role (you must implement role checks in your user profiles)
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "users": {
      ".read": "root.child('users').child(auth.uid).exists() && auth != null", 
      // Allow creating your own user profile on signup
      ".write": "(auth != null && newData.child('id').val() === auth.uid) || (root.child('users').child(auth.uid).child('role').val() === 'admin')"
    },
    // Default deny
    ".read": false,
    ".write": false
  }
}
```

Notes on rules above:
- This example expects you to create `users/{uid}.role` and set admins to `role: 'admin'`.
- The simplest safe approach for initial testing is to set relaxed rules temporarily and then restrict them before production.

Creating admin users
--------------------
- You can manually create an admin user in the Firebase Console → Authentication.
- After creating, add a profile in Realtime DB `users/{uid}`:

```json
{
  "id": "<uid>",
  "name": "Admin Name",
  "email": "admin@you.com",
  "role": "admin",
  "warnings": 0,
  "isBanned": false,
  "createdAt": 1670000000000
}
```

You may also run a script (Admin SDK) or use `firebase database:set` to seed admin profiles.

Importing initial data (bookings, packages)
-------------------------------------------
If you want to import `firebase-initial-data.json` into the new project, use the Firebase CLI:

1. Install/authorize `firebase-tools` if not installed:

```powershell
npm install -g firebase-tools
firebase login
```

2. Initialize the project locally (optional) or set the project id:

```powershell
firebase use --add
# or
firebase projects:list
firebase use <new-project-id>
```

3. Import Realtime DB data (this will overwrite target path):

```powershell
firebase database:set / firebase-initial-data.json --project=<new-project-id>
```

If you only want to import a subpath (e.g., `packages`), use `firebase database:set /packages packages.json`.

If you prefer, open the Firebase Console → Realtime Database → Data → Import JSON.

Configuring `js/firebase-db.js`
-------------------------------
- Usually this file references Firebase instances created in `firebase-config.js`. Confirm it does not hard-code any `databaseURL` or `projectId` values.
- If it does, replace those with values from the new project or change to use the initialized app instance instead.

Checklist: what to verify in your code
-------------------------------------
- `js/firebase-config.js` contains the new project credentials and initializes the Firebase app exactly like before.
- All HTML pages include `js/firebase-config.js` and `js/firebase-db.js` before `main.js`, `admin.js`, etc.
- `js/firebase-db.js` uses the same global variables (e.g., `window.firebaseAuth`, `window.firebaseDatabase`) expected by other modules. If you change the initialization style, update the usages accordingly.
- Search for the old project id or DB URL to find any hard-coded references.

Testing steps after update
--------------------------
1. Update `js/firebase-config.js` with new config and save.
2. Open your app locally (use Live Server or simple HTTP server), sign in as admin user.
3. Verify admin dashboard loads and calls `getBookings()` correctly (open DevTools → Network/Console)
4. Try to upload a before/after image in admin gallery (<= 8 MB) and click save. Check console for `[Media Upload] ✅ Successfully saved`.
5. Click "Feature" on that booking and confirm the booking detail modal shows the ⭐ FEATURED badge.
6. Open `index.html` and confirm `renderFeaturedCutsGallery()` shows the featured images.
7. On public page `reviews.html`, ensure `renderCommunityReviewFeed()` returns fresh data.

Common problems & fixes
------------------------
- "Permission denied" errors: check Realtime Database rules and ensure the logged-in user has `role: 'admin'` set in `users/{uid}`.
- Images not appearing: verify that bookings have `beforeImage`/`afterImage` fields in DB and that `getPublicReviewEntries()` is being awaited.
- Old project data still referenced: search for the old `projectId`/`databaseURL` in the repo.

Optional: move images to Firebase Storage (recommended long-term)
----------------------------------------------------------------
Storing Base64 in the Realtime Database is convenient but bloats DB size and can be expensive. Recommended path for production:
1. Upload binary images to Firebase Storage (or Cloudinary).
2. Save storage download URLs in bookings (`beforeImageUrl`, `afterImageUrl`).
3. Keep `isFeatured` and `featuredDate` in Realtime DB for fast queries.

This change requires updating `handleMediaSubmit()` to upload to Storage and save the file URL instead of a Base64 Data URL.

Useful CLI commands (quick reference)
------------------------------------
```powershell
# login
firebase login

# set active project
firebase use <new-project-id>

# set entire DB from JSON (careful: overwrites)
firebase database:set / firebase-initial-data.json --project=<new-project-id>

# import specific path
firebase database:set /bookings bookings.json --project=<new-project-id>

# deploy rules only
firebase deploy --only database --project=<new-project-id>

# deploy hosting (if using Firebase Hosting)
firebase deploy --only hosting --project=<new-project-id>
```

Security checklist before production
-----------------------------------
- [ ] Realtime Database rules restricted to expected roles
- [ ] Admin user(s) created and tested
- [ ] Auth Email/Password enabled and tested
- [ ] No old project credentials remain in repo
- [ ] Consider switching to Storage for images if DB grows quickly

Support notes and follow-ups
----------------------------
If you want, I can:
- Create a script to import `firebase-initial-data.json` and create the admin user via Admin SDK
- Update `js/firebase-config.js` directly with your config if you paste it here (do not paste private keys in public places)
- Convert the Base64 storage flow to Firebase Storage (upload + URL) and adjust front-end code accordingly

Last updated: 2025-12-03
