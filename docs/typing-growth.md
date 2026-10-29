# Typing growth analysis

The teacher dashboard's `growth` section compares the first three and latest three valid ordinary typing games for each student. The difference in mean CPM determines the ranking. Students need at least six games and a positive difference. This is a progress indicator, not proof of effort or misconduct; modes and durations can differ.

- Only class-based records are eligible. Missing/deleted rooms, deleted or excluded scores, screen-exit disqualifications, guests, duels, subway/elements, empty typing records, weighted/hard games, waiting rooms and unexpired games are excluded.
- Duplicate score documents for one student/game use the latest saved version.
- Dates use Asia/Seoul calendar days. Each period is filtered from the already loaded class history.
- The panel initially performs no score or room reads. `분석하기` makes one classId-scoped score query plus one document read for each relevant game room. No new Firestore index is needed.
- Results stay in tab memory, scoped to the authorized teacher and class. Navigation, date changes, repeated analysis clicks, and exclusion toggles do not re-read scores. `새 기록 불러오기` explicitly refreshes after confirmation. There is no polling or live score listener.
- A 5,001-document sentinel prevents calculating incomplete rankings for histories larger than 5,000 records. The error does not publish a partial ranking.
- `typing_classes/[classId].typingGrowthExcludedStudentIds` stores teacher-managed exclusions, using arrayUnion/arrayRemove and updatedAt. Each exclusion or restoration changes one class document only. Existing class subscriptions receive that change; no score query is added. Existing Rules already restrict class writes to the teacher.
- Excluded candidates remain visible with a red strikethrough and can be restored. The next eligible student fills the vacancy, up to five active winners. Exclusions apply to this class's growth analysis across periods, not other leaderboards or rewards.
- No game score, points, shop, title, or hall-of-fame data is changed. No collection or Rules changes are required.

Verification:

```sh
node --test tests/typing-growth.test.mjs tests/typing-growth-service.test.mjs
node tests/typing-growth-browser.mjs
npm run build
```

The browser preview at `/tests/growth-preview.html` uses clearly labeled synthetic data and mocked reads/writes. It never accesses production records.
