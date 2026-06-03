# 풍양중학교 키보드 배틀

중학교 정보/컴퓨터 수업에서 사용할 수 있는 웹 기반 타자 연습 및 실시간 퀴즈 게임 플랫폼입니다.
학생은 4자리 PIN 코드로 반에 입장하고, 교사는 대시보드에서 방 생성, 게임 시작, 점수판 확인, 공지사항, 퀴즈, 게임 밸런스를 관리할 수 있습니다.

## 주요 기능

- 학생 4자리 PIN 입장
- 자유 연습 모드
- 실시간 타자 게임
- 콤보, 길이 보너스, 점수 배율, 부스터 점수 계산
- 4개 단어 성공마다 돌발 4지선다 퀴즈 출제
- 교사 대시보드
- 방 생성, 삭제, 게임 시작
- 실시간 점수판, 학급 평균 점수, 퀴즈 정답 수 표시
- 학생별 부스터 ON/OFF, 점수 배율, 난이도 조정
- 공지사항 등록, 수정, 삭제, 팝업 공지
- 퀴즈 등록, 삭제

## 기술 스택

- Vite
- React 18
- Tailwind CSS
- Firebase v10
- Firestore
- Firebase Anonymous Auth

## 설치 방법

```bash
npm install
```

## 실행 방법

```bash
npm run dev
```

기본 개발 서버는 Vite 설정에 따라 `http://localhost:5173`에서 실행됩니다.

## 빌드 방법

```bash
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

## Vercel 배포 방법

1. 이 프로젝트 폴더를 Git 저장소에 커밋합니다.
2. GitHub 등 원격 저장소에 push합니다.
3. Vercel에서 새 프로젝트를 생성하고 해당 저장소를 연결합니다.
4. Framework Preset은 `Vite`를 선택합니다.
5. Build Command는 `npm run build`를 사용합니다.
6. Output Directory는 `dist`를 사용합니다.
7. 배포 후 발급된 URL에서 첫 화면과 교사/학생 흐름을 확인합니다.

## Firebase 컬렉션 구조

Firestore 경로는 아래 구조를 유지합니다.

```text
artifacts/[appId]/public/data/typing_rooms
artifacts/[appId]/public/data/typing_scores
artifacts/[appId]/public/data/typing_announcements
artifacts/[appId]/public/data/typing_quizzes
```

컬렉션 역할:

- `typing_rooms`: 반/방 정보, PIN 코드, 게임 상태
- `typing_scores`: 학생별 점수, CPM, 난이도, 부스터, 점수 배율
- `typing_announcements`: 교사 공지사항
- `typing_quizzes`: 돌발 4지선다 퀴즈

## 트래픽 최적화 주의사항

- 자유 연습 모드에서는 Firestore Read/Write가 발생하지 않아야 합니다.
- 학생 PIN 입장은 전체 방 목록을 읽지 않고 `roomCode`와 `status` 조건으로 특정 방만 query해야 합니다.
- 학생 화면에서 전체 점수 목록을 구독하면 안 됩니다.
- 학생은 본인 점수 문서 1개만 구독해야 합니다.
- 교사 방 목록 구독은 교사 대시보드에서만 실행되어야 합니다.
- 점수 동기화는 점수가 실제로 변경된 경우에만 `updateDoc`을 호출해야 합니다.
- 퀴즈 오답 감점처럼 점수가 감소하는 경우도 동기화 대상이므로 `!==` 비교를 유지해야 합니다.
- Firestore 경로 helper와 `FIRESTORE_PATHS` 상수를 통해 경로를 유지해야 합니다.

## 배포 후 확인 체크리스트

- 첫 화면이 정상 표시되는지 확인
- 공지사항 모달이 열리고 닫히는지 확인
- 교사 비밀번호 `0327`로 교사 대시보드에 진입되는지 확인
- 반 생성 후 4자리 PIN 코드가 표시되는지 확인
- 학생이 PIN 코드로 대기실에 입장되는지 확인
- 교사가 게임 시작 시 학생이 플레이 화면으로 전환되는지 확인
- 단어 정답 입력 시 점수가 증가하는지 확인
- 오타 시 콤보가 0으로 초기화되고 흔들림 효과가 보이는지 확인
- 붙여넣기와 드롭 입력이 차단되는지 확인
- 퀴즈가 단어 4개 성공마다 출제되는지 확인
- 퀴즈 정답/오답 점수가 규칙대로 반영되는지 확인
- 부스터가 25초 동안 작동하는지 확인
- 교사가 부스터, 점수 배율, 난이도를 변경할 수 있는지 확인
- 실시간 가져오기 시 학생 점수가 반영되는지 확인
- 자유 연습 결과가 Firestore에 저장되지 않는지 확인
- 결과 화면이 정상 표시되는지 확인
