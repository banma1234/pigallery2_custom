# PiGallery2 홈랩 갤러리 — 프로젝트 개요

**솔루션명:** PiGallery2 (홈랩 커스텀 fork)
**분류:** 내부 전용(VPN) 사진·짧은 동영상 조회 서비스 / 개인 미디어 인프라

이 프로젝트의 목적은 기능을 많이 제공하는 것이 아니라,
**조직이 매일 신뢰하고 사용할 수 있는 기본 업무 환경**을 만드는 것이다.
AI는 이 프로젝트를 실험용 소프트웨어가 아닌 **핵심 업무 인프라**로 인식해야 한다.

---

## 모노레포 구조

```
pigallery2_custom/
├─ src/
│  ├─ backend/    # Node + Express + TypeORM 서버/REST API, 스캔·인덱싱·썸네일
│  ├─ frontend/   # Angular 웹 UI (standalone 컴포넌트), i18n(en/ko)
│  └─ common/     # 프론트/백엔드 공유 엔티티·DTO·설정(Config)
├─ docker/        # 컨테이너 빌드/배포 정의
├─ docs/          # 문서 (docs/plan/* 은 gitignore — 로컬 전용)
├─ extension/     # PiGallery2 백엔드 확장 인터페이스
├─ test/          # 단위/e2e(cypress) 테스트
├─ benchmark/     # 성능 측정
└─ demo/          # 데모용 데이터/설정
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Angular 19 (standalone) · TypeScript · Bootstrap 5.3 · ngx-bootstrap · @ng-icons(ionicons) · Leaflet · i18n(en 소스 / ko), 폰트 Inter+Pretendard |
| Backend | Node.js · Express 4 · TypeORM 0.3 (기본 SQLite/better-sqlite3, 옵션 MySQL) · sharp · exifr · ffmpeg(동영상 트랜스코딩) |
| Infra | Docker + Docker Compose · Proxmox Private VM(Debian 12, 10.20.20.80) · NAS NFS read-only mount · HomeLab Nginx 역방향 프록시 · WireGuard VPN(10.99.0.0/24) 내부 전용 |

---

## 작업 규칙

아래 규칙을 **항상** 준수한다. 각 파일을 참조한다.

- @.claude/rules/00-org.md — 조직/코딩 원칙, AI 에이전트 행동 규칙
- @.claude/rules/01-security.md — 보안 정책(시크릿, 접근 제어)
- @.claude/rules/02-mcp-policy.md — MCP 사용 정책
- @.claude/rules/20-il8n-rules.md — i18n(영어/한국어 2개 언어) 규칙
- @.claude/rules/90-commit-pr.md — 커밋/PR 규칙
- @.claude/rules/99-do-not.md — 금지 목록
