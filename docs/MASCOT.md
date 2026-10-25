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

## 8. 에셋 상태표 (2026-10-24)

상태: `planned` 제작 예정 · `generated` 생성됨 · `reviewed` 결과 확인 · `integrated` 웹앱 통합 · `verified` 실제 화면 재생 확인

| 동작 | 종류 | 프레임·fps | 크기 | 상태 | 쓰는 곳 |
|---|---|---|---|---|---|
| idle 서 있기(숨쉬기·깜빡임) | 반복 | 30 · 15 | 167KB | verified* | 기본 바탕 |
| walk 걷기 | 반복 | 20 · 20 | 117KB | integrated | 운세 기다리는 중 |
| think 고민(손을 턱에, 갸웃) | 반복 | 30 · 15 | 175KB | integrated | 타로·사주 화면 |
| happy 기뻐 뛰기 | 반복 | 20 · 20 | 116KB | integrated | 좋은 결과 바탕 |
| wave 손 흔들기 | 한 번 | 30 · 20 | 176KB | verified* | 첫 화면·로그인 인사, 터치, 가끔 |
| nod 끄덕끄덕 | 한 번 | 20 · 20 | 114KB | integrated | 차분·쉬어가기 결과, 터치, 가끔 |
| surprised 놀람 | 한 번 | 24 · 20 | 145KB | integrated | 연타, 터치 |
| reveal 복주머니에서 운세 카드 꺼내 보여 주기 | 한 번 | 40 · 20 | 235KB | integrated | 좋음 결과·별자리 결과, 터치 |
| celebrate 웅크렸다 점프·한 바퀴·꽃가루 | 한 번 | 40 · 20 | 250KB | integrated | 대길 결과, 터치(가끔) |
| yawn 기지개·하품 | 한 번 | 36 · 18 | 207KB | integrated | 25초 이상 그대로 두면 |
| 기준 이미지(정면·3/4·측면·후면·표정 4종) | | | | reviewed | `assets/mascot/reference` |

* 앱 내 Chromium(375px)에서 상태 전환 순서(포스터 → idle → 크로스페이드 → wave → 크로스페이드 → idle)를 확인. 나머지는 렌더 시트·이음새 수치로 확인. **Android·iOS 실기기는 확인 전.**

## 9. 품질 점검

| 항목 | 결과 | 근거 |
|---|---|---|
| 프레임 간 외형 변화 | 없음 | 같은 모델·재질·카메라 |
| 다리 주름·이음새 | 없음 | 몸통·허벅지·정강이·발을 메타볼 한 덩어리로 녹여 붙임. 몸 재질 범프 제거 |
| 반응 동작 시작·끝 | 휴식 자세와 같음 | `encode.mjs` 이음새 검사: 6개 동작 모두 첫·끝 프레임이 idle 첫 프레임과 픽셀 동일(PSNR ∞, celebrate 끝 97dB) |
| 반복 동작 이음새 | 보이지 않음 | 끝→처음 PSNR이 평소 프레임 간 수준 (idle 27.1/26.9, walk 22.5/24.2, think 23.5/23.5, happy 21.2/20.2) |
| 동작 전환 | 부드러움 | 0.18초 크로스페이드, 반응이 끝나면 휴식 자세에서 바탕 동작 처음으로 |
| 키 자세 사이 움직임 | 끊김 없음 | Catmull-Rom 보간(가운데 키에서 멈추지 않음) |
| 발 미끄러짐·땅 뚫림 | 없음(설계) | 2관절 IK, 디딤발 높이 고정 |
| 프레임 밖 이탈 | 없음 | 점프·꽃가루 높이까지 카메라 여유 |
| 투명 배경 | 유지 | `webp / yuva420p` |
| 동작 줄이기 | 구현, 미검증 | 포스터만 표시, 반응 동작은 즉시 완료 처리 |
| 빌드·타입·린트·테스트 | 통과 | |

성능: 시트는 화면 근처에서 불러오고(관찰 결과가 1.5초 안에 오지 않으면 그냥 불러옴), 화면 밖·탭 숨김이면 멈춘다. 반응 동작 시트(wave·nod·surprised·들어올 때 동작)는 바탕 동작을 띄운 뒤 미리 불러 둔다. 120px 미만은 포스터만. 큰 시트(1920×3072)는 디코딩 약 23MB라 한 번에 바탕+반응 두 장까지만 쓴다.

## 10. 실행·교체 방법

필요 도구: Blender 5.x(`%LOCALAPPDATA%ProgramsBlenderlender-5.2.3-windows-x64lender.exe`, 공식 포터블), FFmpeg(`winget install Gyan.FFmpeg`). Python 별도 설치는 필요 없다(Blender 내장).

```bash
blender -b --factory-startup -P scripts/mascot/build_mascot.py -- --states all --stills assets/mascot/reference --out assets/mascot/render --res 384 --save assets/mascot/bokki.blend
```

```bash
FFMPEG_PATH=<ffmpeg.exe 경로> node scripts/mascot/encode.mjs
```

- 렌더 약 75초(EEVEE, 10개 동작 310프레임), 인코딩·이음새 검사 수십 초. 결과: `public/mascot/*.webp`, `src/config/mascot-assets.ts`(자동 생성), 검수용 `assets/mascot/preview/*.mp4`(Git 제외).
- 동작 추가: 반복 동작은 `build_mascot.py` 의 `pose()`, 한 번 재생 동작은 `CLIPS` 에 키 자세(첫·끝은 빈 dict = 휴식 자세)를 추가하고, `STATES`(두 파일)와 `src/lib/mascot.ts` 의 사용처를 같이 고친다.
- 외부 도구로 만든 고품질 에셋으로 바꿀 때: 같은 이름의 PNG 시퀀스를 `assets/mascot/render/<동작>/0000.png…`에 넣고 `encode.mjs`만 실행하면 웹앱은 그대로 동작한다.
- SVG 별토끼로 되돌리기: `src/config/brand.ts` 의 `renderer: "svg"`.

## 11. 남은 일·사용자 조치

- Android·iOS 실기기에서 재생·터치 반응 확인 (배포 후 `MY → 관리자 화면 → 캐릭터`)
- 이름 "복이"는 가칭 — 확정 필요
- (선택) 더 높은 품질: 디자이너가 이 모델을 다듬거나, 생성 API 키를 주면 7절 연결 지점에 생성 스크립트 추가

## 12. 의상 (장면별 복이)

같은 모델에 의상·소품을 더해 장면마다 다른 복이를 보여 준다. 복주머니는 모든 의상에 유지(브랜드 정체성).

| 의상 | 쓰는 화면 | 머리·몸 | 손 소품 | 대표 동작 |
|---|---|---|---|---|
| default | 홈·로그인·오늘의 운세·로딩 | — | (reveal 때 운세 카드) | reveal·celebrate |
| saju 사주 복이 | 사주 화면 | 갓(새싹이 대우 위로), 동그란 안경 | 사주책(덮음↔펼침) | read: 책을 펼쳐 읽고 책장을 넘긴 뒤 끄덕 |
| tarot 타로 복이 | 타로 화면 | 마법사 모자(새싹이 꼭대기로), 망토·금 깃 | 타로 카드 세 장 부채 | draw: 한 장을 뽑아 높이 보여 줌 |
| star 별자리 복이 | 별자리 화면 | 베레모·별 핀, 노란 목도리 | 망원경 | stargaze: 망원경으로 하늘을 보면 별이 반짝 |

- 의상마다 렌더: idle(바탕) + wave·nod·surprised(터치 반응) + 대표 동작. 이름은 `<의상>-<동작>` (예: `tarot-draw`).
- 의상 시트에 없는 동작은 `resolveSheet`(src/lib/mascot.ts)가 바꾼다: 결과 소개·축하 → 대표 동작, 하품 → 끄덕, 그 밖의 바탕 동작 → idle.
- 의상별 휴식 자세(소품을 몸 앞에 든 자세)에서 시작·끝나므로 의상 안에서 전환이 끊기지 않는다 (이음새 검사 대상).
- 포스터도 의상별(`poster-<의상>.webp`) — 불러오는 동안 기본 복이가 잠깐 보이지 않게.

## 13. 화질

- 렌더 640px → 모든 동작·의상 프레임의 캐릭터 영역(알파) 합집합으로 여백을 잘라 낸 뒤 칸 높이 512px로 축소(lanczos), WebP 품질 90.
- 같은 영역으로 자르므로 동작·의상을 바꿔도 위치가 어긋나지 않는다. 시트 한 변은 4096px 이하(모바일 사파리 안전 범위).
- 화면 크기는 `CharacterStage` 의 `size`(상자) × `zoom`(그림 배율, `brand.ts` 의 `mascotZoom`). (크기 시안을 보던 관리자 캐릭터 갤러리는 2026-10-25 삭제)

## 14. 2.5D 스타일·천막 배경 (2026-10-24)

- 사용자 선택: **4 소프트 2.5D** (시안 6종: 플랫 2D·셀 2D·3단 셀·소프트 2.5D·스티커·라이트 클레이). `build_mascot.py --style soft25d`
  - 툰 셰이딩(Diffuse → Shader to RGB → 부드러운 램프, 그림자는 살짝 보랏빛) + 직교(원근 없는) 카메라, 30° 비스듬히
  - 지금 렌더 명령: `blender -b --factory-startup -P scripts/mascot/build_mascot.py -- --style soft25d --states all --stills assets/mascot/reference --out assets/mascot/render --res 640`
  - 인코딩: `node scripts/mascot/encode.mjs --height 448 --quality 85` → 시트 181~499KB (이전 대비 약 30% 감소), 칸 266×448
- 렉 줄이기: 미리 불러올 시트는 내려받기만 하고 디코딩은 바꿔 끼우기 직전에(`prefetchSheet`/`loadSheet`), 움직이는 복이 주변의 흐림·그림자 필터 제거, 우주 배경 애니메이션·유리 카드 흐림(backdrop-filter) 제거
- 배경: `src/components/app/SceneArt.tsx`(SVG 일러스트, 애니메이션 없음) + `src/lib/scene.ts`(경로별 장면)
  - 홈·오늘의 운세 = 해질녘 천막 입구, 사주 목록·타로 = 천막 안, 별자리·로그인/가입 = 별빛 정원, 그 밖 = 크림색
  - `Screen` 의 `scene` 을 주면 "장면 + 시트" 화면: 위는 일러스트 위 제목·복이, 아래는 크림색 둥근 시트

## 15. 마스코트 교체: 별이 (2026-10-24 사용자 결정)

복이 대신 **"별이"** 가 앱 전체의 마스코트. 원본은 BlenderKit 의 **Aurora Fox (Rigged)** (작가 Eliška Pantůčková, 무료·Royalty Free, 뼈대 포함, 면 4,250개).

- **라이선스**: 앱·상업적 사용은 되지만 모델 파일 재배포는 안 된다 → 모델은 저장소에 넣지 않고 렌더한 그림(`public/mascot/*.webp`)만 넣는다. 원본은 `node scripts/mascot/fetch_fox.mjs` 로 받는다(`assets/reference/aurora-fox.glb`, git 제외).
- **렌더**: `blender -b --factory-startup -P scripts/mascot/build_fox.py -- --states all --stills assets/mascot/reference --out assets/mascot/render --res 640` → `node scripts/mascot/encode.mjs --height 448 --quality 85`. 이름·형식은 복이와 같아 웹앱은 그대로 쓴다. (복이는 `build_mascot.py` 로 언제든 다시 만들 수 있다)
- **스타일**: 원본 색 텍스처 × 소프트 2.5D 명암(그림자는 보랏빛) → 발광. 눈은 원본 유광 재질.
- **눈 자국 정리**: 원본 몸 텍스처에 눈 자리가 어두운 원으로 칠해져 있어 웃는 눈(^ ^)·깜빡임 때 자국이 보였다 → 불러올 때 눈 크기의 둥근 어두운 덩어리(둘레가 밝은 피부인 것만)를 찾아 바깥 피부색으로 채운다(`clean_eye_sockets`).
- **뼈대**: glTF 로 가져오면 Rigify 제어(제약)가 사라지므로 변형 뼈를 직접 돌린다 — 머리 `DEF-spine.009~011`(눈은 `DEF-spine.011` 에 다시 붙임), 꼬리 `MCH-ROT-tail`(+`spine.003~001`), 앞다리 `DEF-front_thigh/shin`, 뒷다리 `DEF-thigh/shin`, 숨쉬기 `DEF-spine.005~007` 크기.
- **동작(네 발 동물에 맞춤)**: idle(숨쉬기·꼬리·깜빡임) · walk(대각선 종종걸음) · think(갸웃) · happy(깡충·꼬리 흔들기) · wave(가까운 앞발 흔들기) · nod · surprised(뒤로 깡충·꼬리 번쩍) · reveal(머리 위로 운세 카드) · celebrate(점프 한 바퀴·꽃가루) · yawn(앞으로 쭉 기지개)
- **의상**: 모자는 머리 뼈에 붙이고(갓·마법사 모자·베레모), 소품은 옆에 띄운다 — 사주책(read: 펼쳐지고 책장 넘어감), 타로 카드 부채(draw: 한 장이 떠올라 머리 위로), 삼각대 망원경(stargaze: 하늘을 보면 별이 반짝)
- **얼굴 크기 고정 (2026-10-24 수정)**: 숨쉬기로 몸통 뼈(DEF-spine.005~007)를 부풀리면 목·머리 뼈가 그 배율을 물려받아 얼굴이 최대 9% 커졌다(대기·고민·카드·하품). 목의 첫 뼈 `DEF-spine.008` 의 `inherit_scale` 을 `NONE` 으로 해 머리 배율을 모든 동작에서 1.000으로 고정. 놀람 눈 배율 1.25 → 1.15.

## 16. 의상 다시 만들기 (2026-10-25 사용자 요청: 의상이 이상하게 보임)
- 원인: 모자를 머리 뼈 끝(높이 약 1.09, 머리 속 깊은 곳)에 붙여 모자가 머리에 묻혔고, 책·카드는 정면을 향한 네모 판처럼 몸에서 멀리 떠 있었다.
- `head_top()`: 몸 메시 표면에서 정수리(귀 사이, 약 1.66)와 귀 끝(약 1.81, 좌우 0.31)을 재서 모자를 얹는다.
  - 갓: 넓은 챙이 귀 끝 위에 얹히고 갓끈(구슬)이 얼굴 양옆으로 / 마법사 모자: 크게, 끝이 휘고 금띠·별 / 베레모: 크게, 한쪽으로 기울여 별 핀
  - 책(사주)·카드(타로): 원래 크기, 두께·금장식이 보이게 비스듬히, 꼬리 아래 빈 곳(몸 왼쪽 아래)에. 아래에 라벤더 빛 고리·반짝이를 두어 마법으로 떠 있는 느낌
  - 별자리 망원경은 몸 가까이
- 다시 만들기: 기존 렌더(기본 의상 포함)를 `assets/mascot/render`에 둔 채 `--outfits saju,tarot,star`만 렌더 → `node scripts/mascot/encode.mjs --height 448 --quality 82` (타로 카드 뽑기 시트가 85에서 800KB를 넘어 82로). 칸 418×448

