# Firestore access matrix

This document describes the target security boundary represented by `firestore.rules`.
The rules are for local Emulator verification only until the compatibility gaps below are migrated.

## Roles

- Teacher: authenticated Google user with UID `hnjJNGDuydcd4SfQ2Xq5cE6IujD3`.
- Student: Firebase Anonymous Auth user.
- Unauthenticated: no Firebase Auth session.

## Collection permissions

| Collection | Unauthenticated | Student read | Student write | Teacher |
| --- | --- | --- | --- | --- |
| `typing_announcements` | Deny | Allow | Deny | Full CRUD |
| `typing_quizzes` | Deny | Allow | Deny | Full CRUD |
| `typing_words` | Deny | Allow | Deny | Full CRUD |
| `typing_rooms` | Deny | Allow | Deny | Full CRUD |
| `typing_scores` | Deny | Own records only | Create own; update score fields only | Full CRUD |
| `typing_classes` | Deny | Deny | Deny | Full CRUD |
| `typing_class_students` | Deny | Deny | Deny | Full CRUD |
| `typing_class_roster` | Deny | Allow | Deny | Full CRUD |
| `typing_student_sessions` | Deny | Own session only | Deny | Deny; server managed |
| `typing_room_presence` | Deny | Allow | Deny | Read; server managed writes |
| `typing_hall_of_fame` | Deny | Allow | Deny | Full CRUD |
| `typing_shop_items` | Deny | Allow | Deny | Full CRUD |
| `typing_shop_purchases` | Deny | Deny | Deny | Read only; writes reserved for server |
| `typing_assessments` | Deny | Deny | Deny | Server API only |
| `typing_assessment_keys` | Deny | Deny | Deny | Server API only |
| `typing_assessment_submissions` | Deny | Deny | Deny | Server API only |

## Current client access inventory

| Collection | Reads | Creates | Updates | Deletes |
| --- | --- | --- | --- | --- |
| `typing_rooms` | Announcement-independent PIN lookup, open class room query, student room watcher, teacher room list | Teacher guest/class room creation | Teacher start and sync request | Teacher close/delete |
| `typing_scores` | Student re-entry lookup, student room attendance list, own score watcher, teacher leaderboard/monthly ranking | Student guest/class entry | Student score sync/final score; teacher balance and room cleanup | None currently |
| `typing_announcements` | All signed-in app users | Teacher | Teacher | Teacher |
| `typing_quizzes` | Signed-in users, except practice mode behavior remains application-controlled | Teacher | None | Teacher |
| `typing_words` | Teacher and live games | Teacher | None | Teacher |
| `typing_classes` | Teacher | Teacher | None | Teacher |
| `typing_class_students` | Teacher roster and student selected-class roster; reward/shop reads | Teacher bulk roster | Student PIN setup, rewards, purchase/equip; teacher management | Teacher |
| `typing_hall_of_fame` | Signed-in users/teacher panel | Teacher save action | Teacher save action | None |
| `typing_shop_items` | Teacher and selected-class students | Teacher | Teacher; current student purchase transaction also decrements stock | Teacher |
| `typing_shop_purchases` | No normal UI list identified | Current student purchase transaction | None | None |
| `typing_assessments` | Trusted API only | Trusted API only | Trusted API only | Trusted API only |
| `typing_assessment_keys` | Trusted API only | Trusted API only | Trusted API only | Trusted API only |
| `typing_assessment_submissions` | Trusted API only | Trusted API only | Trusted API only | Trusted API only |

## Required query shapes

Firestore Rules are not filters. A query must prove that every possible result is readable.

- Open class rooms: `entryType == 'class'` and `status in ['waiting', 'playing']`.
- Guest PIN room lookup: `roomCode == input`; the client may filter status locally, but room documents are currently readable to signed-in users.
- Teacher room scores: `roomId == selectedRoomId`, or the explicit teacher-only recent-score query.
- Student own score queries must include `userId == request.auth.uid` under the target rules.
- A student room-wide query such as `roomId == selectedRoomId` is denied because it could return other students' score documents.
- Class roster queries cannot be made safe while PIN and points share the same document. Rules cannot hide individual fields from a document read.

## Deployment prerequisites

Do not deploy these rules to production until these steps are complete:

1. Configure the Firebase Admin service-account environment variables in Vercel.
2. Deploy the web client and Vercel security API together.
3. Run `보안 명단 동기화` once to backfill `typing_class_roster`.
4. Verify class PIN setup/login, re-entry, reward, purchase, equipment, and guest entry.
5. Then deploy `firestore.rules`.

## Local verification

The test project ID begins with `demo-`, which prevents Emulator tests from targeting a real Firebase project.

```bash
npm run test:rules
```

Java 11 or newer is required by the Firestore Emulator. No rules deployment is performed by this command.
