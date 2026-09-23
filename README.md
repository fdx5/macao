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
- 프로필 사진 미리보기, 중앙 정사각형 크롭·확대, 저장·교체·기본 동물 복원
- JPG/PNG/WebP 5MB·25MP 제한, 실제 형식 확인, 서버 재인코딩·EXIF 제거
- 파일 기반 프로필 보존, 쓰기 직렬화·원자적 rename·정상 메타데이터 백업
- 기기별 준비물 체크리스트, 낮/밤 테마, 모바일 하단 메뉴, 키보드 모달·모션 감소
- 공개 OG 썸네일, 파비콘, 앱 아이콘, Apple Touch Icon

프로필 선택은 개인 인증이 아닙니다. 접근코드를 아는 가족은 누구의 프로필 사진이든 변경할 수 있습니다. 이름과 팀은 서버의 정적 데이터이고 변경 API를 제공하지 않습니다. 현재 위치는 서버에 전송하지 않습니다.

## 프로젝트 구조

```text
src/                  React + TypeScript 화면과 시간 처리
server/index.mjs      Express API, 접근 보호, 이미지 저장
data/trip.json        버전 관리되는 한국어 여행 콘텐츠
scripts/content.mjs   콘텐츠 원본·JSON 생성기
scripts/assets.mjs    WebP, 아이콘, 공유 이미지 생성
assets/source/        라이선스가 확인된 사진 원본
public/               공개 이미지·아이콘
storage/              비공개 사진, profiles.json, .bak (Git 제외)
tests/                시간·팀·서버 통합 및 브라우저 검증
doc/                  원본 기획서, 검증 결과, 남은 확인사항
render.yaml           Render 단일 인스턴스 + 영속 디스크
```

콘텐츠 수정은 `scripts/content.mjs`에서 한 뒤 `npm run content`로 JSON을 갱신합니다. 일정은 이동·대기·휴식을 포함한 **제안**이며, 바우처·예약 확정을 대체하지 않습니다. 자체 예산과 사업자의 표시가격을 구분하고, MOP/HKD를 원화로 임의 환산하지 않습니다. 정확한 평점·리뷰 수를 검증하지 못해 외부 평점을 만들지 않았습니다.

## Render 배포

1. GitHub `fdx5/macao` 저장소를 Render에 연결합니다.
2. Blueprint로 `render.yaml`을 적용합니다. Node Web Service, Starter 인스턴스, 1GB 디스크를 사용합니다.
3. 환경변수를 설정합니다.

| 변수                 | 설정                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `FAMILY_ACCESS_CODE` | 가족만 아는 새 접근코드. 프런트엔드에 넣지 않음                      |
| `SESSION_SECRET`     | Render 자동 생성값, 재배포 시 유지                                   |
| `SITE_URL`           | `https://실제서비스명.onrender.com` 또는 실제 도메인, 끝 슬래시 없이 |
| `NODE_ENV`           | `production`                                                         |
| `DATA_DIR`           | `/var/data/macao`                                                    |
| `PORT`               | Render 제공값 사용                                                   |

4. Build: `npm ci --include=dev && npm run build`, Start: `npm start`, Health check: `/api/health`.
5. 디스크 마운트가 `/var/data`인지 확인합니다. 사진과 JSON은 그 하위에만 저장됩니다.
6. 배포 후 로그인·사진 저장·다른 브라우저의 같은 여행자·서비스 재시작 후 사진 복원을 확인합니다.
7. 페이지 원문의 `og:url`, `og:image`가 실제 절대 URL인지, `/og.png`가 로그인 없이 HTTP 200인지 확인합니다.

**이 작업에서는 Render 실제 배포를 수행하지 않았습니다.** Render 자격증명과 서비스 도메인이 제공되지 않았습니다. 운영 모드는 접근코드·세션 서명·SITE_URL이 없으면 시작을 거부합니다.

Render 무료 인스턴스는 영속 디스크를 지원하지 않으므로 사진 보존 요구사항을 충족하지 않습니다. 유료 인스턴스에 디스크가 필요하며 비용은 계정의 최신 견적을 확인하세요. 디스크는 단일 서비스 인스턴스에 연결되므로 수평 확장이 불가하고 배포 때 짧은 중단이 발생할 수 있습니다. [Render 영속 디스크](https://render.com/docs/disks), [무료 플랜 제한](https://render.com/docs/free) (2026-09-23 확인).

## 백업과 복구

프로필 변경마다 쓰기를 순차 처리하고 임시 파일을 완성한 다음 rename합니다. `profiles.json.bak`는 이전의 정상 메타데이터입니다. 현재 JSON이 손상되면 백업을 읽습니다. 사진은 랜덤 파일명으로 따로 저장되며 이전 사진도 남겨 메타데이터 복구에 사용할 수 있습니다.

1. 백업 직전 서버를 중지해 진행 중인 업로드가 없는 상태를 만듭니다.
2. `DATA_DIR` **전체**를 날짜가 포함된 별도 위치에 복사합니다. JSON만 백업하면 사진을 복원할 수 없습니다.
3. Render에서는 디스크 스냅샷 외에 주기적으로 외부에 전체 백업을 보관합니다.
4. 복구 시 서버를 중지하고 백업 디렉터리를 복원한 뒤 시작합니다. `SESSION_SECRET` 변경 시 기존 로그인은 무효화됩니다.
5. JSON과 `.bak` 모두 손상되면 기본 동물 프로필을 표시합니다. 외부 백업에서 수동 복구하세요.

이전 사진은 자동 삭제하지 않아 저장공간이 증가할 수 있습니다. 여행 종료 후 정상 JSON/백업이 참조하지 않는 파일을 검토해 정리하세요. 접근코드 파일과 `.env`는 비공개로 관리합니다.

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

브라우저 테스트는 5174 개발 서버를 시작하거나 재사용합니다. 이 저장소가 제공하는 로컬 접근코드를 사용합니다. 단위·서버 통합 테스트는 별도 임시 저장경로와 3198 포트를 사용합니다. 실제 검증 범위와 남은 외부정보는 [검증 결과](doc/VERIFICATION.md), [재확인 목록](doc/PENDING.md)에 정리했습니다.

앱은 완전한 오프라인 서비스가 아닙니다. 로그인/API·지도 타일·외부 길찾기에 네트워크가 필요하며 Google Fonts는 접근 불가 시 시스템 폰트로 대체됩니다. 여행 전 항공권·예약 바우처는 별도로 기기에 저장하세요.
