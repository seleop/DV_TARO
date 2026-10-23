# DV_TARO 작업 인계 (2026-10-23)

다른 세션에서 이어서 작업할 때 참고하는 진행 내역 요약입니다.

## 기본 정보
- 원격 저장소: https://github.com/seleop/DV_TARO.git (`origin`, 브랜치 `main`)
- 로컬 경로: `C:\Users\seleo\Documents\DV_TARO`
- 형태: 모바일 웹앱 (PWA — 홈 화면 설치·오프라인 지원)
- 기술 스택: React + Vite + TypeScript
- 환경: Windows 11, Node v24.22.1, npm 11.19.1

## 진행 내역
| 커밋 | 내용 |
|------|------|
| `95bda8a` | 첫 커밋: README.md, .gitignore(범용), CLAUDE.md(한국어 답변 지침) |
| `5ee0e60` | CLAUDE.md: 궁금한 점은 적극적으로 질문한다는 지침 추가 |
| `1c1e659` | CLAUDE.md: Android/iOS 모두 구동, 모바일 이용자 기준 DOM·UX/UI 지침 추가 |

커밋하지 않은 변경:
- CLAUDE.md에 "프로젝트 개요"(웹앱·PWA·React+Vite+TS) 섹션 추가
- 이 HANDOFF.md 파일

## 프로젝트 지침 (CLAUDE.md 요약)
- 모든 답변은 한국어로 통일한다.
- 궁금한 점이나 확인이 필요한 부분은 적극적으로 질문한다.
- Android와 iOS 모두 문제없이 구동되어야 한다.
- 모든 DOM과 UX/UI는 모바일 이용자 기준으로 개발한다.

## 미해결 사항
- **프로젝트 뼈대 위치 불명:** 사용자가 뼈대를 이미 만들었다고 했지만 DV_TARO 폴더와 GitHub 레포에는 README.md, .gitignore, CLAUDE.md만 있다. PC에서 찾은 Vite 프로젝트는 `JHD-AD-dashboard`(Documents, Documents\Codex, OneDrive\문서에 있음) 하나뿐인데, 이름이 달라서 열어보지 않았다. → 뼈대 위치를 사용자에게 확인해야 한다.

## 다음 단계
1. 뼈대 위치를 확인하고 프로젝트 폴더 전체를 검토한다.
2. 뼈대가 DV_TARO 폴더에 들어오면 .gitignore를 Vite/React 기준으로 정리한다.
3. PWA 설정(manifest, 서비스워커)과 모바일 기본 설정(viewport, safe-area, iOS 홈 화면 아이콘)을 점검한다.
4. 커밋하지 않은 변경(CLAUDE.md, HANDOFF.md)을 커밋하고 push한다.
