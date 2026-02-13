# Fund-Dup: 사업계획서 유사도 검사 시스템

사업계획서를 업로드하면 기존 제출된 사업계획서들과 비교하여 문단별 유사도를 검사하고 시각화하는 웹 애플리케이션

## 주요 기능

- **3-Phase 표절 탐지**: MinHash 사전필터링 + 6어절 규칙(Rule-based) + 의미적 유사도(AI-based)
- **하이브리드 검색**: BGE-M3 Dense + Sparse 벡터를 활용한 Qdrant Hybrid Search
- **다중 문서 형식**: PDF, DOCX, HWP 지원
- **Side-by-Side 비교**: 유사 문단 좌우 대조 뷰어
- **대용량 처리**: 1,000건+ 문서 비동기 배치 처리

## 기술 스택

### Frontend
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- react-diff-viewer-continued, react-dropzone, TanStack Query

### Backend
- FastAPI + Uvicorn (Python)
- SQLAlchemy 2.0 + Alembic (PostgreSQL)
- ARQ + Redis (비동기 작업 큐)

### AI / NLP
- BGE-M3 (FlagEmbedding) - Dense + Sparse 임베딩
- MeCab-ko (KoNLPy) - 한국어 형태소 분석
- Qwen3-VL (Ollama) - LLM
- datasketch - MinHash/LSH 사전 필터링

### Infrastructure
- Qdrant - Hybrid Vector DB
- PostgreSQL 16 - 메타데이터
- Redis 7 - 작업 큐
- Ollama - 로컬 LLM 서버
- Docker Compose - 전체 오케스트레이션

## 빠른 시작

### 사전 요구사항
- Node.js 20+
- Docker & Docker Compose
- Python 3.12+ (백엔드 개발 시)

### 인프라 실행

```bash
# 모든 서비스 시작 (Ollama, Qdrant, PostgreSQL, Redis)
docker compose up -d

# Ollama 모델 다운로드
docker exec -it ollama ollama pull qwen3-vl
docker exec -it ollama ollama pull bge-m3
```

### 프론트엔드 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인

### 백엔드 실행 (개발 예정)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 프로젝트 구조

```
fund-dup/
├── app/                  # Next.js App Router (프론트엔드)
│   ├── docu/             # 문서 관리 페이지
│   └── result/           # 검사 결과 페이지
├── components/           # React 컴포넌트
│   └── ui/               # shadcn/ui 프리미티브
├── lib/                  # 유틸리티, 타입 정의
├── prisma/               # DB 스키마
├── docs/                 # 구현 계획서
├── backend/              # FastAPI 백엔드 (개발 예정)
│   ├── app/
│   │   ├── api/          # API 엔드포인트
│   │   ├── core/         # 파이프라인, 분석 엔진
│   │   ├── db/           # SQLAlchemy 모델
│   │   └── workers/      # ARQ 비동기 작업
│   └── Dockerfile
└── compose.yaml          # Docker Compose
```

## 표절 판정 기준

| 유사도 | 등급 | 의미 |
|--------|------|------|
| 6어절+ 일치 | EXACT_COPY | 물리적 복사 (표절 확정) |
| >= 0.85 | very_high | 표절 강력 의심 |
| 0.70 ~ 0.85 | high | 말 바꾸기 의심 |
| 0.50 ~ 0.70 | medium | 중간 유사도 |
| < 0.50 | low | 유사도 낮음 |

문서 등급: **DANGER** (EXACT_COPY 발견) / **WARNING** (50%+ 유사) / **SAFE**

## 개발 명령어

```bash
npm run dev      # 프론트엔드 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

## 라이선스

Private

## 참고

- 상세 구현 계획: [docs/implementation-plan.md](docs/implementation-plan.md)
- 카피킬러, 턴잇인 수준의 정밀도를 오픈소스 기술로 구현
