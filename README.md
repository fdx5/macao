# 우리의 마카오 · Our Macao Journal

2026년 10월 12–15일 가족 5명의 마카오 여행을 위한 한국어 웹앱입니다. 크림색 여행 저널, 청록색 타일, 야경 사진과 탑승권을 중심으로 모바일·태블릿·데스크톱을 구성했습니다.

## 로컬에서 열기

Node.js 24 이상을 사용합니다.

```powershell
npm ci
npm run setup
npm run dev
```

- 개발 화면: **http://127.0.0.1:5174**
- API 서버: http://localhost:3001
- 가족 접근코드: `storage/local-access-code.txt`에서 확인합니다.
- `npm run setup`은 기존 `.env`를 덮어쓰지 않습니다. 없으면 임의의 접근코드와 세션 서명을 생성합니다.
- `.env`, `storage/`는 Git에서 제외됩니다. 접근코드를 공유 URL에 넣지 마세요.
- 처음에는 접근코드를 입력하고 여행자 5명 중 본인을 선택합니다. 이후 이 기기의 여행자 선택을 복원합니다.

개발 중이 아닌 빌드 결과를 확인하려면:

```powershell
npm run build
npm start
```

**http://localhost:3001**에서 확인합니다. 개발 서버가 이미 3001을 사용한다면 먼저 종료하세요. 개발 서버의 API도 최신 `dist`를 제공하므로 개발 서버 실행 중에는 3001에서 빌드본을 바로 볼 수 있습니다.

Windows에서 브라우저까지 열려면 `powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1`을 실행하세요. 서버가 없으면 숨김 프로세스로 시작하고, 이미 실행 중이면 재사용합니다. 새로 시작한 서버의 PID는 `storage/server.pid`, 로그는 `storage/server.log`에 저장됩니다.

## 구현된 기능

- 접근코드 보호, HttpOnly 서명 쿠키, 로그인 시도 제한, 요청 출처 검증
- 고정 여행자 5명, A/B팀 분리, 선택 복원·전환
- 4일 48개 일정, 여행 전/중/후, 현재·다음 일정, 출발 안내, 시간 시뮬레이션
- 인천은 Asia/Seoul, 마카오는 Asia/Macau. 항공 출발과 도착 각각 현지 시간 표시
- B팀 10/15 귀국 종료 화면, 별도 버튼으로 A팀 일정 열람
- 16개 장소·식당, 7개 식당 후보, 메뉴·비용·이동·휴식·우천 대안·출처 상세
- Leaflet 지도, 날짜·팀 필터, 기기 위치/정확도/갱신시각, 중지, 권한 거부 대안
- 호텔·내 위치·선택 장소를 출발지로 Google Maps 차량/도보/대중교통 길찾기
- 큰 현지 주소, 주소 복사, 공식 매장 사진·메뉴·예약 링크
- 여행자별 기본 동물 일러스트 프로필, 별도 사진 등록 없이 사용
- 기기별 준비물 체크리스트, 낮/밤 테마, 모바일 하단 메뉴, 키보드 모달·모션 감소
- 공개 OG 썸네일, 파비콘, 앱 아이콘, Apple Touch Icon

프로필 선택은 개인 인증이 아닙니다. 이름과 팀은 서버의 정적 데이터이며 변경할 수 없습니다. 현재 위치는 서버에 전송하지 않습니다. 프로필은 기본 동물 일러스트만 사용합니다.

## 프로젝트 구조

```text
src/                  React + TypeScript 화면과 시간 처리
server/index.mjs      Express API, 접근 보호
data/trip.json        버전 관리되는 한국어 여행 콘텐츠
scripts/content.mjs   콘텐츠 원본·JSON 생성기
scripts/assets.mjs    WebP, 아이콘, 공유 이미지 생성
assets/source/        라이선스가 확인된 사진 원본
public/               공개 이미지·아이콘
storage/              로컬 접근코드·실행 로그 (Git 제외)
tests/                시간·팀·서버 통합 및 브라우저 검증
doc/                  원본 기획서, 검증 결과, 남은 확인사항
render.yaml           Render Free 웹 서비스 (디스크 없음)
```

콘텐츠 수정은 `scripts/content.mjs`에서 한 뒤 `npm run content`로 JSON을 갱신합니다. 일정은 이동·대기·휴식을 포함한 **제안**이며, 바우처·예약 확정을 대체하지 않습니다. 자체 예산과 사업자의 표시가격을 구분하고, MOP/HKD를 원화로 임의 환산하지 않습니다. 정확한 평점·리뷰 수를 검증하지 못해 외부 평점을 만들지 않았습니다.

## Render 무료 배포

1. Render에서 **New → Blueprint**를 선택하고 GitHub `fdx5/macao`의 `main` 브랜치를 연결합니다.
2. 저장소의 `render.yaml`을 적용합니다. **Free 웹 서비스 1개**만 생성하며 데이터베이스와 영속 디스크를 사용하지 않습니다.
3. 다음 환경변수를 설정합니다.

| 변수 | 설정 |
| --- | --- |
| `FAMILY_ACCESS_CODE` | 가족 접근코드 |
| `SESSION_SECRET` | Blueprint 자동 생성값을 계속 유지 |
| `SITE_URL` | 실제 https://서비스명.onrender.com 주소, 끝 슬래시 없이 |
| `NODE_ENV` | production (Blueprint 설정 포함) |
| `NODE_VERSION` | 24 (Blueprint 설정 포함) |
| `PORT` | Render 제공값 사용 |

4. Build Command: `npm ci --include=dev && npm run build`, Start Command: `npm start`, Health Check: `/api/health`.
5. 서비스 주소가 확정되면 SITE_URL을 그 주소로 설정하고 재배포합니다.
6. 배포 후 접근코드 로그인, 여행자 선택·전환, A/B팀 일정, 지도와 프로필을 확인합니다. `/og.png`는 로그인 없이 열려야 합니다.

직접 **New → Web Service**로 생성해도 됩니다. 같은 저장소·브랜치를 연결하고 위 명령과 환경변수를 입력한 뒤 **Instance Type: Free**를 선택하세요. 이 방식에서는 SESSION_SECRET을 충분히 긴 임의 문자열로 직접 설정합니다.

기존 Starter 서비스가 있다면 자동으로 무료 전환되었다고 가정하지 마세요. 연결된 유료 디스크가 있는 경우 기존 사진이 필요하면 먼저 백업하고, Render 대시보드에서 디스크를 제거한 뒤 Instance Type을 Free로 변경해야 합니다. DATA_DIR 환경변수도 제거합니다. 이 저장소 변경은 실제 Render 계정 설정을 직접 바꾸지 않습니다.

무료 웹 서비스는 15분 동안 요청이 없으면 절전 상태가 되며 다음 접속 때 기동에 약 1분이 걸릴 수 있습니다. 서버 파일은 재시작·재배포 시 보존되지 않지만, 이 앱은 여행 데이터를 저장소에서 읽고 기본 프로필을 사용하므로 영속 디스크가 필요 없습니다. 여행자 선택과 체크리스트는 각 브라우저에 저장됩니다. SESSION_SECRET을 유지하면 유효한 로그인 쿠키를 재시작 후에도 확인할 수 있습니다. [Render 무료 서비스 안내](https://render.com/docs/free) (2026-09-23 확인).

**실제 Render 배포는 아직 수행하지 않았습니다.** 운영 모드에서는 FAMILY_ACCESS_CODE·SESSION_SECRET·SITE_URL이 없으면 서버가 시작되지 않습니다. 접근코드와 세션 서명은 Git에 올리지 않습니다.

## 지도와 이미지 정책

Leaflet은 지도 라이브러리이며 타일 서비스와 다릅니다. 기본 타일은 OpenStreetMap 표준 서비스입니다. 가족 5명의 일반 대화형 사용을 전제로 하며 출처와 브라우저 캐시·Referer를 유지합니다. 대량 다운로드·미리 받기·오프라인 타일 캐시는 구현하지 않았습니다. 상용/대규모 공개 서비스로 확장하면 계약된 타일 공급자로 교체하세요. 타일 공급자를 바꾸려면 `VITE_MAP_TILE_URL`, `VITE_MAP_ATTRIBUTION`을 빌드 환경변수로 지정합니다. [OSM 타일 정책](https://operations.osmfoundation.org/policies/tiles/) (2026-09-23 확인).

길찾기는 Google Maps 외부 링크를 사용해 지도 API 키가 필요 없습니다. 도로 경로를 계산하거나 지도에 임의의 직선을 실제 길처럼 표시하지 않습니다. 장소 좌표는 건물/지역 기준이며 정확한 출입구는 외부 지도와 현장 안내를 확인하세요.

- 베네시안: soeperbaby, [원본](https://commons.wikimedia.org/wiki/File:The_Venetian_Macao_Night_View_201104.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)
- 세나도: Pauloleong2002, [원본](https://commons.wikimedia.org/wiki/File:Evening_at_Senado_Square.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- 두 이미지 모두 크롭·압축·화면 오버레이. 세나도 수정 이미지도 CC BY-SA 4.0. 실제 촬영 이미지지만 현재 모습을 보장하지 않습니다.
- 식당 사진 재사용 허가를 확인하지 못해 복제하지 않고 공식 사진 갤러리로 연결합니다. 이미지처럼 보이는 식사 카드는 전용 벡터 일러스트입니다.
- OG PNG는 한글 폰트를 확인한 환경에서 생성해 커밋합니다. Linux의 한글 폰트 유무에 영향을 받지 않도록 기존 PNG는 보존합니다. 다시 만들려면 한글 폰트가 있는 환경에서 `node scripts/assets.mjs --regenerate-og`를 실행하세요.

## 검증

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

브라우저 테스트는 5174 개발 서버를 시작하거나 재사용합니다. 이 저장소가 제공하는 로컬 접근코드를 사용합니다. 단위·서버 통합 테스트는 3198 포트를 사용합니다. 실제 검증 범위와 남은 외부정보는 [검증 결과](doc/VERIFICATION.md), [재확인 목록](doc/PENDING.md)에 정리했습니다.

앱은 완전한 오프라인 서비스가 아닙니다. 로그인/API·지도 타일·외부 길찾기에 네트워크가 필요하며 Google Fonts는 접근 불가 시 시스템 폰트로 대체됩니다. 여행 전 항공권·예약 바우처는 별도로 기기에 저장하세요.
