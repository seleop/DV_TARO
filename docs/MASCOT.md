# 마스코트 "복이" — 디자인 명세·제작 파이프라인·상태표

운세 앱 전체(사주·오늘의 운세·타로·행운 뽑기·AI 상담)에서 재사용하는 공통 마스코트.
참고 영상(`assets/reference/character-walk.mp4`, 저장소 미포함)의 **분위기만** 참고했다:
둥근 3D 실루엣, 크림색 몸, 초록 머리 장식, 주황 가방, 클레이 질감, 따뜻한 조명, 차분한 걸음.

## 1. 콘셉트

| 항목 | 내용 |
|---|---|
| 이름(가칭) | **복이** — "복(福)을 모으는 새싹 요정" |
| 성격 | 느긋하고 다정함. 행운의 씨앗을 주머니에 모아 사람들에게 나눠 준다 |
| 한 줄 실루엣 | 큰 둥근 머리 + 작은 몸 + **머리 위 네잎클로버 새싹** + 옆구리의 **주황 복주머니** |

### 참고 영상과 다르게 만든 점 (복제 방지)

| 참고 영상 | 복이 |
|---|---|
| 사람이 토끼 옷을 입은 형태, 긴 토끼 귀 | 옷이 아닌 하나의 몸. **긴 귀 없음**, 머리 양옆에 작은 둥근 귀 |
| 살구색 얼굴 판이 따로 있음 | 얼굴 판 없이 크림색 몸에 바로 이목구비 |
| 뭉게구름 모양 초록 앞머리 | 머리 꼭대기의 **네잎클로버 새싹**(줄기 + 하트 잎 4장) |
| 사각 주황 숄더백, 초록 끈 | **둥근 복주머니**(조임끈·금색 별 장식), 갈색 가죽 끈 |
| 2.5등신 | **2등신**(머리:몸 ≈ 1:1), 짧고 통통한 다리 |

## 2. 외형

- **정면**: 머리는 살짝 옆으로 넓은 구(폭 1.0 : 높이 0.9). 이마 위 중앙에서 새싹이 솟는다. 눈은 세로로 긴 진한 갈색 타원 + 흰 하이라이트 2점, 볼은 연분홍 원, 입은 작은 "ω" 대신 **짧은 미소 곡선**. 몸은 아래가 넓은 달걀형, 배에 살짝 밝은 원.
- **측면**: 머리 뒤통수가 둥글게 튀어나와 옆에서도 공처럼 보임. 새싹 줄기가 살짝 앞으로 휘어 있다. 복주머니는 왼쪽 엉덩이 옆, 끈은 오른쪽 어깨에서 대각선.
- **후면**: 단순한 크림색 구. 꼬리 대신 작은 클로버 잎 모양 무늬 1개(선택).
- **비율**: 전체 높이 1.0 기준 머리 0.5, 몸 0.32, 다리 0.18. 팔은 몸 높이의 0.7, 손은 둥근 끝.

## 3. 색상·재질

| 부위 | 색 | 재질 |
|---|---|---|
| 몸·머리 | 크림 화이트 `#F6EFE3` | 클레이: 거칠기 0.55, 약한 표면 노이즈 범프, 약한 서브서피스 |
| 새싹 잎 | 모스 그린 `#6FA053`, 줄기 `#4E7F3A` | 클레이, 약간 광택(거칠기 0.45) |
| 복주머니 | 웜 오렌지 `#EC8A3C`, 조임끈 `#C9612A` | 패브릭 느낌(거칠기 0.7) |
| 가방 끈 | 갈색 `#8A5A3B` | 가죽(거칠기 0.5) |
| 별 장식 | 골드 `#F2C14E` | 금속 0.6, 거칠기 0.35 |
| 눈 | 다크 브라운 `#3A2A24` + 흰 하이라이트 | 유광(거칠기 0.15) |
| 볼 | `#F4A3A8` 투명도 0.7 | |
| 조명 | 따뜻한 키 라이트(3800K 느낌) + 부드러운 필 + 차가운 림 | |

## 4. 표정

| 표정 | 눈 | 입 | 기타 |
|---|---|---|---|
| 기본 | 세로 타원 | 짧은 미소 | |
| 깜빡임 | 눈 높이 10% | 그대로 | 0.1초 |
| 기쁨 | 위로 휜 반달(^ ^) | 벌린 미소 | 볼 진하게 |
| 놀람 | 1.3배 둥근 눈 | 작은 O | 새싹이 쭈뼛 |

## 5. 움직일 때 지킬 규칙

- 머리·몸 비율과 색은 어느 프레임에서도 바뀌지 않는다(3D 모델 하나로 모든 동작을 렌더링하므로 보장됨).
- 새싹·복주머니는 **한 박자 늦게** 따라 흔들린다(2차 동작). 형태는 변형하지 않고 회전만 한다.
- 발은 땅(그림자 위치)을 뚫거나 뜨지 않는다. 걷기는 제자리 걷기(트레드밀)로, 디딤발은 일정 속도로 뒤로 이동한다.
- 카메라는 고정. 캐릭터 중심이 프레임 중앙에서 벗어나지 않는다.

## 6. 제작 파이프라인 (현재 환경에서 실제 사용)

```
scripts/mascot/build_mascot.py  (Blender Python, 백그라운드 실행)
   ├─ 모델링: 기본 도형 + 모디파이어로 복이 생성 (외부 에셋·이미지 없음)
   ├─ 리깅: 아마추어(골반·척추·머리·팔·다리 2마디 IK), 부위별 강체 부모 연결
   ├─ 애니메이션: idle / walk / happy / surprised 키프레임 (코드로 생성)
   └─ 렌더링: EEVEE, 투명 배경 PNG 시퀀스 → assets/mascot/render/<state>/
scripts/mascot/encode.mjs  (FFmpeg)
   ├─ PNG 시퀀스 → WebP 스프라이트 시트(알파) public/mascot/<state>.webp
   ├─ 첫 프레임 포스터 public/mascot/poster.webp
   ├─ 검수용 미리보기 MP4(배경 합성) assets/mascot/preview/<state>.mp4
   └─ src/config/mascot-assets.ts 갱신(프레임 수·격자·fps·용량)
```

실행 방법은 [9. 실행·교체 방법](#9-실행교체-방법) 참고.

### 왜 영상(WebM/MP4)이 아니라 스프라이트 시트인가

- 투명 배경 영상은 브라우저마다 지원이 다르다. Chrome·Android는 VP9 알파 WebM을 재생하지만 **iOS Safari는 VP9 알파를 지원하지 않고**, Safari용 HEVC 알파는 macOS 인코더가 필요하다. 안드로이드·iOS 모두 지원해야 하므로 영상 알파는 기본 형식에서 제외했다.
- WebP 스프라이트 시트는 iOS 14+·Android 모두 알파를 지원하고, JS로 프레임을 직접 넘기므로 **멈춤·한 번 재생·완료 콜백·화면 밖 정지·동작 줄이기**를 모두 정확히 제어할 수 있다.
- GIF는 사용하지 않는다(256색·1비트 알파).

## 7. 외부 생성 도구 (선택, 현재 미연결)

키를 받으면 아래 연결 지점을 쓴다. 키는 `.env.local`/Vercel 환경변수에만 두고 브라우저 번들·Git에 넣지 않는다(이 작업은 서버·로컬 스크립트에서만 실행).

| 용도 | 서비스 예 | 환경변수 | 연결 지점 |
|---|---|---|---|
| 기준 이미지 후보 생성 | OpenAI 이미지 생성 | `OPENAI_API_KEY` | `scripts/mascot/` 에 생성 스크립트 추가 → 결과는 `assets/mascot/concepts/` |
| 기준 이미지·영상 | Google Imagen / Veo | `GEMINI_API_KEY` | 동일 |
| 이미지 → 3D 모델 | Meshy, Tripo 등 | 서비스별 키 | 생성된 GLB를 Blender로 가져와 같은 리그·렌더 파이프라인 사용 |

기준 프롬프트(출발점):
> Create an original, premium-quality 3D mascot for a whimsical fortune-telling web application. The character has a soft, rounded cream-white body, a moss-green four-leaf-clover sprout on top of its head, small round ears, and a warm-orange round drawstring pouch worn crossbody on a brown strap with a small gold star charm. Clay figurine aesthetic, subtle surface texture, soft studio lighting, gentle ambient occlusion, two-head-tall proportions, clean facial features (vertical oval eyes with highlights, small smile, soft pink cheeks), highly recognizable silhouette. Neutral standing pose, full body, centered, plain background, no text, no watermark.

생성 이미지는 여러 시점에서 같은 캐릭터를 유지하지 못하면 기준 이미지로 채택하지 않는다. 현재 기준은 **Blender 모델 렌더**다(모든 시점·동작이 같은 모델에서 나오므로 일관성 보장).

## 8. 에셋 상태표 (2026-10-23)

상태: `planned` 제작 예정 · `generated` 생성됨 · `reviewed` 결과 확인 · `integrated` 웹앱 통합 · `verified` 실제 화면 재생 확인

| 에셋 | 상태 | 파일 | 비고 |
|---|---|---|---|
| 기준 이미지 정면·3/4·측면·후면 | reviewed | `assets/mascot/reference/*.png` | 같은 3D 모델 렌더라 시점 간 일관성 보장 |
| 표정 기준(기쁨·놀람) | reviewed | `assets/mascot/reference/expression-*.png` | |
| idle (24프레임 12fps, 2초 루프) | verified* | `public/mascot/idle.webp` 150KB | 숨쉬기·한 번 깜빡임·새싹 흔들림 |
| walk (20프레임 20fps, 1초 루프) | verified* | `public/mascot/walk.webp` 132KB | 2관절 IK 제자리 걷기. "점치는 중" 화면 |
| happy (20프레임 20fps 루프) | verified* | `public/mascot/happy.webp` 121KB | 콩콩 뛰며 두 팔 들기. 좋은 결과·터치 |
| surprised (16프레임, 한 번) | verified* | `public/mascot/surprised.webp` 110KB | 연타·점프 반응, 끝나면 완료 콜백 |
| 포스터 | integrated | `public/mascot/poster.webp` 7KB | 로딩·동작 줄이기·작은 아이콘 |
| reveal | planned | | 복주머니에서 카드를 꺼내 보여 주는 동작 |
| celebrate | planned | | 대길 전용 (꽃가루·점프) |

* 개발 PC의 앱 내 Chromium(모바일 375px 에뮬레이션)에서 프레임 진행·상태 전환·완료 콜백을 확인. **Android·iOS 실기기는 아직 확인 전.**

## 9. 품질 점검

| 항목 | 결과 | 근거 |
|---|---|---|
| 프레임 간 외형 변화 | 없음 | 모든 프레임이 같은 모델·재질·카메라 |
| 발 미끄러짐·땅 뚫림 | 없음(설계) | 디딤발은 발목 높이 고정, 2관절 IK로 다리 길이 안에서만 이동. 제자리 걷기라 디딤발이 일정 속도로 뒤로 간다 |
| 가방·새싹 변형 | 없음 | 회전만 하고 형태는 고정 |
| 루프 이음새 | 없음(설계) | 모든 움직임이 주기 함수(프레임 n = 프레임 0) |
| 프레임 밖 이탈 | 없음 | 렌더 시트 확인 (머리 새싹 위·발 아래 여백) |
| 투명 배경 | 유지 | ffprobe: `webp / yuva420p`, 보라 배경 합성으로 확인 |
| 모바일 식별성 | 양호 | 375px 화면에서 150·280px 표시 확인 |
| 동작 줄이기 | 구현, 미검증 | 브라우저 에뮬레이션 도구가 없어 화면 확인 못 함 |
| 빌드·타입·린트·테스트 | 통과 | `npm run build`, `npm run typecheck`, `npx eslint .`, `npm test` |

성능: 시트는 화면 근처에 올 때 불러오고(IntersectionObserver), 화면 밖·탭 숨김이면 멈춘다. 120px 미만 아이콘은 포스터만 쓴다. 디코딩 메모리는 시트당 약 9~14MB(2304×1536 RGBA)라 한 화면에 큰 동작을 여러 개 동시에 띄우지 않는다(갤러리 화면 제외).

## 10. 실행·교체 방법

필요 도구: Blender 5.x(`%LOCALAPPDATA%ProgramsBlenderlender-5.2.3-windows-x64lender.exe`, 공식 포터블), FFmpeg(`winget install Gyan.FFmpeg`). Python 별도 설치는 필요 없다(Blender 내장).

```bash
blender -b --factory-startup -P scripts/mascot/build_mascot.py -- --states idle,walk,happy,surprised --stills assets/mascot/reference --out assets/mascot/render --res 384 --save assets/mascot/bokki.blend
```

```bash
FFMPEG_PATH=<ffmpeg.exe 경로> node scripts/mascot/encode.mjs
```

- 렌더 약 25초(EEVEE), 인코딩 수 초. 결과: `public/mascot/*.webp`, `src/config/mascot-assets.ts`(자동 생성), 검수용 `assets/mascot/preview/*.mp4`(Git 제외).
- 동작 추가: `build_mascot.py` 의 `STATES`·`pose()` 와 `encode.mjs` 의 `STATES` 에 같이 추가.
- 외부 도구로 만든 고품질 에셋으로 바꿀 때: 같은 이름의 PNG 시퀀스를 `assets/mascot/render/<동작>/0000.png…`에 넣고 `encode.mjs`만 실행하면 웹앱은 그대로 동작한다.
- SVG 별토끼로 되돌리기: `src/config/brand.ts` 의 `renderer: "svg"`.

## 11. 남은 일·사용자 조치

- Android·iOS 실기기에서 재생·터치 반응 확인 (배포 후 `MY → 관리자 화면 → 캐릭터`)
- 이름 "복이"는 가칭 — 확정 필요
- reveal·celebrate 동작 제작
- (선택) 더 높은 품질: 디자이너가 이 모델을 다듬거나, 생성 API 키를 주면 7절 연결 지점에 생성 스크립트 추가
