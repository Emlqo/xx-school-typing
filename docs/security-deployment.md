# Security deployment order

The secure client, Vercel API, data migration, and Firestore Rules must be released in this order.
Deploying the Rules first will intentionally block the legacy student flows.

1. Confirm Firebase Authentication providers: Anonymous and Google.
2. Create a Firebase service-account key and register these values only in Vercel Environment Variables:

   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
   - `TEACHER_UID`
   - `VITE_TEACHER_UID`

3. Deploy the web client and `/api/student-security` Vercel Function together.
4. Confirm `/api/student-security` returns HTTP 401 without a Firebase ID token.
5. Sign in as the teacher and click `보안 명단 동기화` once in class management.
6. Confirm `typing_class_roster` contains every active student and contains no `studentPin`, points, or cosmetics.
7. Test one class PIN setup/login, re-entry, reward, purchase, and equipment flow.
8. Only after those checks, deploy Rules:

   ```bash
   firebase deploy --only firestore:rules --project dongducheon-c28a0
   ```

9. Immediately verify teacher login, guest PIN entry, class entry, score sync, and practice mode.

## Rollback

Keep the previous web deployment available in Vercel. If the API fails before Rules are deployed, roll the web client back. If Rules were deployed and a critical flow fails, restore the previous Rules temporarily, then fix the API; do not leave `allow read, write: if true` enabled longer than necessary.
