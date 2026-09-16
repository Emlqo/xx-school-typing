# 지하철판

- 학급 방 및 게스트 방의 모드에서 `지하철판 · 4호선`을 선택하고 출발/도착을 설정합니다.
- 진접부터 오이도까지 51개 정거장을 내장하며, 반대 방향도 지원합니다. 입력에서는 `역` 접미사와 부역명을 제외합니다.
- 방 시작 시각부터 서버 제출 수신 시각까지를 0.01초 단위로 표시합니다. 같은 기록은 공동 순위입니다. 통신 지연도 기록에 포함됩니다.
- 제한시간을 넘겨 서버에 도착한 제출은 미완주입니다. 점수, 퀴즈, 부스터, 포인트 보상은 없습니다.
- 키 입력과 열차 애니메이션은 DB를 사용하지 않습니다. 교사의 진행 현황 요청, 완주, 제한시간 종료 시에만 제출 API를 호출합니다.
- 제출 트랜잭션은 자기 점수 문서와 방 문서를 읽고 점수 문서 하나를 갱신합니다. 기존 학생 본인/교사 점수 구독에는 해당 변경만 전달됩니다.
- 재입장은 기존 점수 문서를 재사용하며 마지막 서버 저장 정거장부터 시작합니다. 저장 전 새로고침하면 그 이후 진행은 복구되지 않습니다. 시작 시각은 유지됩니다.
- 서버는 소유자, 방 종류/상태, 입력한 정거장 순서 및 시간을 검증하고 확정된 결과를 다시 덮어쓰지 않습니다. 클라이언트 입력 기록 자체가 자동화되지 않았다는 증명까지 제공하지는 않습니다.

## 검증 및 배포

- `node --test tests/subway.test.mjs`로 노선/시간/순위/보상 제외를 검증합니다.
- `npm run dev -- --port 5180` 후 `/tests/subway-preview.html`은 운영 DB를 변경하지 않는 UI 테스트 페이지입니다. 프로덕션 빌드에는 포함되지 않습니다.
- `tests/subway-browser.mjs`는 Playwright + Edge로 화면과 입력 차단/완주를 검증합니다. `CODEX_NODE_MODULES`로 Playwright 설치 경로를 지정할 수 있습니다.
- 서버 API와 프론트엔드를 함께 배포해야 합니다. `firestore.rules`의 지하철 점수 직접 쓰기 차단도 함께 배포해야 합니다.
- 기존 Firebase 컬렉션 경로를 그대로 사용합니다. 방에는 `mode: subway`, `subway: { line, from, to }`, `startedAt`을 저장합니다.
- 점수 문서에는 `gameType: subway`, `subwayProgress`, `subwayStatus`, `subwayElapsedMs`, `subwayFinishedAt`을 추가합니다.

## 노선 확인 자료

- https://pts.map.naver.com/end-subway/ends/web/406/home
- https://mediahub.seoul.go.kr/news/article/newsArticlePrintPopup.do?articleNo=2004060
- https://namu.moe/w/틀:서울_지하철_4호선의_역_목록
# Memory mode

- New rooms default to six stops and memory mode; copy mode remains selectable.
- Teacher-selected preview (5-300 seconds, default 15) is excluded from elapsed time. A full-screen memorization panel displays the route and countdown. Late arrivals do not restart it.
- Initials cost 3 seconds; revealing the answer costs another 5 seconds per stop.
- Hint history is cached in sessionStorage and submitted with existing checkpoints/final submission, with no extra requests per hint. The server merges saved hint levels and calculates the penalty.
- This is a classroom UI aid, not cheat-proof memorization: station data and unsaved hints are client-side and can be inspected or altered with developer tools.
