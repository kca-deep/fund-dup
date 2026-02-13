# 사업계획서 유사도 검사 시스템 구현 계획 v2

## 1. 프로젝트 개요

사업계획서를 업로드하면 기존 제출된 사업계획서들과 비교하여 문단별 유사도를 검사하고 시각화하는 웹 애플리케이션.

### 사용자 요구사항

| 구분 | 요구사항 |
|------|---------|
| 파일 형식 | PDF, DOCX, HWP |
| 저장 방식 | DB + 로컬 파일 시스템 |
| 문서 수량 | 1,000건 이상 (대규모) |
| LLM | 오픈소스 (Ollama + Qwen3-VL) |
| 임베딩 | BGE-M3 (FlagEmbedding, Dense+Sparse 동시 생성) |
| 배포 환경 | Linux (Docker 컨테이너) |

### v1 → v2 주요 변경사항

| 구분 | v1 | **v2** | 변경 이유 |
|------|-----|--------|-----------|
| Backend | Next.js API Routes (Node.js) | **FastAPI (Python)** | Python ML 생태계, 한국어 NLP, HWP 직접 지원 |
| 임베딩 | Ollama (Dense만) | **FlagEmbedding (BGE-M3)** | 단일 모델로 Dense + Sparse + ColBERT 동시 생성 |
| 표절 탐지 | 2-Track | **3-Phase** | MinHash 사전필터링 추가로 대규모 처리 성능 확보 |
| 한국어 NLP | 공백 기반 어절 분리 | **MeCab-ko (KoNLPy)** | 최고속 한국어 형태소 분석 (Linux 프로덕션) |
| 비동기 처리 | BullMQ (Node.js) | **ARQ (Python async)** | Python async-native, 낮은 복잡도 |
| 문서 로딩 | LangChain.js 로더 | **pymupdf4llm + python-docx + pyhwp** | RAG 최적화 출력, HWP 직접 지원 |
| DB ORM | Prisma (Node.js) | **SQLAlchemy 2.0 + Alembic** | Python 표준 ORM |
| RAG 설계 | 미명시 | **유사도 탐지 특화 RAG** | Q&A가 아닌 Similarity Retrieval |

### 현재 프로젝트 상태

- **프론트엔드**: Next.js 16.1 + React 19 + TypeScript — UI 완성, Mock 데이터 연동
- **스타일링**: Tailwind CSS v4 + shadcn/ui (Base UI + HugeIcons)
- **백엔드**: 미구현 → FastAPI로 신규 개발 예정

---

## 2. 상용 솔루션 수준 보완 전략

### 핵심 보완 사항

| 구분 | 기존 (Basic) | **최종 (Commercial Grade)** |
|------|-------------|---------------------------|
| 검색 엔진 | Vector Only | **Hybrid (Dense + Sparse via BGE-M3)** |
| 사전 필터링 | 없음 | **MinHash/LSH (datasketch)** |
| 판정 기준 | 코사인 유사도만 | **6어절 연속 일치 (형태소 기반)** |
| HWP 지원 | 미지원 | **직접 지원 (pyhwp)** |
| 전처리 | 없음 | **인용구/목차/법령/참고문헌 자동 제외** |
| 시각화 | 단순 하이라이팅 | **Side-by-Side 좌우 대조 뷰어** |
| 점수 보정 | RRF 직접 사용 | **RRF로 후보 선택 → 코사인 유사도로 분류** |

### 3-Phase 표절 탐지 시스템

```
┌─────────────────────────────────────────────────────────────────┐
│                   표절 검사 3-Phase 시스템                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Phase 0: 사전 필터링 (MinHash/LSH)              ⚡ Fast       │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │  • datasketch MinHash로 문서 지문(fingerprint) 생성       │ │
│   │  • LSH 인덱스에서 Jaccard > 0.3인 후보 문서 필터링        │ │
│   │  • 1,000건 → ~50건으로 후보 축소 (ms 단위)               │ │
│   └───────────────────────────────────────────────────────────┘ │
│                           ↓                                      │
│   Phase 1: 물리적 표절 (Rule-based)               📏 Precise   │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │  • MeCab-ko 형태소 분석 → 정규화된 어절 추출               │ │
│   │  • difflib.SequenceMatcher로 연속 일치 구간 탐지          │ │
│   │  • 6어절 이상 연속 일치 → EXACT_COPY 판정                 │ │
│   └───────────────────────────────────────────────────────────┘ │
│                           +                                      │
│   Phase 2: 의미적 표절 (AI-based)                 🧠 Semantic   │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │  • BGE-M3 Dense+Sparse 임베딩 (FlagEmbedding)            │ │
│   │  • Qdrant Hybrid Search (RRF 기반 Dense+Sparse 결합)     │ │
│   │  • RRF로 후보 선택 → 코사인 유사도로 정밀 점수 산정      │ │
│   │  • 결과: SEMANTIC (의미 유사) 판정                         │ │
│   └───────────────────────────────────────────────────────────┘ │
│                           ↓                                      │
│   최종 판정: Phase 1과 Phase 2 중 더 높은 위험도 적용            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 시스템 아키텍처

Next.js (Frontend) + FastAPI (Backend) 분리 구조. Frontend는 Next.js Rewrite Proxy를 통해 Backend와 통신하며 CORS 없이 동작한다.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │ 문서 업로드  │  │ Side-by-Side│  │ 기존 문서 관리         │   │
│  │ (Dropzone)  │  │ 비교 뷰어   │  │ (등록/검색/삭제)      │   │
│  └─────────────┘  └─────────────┘  └───────────────────────┘   │
│                                                                  │
│  Next.js Rewrite Proxy: /api/backend/:path* → FastAPI           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI + Python)                      │
│                                                                  │
│  ┌──────────────── Document Processing Pipeline ──────────────┐ │
│  │                                                             │ │
│  │   File Router ── PDF  → pymupdf4llm (Markdown 출력)        │ │
│  │                ── DOCX → python-docx                        │ │
│  │                ── HWP  → pyhwp                              │ │
│  │                          │                                  │ │
│  │                          ▼                                  │ │
│  │   전처리 (인용구/목차/법령/참고문헌 제거)                     │ │
│  │                          │                                  │ │
│  │                          ▼                                  │ │
│  │   MeCab-ko 형태소 분석 → 한국어 문장 경계 인식               │ │
│  │                          │                                  │ │
│  │                          ▼                                  │ │
│  │   RecursiveCharacterTextSplitter (1000자, 200 오버랩)       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌──────────────── Indexing Pipeline ─────────────────────────┐ │
│  │                          │                                  │ │
│  │         ┌────────────────┼──────────────────┐              │ │
│  │         ▼                ▼                   ▼              │ │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐     │ │
│  │  │ BGE-M3     │  │ BGE-M3     │  │ MinHash 지문     │     │ │
│  │  │ Dense Vec  │  │ Sparse Vec │  │ (datasketch)     │     │ │
│  │  │ (1024 dim) │  │ (lexical)  │  │                  │     │ │
│  │  └────────────┘  └────────────┘  └──────────────────┘     │ │
│  │         │                │                   │              │ │
│  │         └────────┬───────┘                   │              │ │
│  │                  ▼                           ▼              │ │
│  │         ┌────────────────┐          ┌──────────────┐       │ │
│  │         │ Qdrant Hybrid  │          │ PostgreSQL   │       │ │
│  │         │ Vector Store   │          │ (MinHash+Meta)│      │ │
│  │         └────────────────┘          └──────────────┘       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌──────────────── Analysis Pipeline ─────────────────────────┐ │
│  │                                                             │ │
│  │  [Phase 0] MinHash LSH → 후보 문서 필터링                  │ │
│  │                    │                                        │ │
│  │         ┌──────────┼──────────┐                            │ │
│  │         ▼                     ▼                            │ │
│  │  [Phase 1]              [Phase 2]                          │ │
│  │  ┌───────────┐    ┌──────────────────┐                    │ │
│  │  │ MeCab-ko  │    │ Qdrant Hybrid    │                    │ │
│  │  │ + 6어절   │    │ Search (RRF)     │                    │ │
│  │  │ 일치 검사 │    │ → Cosine 점수    │                    │ │
│  │  └───────────┘    └──────────────────┘                    │ │
│  │         │                     │                            │ │
│  │         └──────────┬──────────┘                            │ │
│  │                    ▼                                        │ │
│  │         ┌──────────────────┐                               │ │
│  │         │ 최종 판정 결합   │                               │ │
│  │         │ max(P1, P2)     │                               │ │
│  │         └──────────────────┘                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│   Ollama   │ │   Qdrant   │ │ PostgreSQL │ │   Redis    │
│  (LLM만)   │ │  (Hybrid)  │ │ (메타데이터)│ │  (ARQ 큐)  │
│ qwen3-vl   │ │Dense+Sparse│ │ +MinHash   │ │            │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

---

## 4. 핵심 기술 스택

### Backend (FastAPI Python)

| 구분 | 기술 | 용도 |
|------|------|------|
| Framework | FastAPI + Uvicorn | 고성능 비동기 API 서버 |
| ORM | SQLAlchemy 2.0 + Alembic | DB 모델링 + 마이그레이션 |
| Validation | Pydantic v2 | 데이터 검증/직렬화 |
| Task Queue | ARQ + Redis | 대용량 비동기 처리 (async-native) |
| Config | pydantic-settings | 환경변수 관리 (.env) |

### 문서 처리

| 구분 | 기술 | 용도 |
|------|------|------|
| PDF | pymupdf4llm | RAG 최적화 Markdown 출력 (최고속) |
| DOCX | python-docx | DOCX 텍스트/구조 추출 |
| HWP | pyhwp (hwp5txt CLI) | HWP 바이너리 파일 직접 처리 |
| 청킹 | langchain-text-splitters | RecursiveCharacterTextSplitter |
| 한국어 NLP | MeCab-ko (KoNLPy) | 최고속 형태소 분석 (Linux, mecab-ko-dic) |

### 임베딩 & 검색

| 구분 | 기술 | 용도 |
|------|------|------|
| Embedding | FlagEmbedding (BGE-M3) | Dense + Sparse 동시 생성 (단일 forward pass) |
| Vector DB | Qdrant (Hybrid Mode) | RRF 기반 Dense+Sparse 동시 검색 |
| Near-Dup | datasketch | MinHash/LSH 사전 필터링 |
| LLM | Qwen3-VL (Ollama) | 메타데이터 추출, 선택적 판단 보조 |

### 분석 엔진

| 구분 | 기술 | 용도 |
|------|------|------|
| Text Diff | difflib (Python 표준) | SequenceMatcher 기반 연속 일치 탐지 |
| Rule Engine | 6어절 규칙 (형태소 기반) | 물리적 표절 판정 |
| Pipeline | LangChain (Python) | 문서 로딩/처리 파이프라인 오케스트레이션 |

### Frontend (기존 유지)

| 구분 | 기술 | 용도 |
|------|------|------|
| Framework | Next.js 16.1 (App Router) + React 19 | 프론트엔드 |
| UI | shadcn/ui + Tailwind CSS v4 | 컴포넌트/스타일링 |
| Diff Viewer | react-diff-viewer-continued | Side-by-Side 비교 |
| Data Fetching | @tanstack/react-query | API 호출/캐싱 |
| File Upload | react-dropzone | 드래그앤드롭 파일 업로드 |

---

## 5. 의존성 패키지

### Python (Backend)

| 카테고리 | 패키지 | 비고 |
|---------|--------|------|
| **Framework** | fastapi, uvicorn[standard], pydantic-settings | |
| **DB** | sqlalchemy[asyncio], alembic, asyncpg | PostgreSQL async 드라이버 |
| **문서 처리** | pymupdf4llm, python-docx, pyhwp | 3종 파일 형식 지원 |
| **LangChain** | langchain, langchain-community, langchain-text-splitters | 문서 처리 파이프라인 |
| **임베딩** | FlagEmbedding, qdrant-client | BGE-M3 + Qdrant |
| **한국어 NLP** | konlpy | + 시스템 패키지: mecab, mecab-ko-dic |
| **Near-Dup** | datasketch | MinHash/LSH |
| **작업 큐** | arq | Redis 기반 async 작업 큐 |
| **HTTP** | httpx | Ollama REST API 호출 |
| **파일 처리** | python-multipart, aiofiles | 파일 업로드/비동기 I/O |
| **로깅** | structlog | 구조화 로깅 |
| **테스트** | pytest, pytest-asyncio, httpx | 비동기 테스트 |

### Node.js (Frontend — 기존 유지)

| 패키지 | 용도 |
|--------|------|
| react-diff-viewer-continued | Side-by-Side diff |
| react-dropzone | 파일 업로드 |
| @tanstack/react-query | 데이터 페칭 |
| zod | 스키마 검증 |

---

## 6. 상세 설계 명세

### 6.1 프로젝트 구조

```
backend/
├── app/
│   ├── main.py                    # FastAPI 앱, lifespan, 미들웨어
│   ├── config.py                  # Pydantic Settings (환경변수)
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── documents.py       # 문서 CRUD API
│   │       ├── similarity.py      # 유사도 검사 API
│   │       └── health.py          # 헬스체크
│   │
│   ├── core/
│   │   ├── pipeline/
│   │   │   ├── loader.py          # 문서 로딩 (PDF/DOCX/HWP)
│   │   │   ├── preprocessor.py    # 전처리 (인용구/참고문헌 제거)
│   │   │   ├── chunker.py         # 텍스트 분할
│   │   │   └── embedder.py        # BGE-M3 임베딩 (FlagEmbedding)
│   │   │
│   │   ├── analysis/
│   │   │   ├── minhash.py         # Phase 0: MinHash/LSH 필터링
│   │   │   ├── six_word_rule.py   # Phase 1: 6어절 규칙 (MeCab-ko)
│   │   │   ├── semantic.py        # Phase 2: 의미적 유사도
│   │   │   └── judge.py           # 최종 판정 결합
│   │   │
│   │   └── rag/
│   │       ├── indexer.py         # 문서 인덱싱 파이프라인
│   │       └── retriever.py       # Hybrid Retriever
│   │
│   ├── db/
│   │   ├── session.py             # Async SQLAlchemy 세션
│   │   └── models.py              # SQLAlchemy 모델
│   │
│   ├── schemas/
│   │   ├── document.py            # Pydantic 요청/응답 스키마
│   │   └── similarity.py          # 검사 결과 스키마
│   │
│   ├── services/
│   │   ├── document_service.py    # 문서 관리 비즈니스 로직
│   │   ├── check_service.py       # 유사도 검사 오케스트레이터
│   │   └── vector_store.py        # Qdrant 벡터스토어 서비스
│   │
│   └── workers/
│       ├── settings.py            # ARQ 워커 설정
│       └── tasks.py               # 비동기 작업 (인덱싱/검사)
│
├── alembic/                       # DB 마이그레이션
│   └── versions/
├── tests/                         # 테스트
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── alembic.ini
├── requirements.txt
├── Dockerfile
└── pyproject.toml
```

### 6.2 애플리케이션 초기화

FastAPI의 `lifespan` 컨텍스트 매니저를 사용하여 앱 시작/종료 시 무거운 리소스를 관리한다.

**Startup 시 초기화할 리소스:**

| 리소스 | 저장 위치 | 설명 |
|--------|----------|------|
| Qdrant 클라이언트 | `app.state.qdrant` | `AsyncQdrantClient` — 벡터 DB 비동기 연결 |
| BGE-M3 모델 | `app.state.embedding_model` | `BGEM3FlagModel` — fp16 모드, ~2GB 메모리 |
| MeCab-ko 분석기 | `app.state.mecab` | `konlpy.tag.Mecab()` — 형태소 분석기 인스턴스 |
| MinHash 인덱스 | `app.state.minhash_index` | PostgreSQL에서 기존 지문 로딩 후 LSH 인덱스 재구축 |

**Shutdown 시 정리:** Qdrant 클라이언트 연결 해제

**미들웨어:**
- CORS: 개발 시 `localhost:3000` 허용 (프로덕션은 Rewrite Proxy로 우회)
- API 라우터: `/api/v1` 프리픽스로 버전 관리

### 6.3 환경 설정

`pydantic-settings`의 `BaseSettings`로 `.env` 파일 및 환경변수를 타입 안전하게 관리한다.

| 카테고리 | 설정 키 | 기본값 | 설명 |
|---------|---------|--------|------|
| **DB** | DATABASE_URL | postgresql+asyncpg://...localhost:5432/fund_dup | PostgreSQL 비동기 연결 |
| **Ollama** | OLLAMA_BASE_URL | http://localhost:11434 | LLM 서버 (임베딩 아님) |
| | LLM_MODEL | qwen3-vl | LLM 모델명 |
| **Qdrant** | QDRANT_URL | http://localhost:6333 | 벡터 DB |
| | QDRANT_COLLECTION | business_proposals | 컬렉션명 |
| **Redis** | REDIS_URL | redis://localhost:6379 | ARQ 작업 큐 |
| **Embedding** | EMBEDDING_MODEL | BAAI/bge-m3 | HuggingFace 모델 ID |
| | EMBEDDING_BATCH_SIZE | 32 | 배치 임베딩 크기 |
| **Storage** | UPLOAD_DIR | ./uploads | 업로드 파일 경로 |
| | MAX_FILE_SIZE | 10,485,760 (10MB) | 최대 파일 크기 |
| **Analysis** | MIN_CONSECUTIVE_WORDS | 6 | 연속 일치 최소 어절 수 |
| | MINHASH_THRESHOLD | 0.3 | MinHash 후보 Jaccard 임계값 |
| | SIMILARITY_TOP_K | 5 | Hybrid Search 반환 건수 |
| **App** | LOG_LEVEL | info | 로그 레벨 |

### 6.4 문서 처리 파이프라인

문서 처리는 4단계를 순차적으로 진행한다.

**Step 1: 문서 로딩**

파일 확장자에 따라 적절한 로더를 자동 선택한다.

| 형식 | 로더 | 출력 형태 | 특이사항 |
|------|------|----------|---------|
| PDF | pymupdf4llm | Markdown 텍스트 | 표, 이미지 캡션 등 구조 보존. AGPL 라이선스 주의 |
| DOCX | python-docx | 플레인 텍스트 | 문단 단위 추출, 빈 문단 제외 |
| HWP | pyhwp (hwp5txt) | 플레인 텍스트 | CLI 서브프로세스 호출, HWP5 바이너리 형식 |

**Step 2: 전처리 (지능형 필터링)**

표절 검사에서 제외해야 할 영역을 정규식으로 제거한다.

| 제거 대상 | 제거 방식 | 이유 |
|----------|----------|------|
| 참고문헌/Bibliography | "참고문헌" 이후 전체 삭제 | 인용은 표절이 아님 |
| 법령 표기 | `제N조(의N)`, `[법 제N조]` 패턴 | 공통 법률 문구 |
| 인용구 | 큰따옴표/작은따옴표 내부 텍스트 | 직접 인용 |
| 목차 | `N. 제목...숫자` 패턴 | 구조적 요소 |
| 인라인 인용 | `[1]`, `【1】`, `(2024)` | 참조 번호 |
| 페이지 번호 | 숫자만 있는 행 | 레이아웃 요소 |

**Step 3: 한국어 문장 경계 인식**

MeCab-ko 형태소 분석 결과를 활용하여 문장 경계를 인식한다. 한국어 종결어미 패턴(`다`, `요`, `함`, `임`, `음`, `됨`, `짐`)을 기반으로 문장을 분리한다.

**Step 4: 텍스트 청킹**

LangChain의 `RecursiveCharacterTextSplitter`를 사용한다.

| 파라미터 | 값 | 이유 |
|---------|-----|------|
| chunk_size | 1,000자 | 한국어 1,000자 ≈ 영어 2,000~3,000자 (정보 밀도 높음) |
| chunk_overlap | 200자 | 문맥 연속성 보장 |
| separators | `\n\n`, `\n`, `. `, ` ` | 한국어 문단 구조 우선 분리 |

### 6.5 BGE-M3 임베딩 전략

#### Ollama vs FlagEmbedding 비교

| 기능 | Ollama | **FlagEmbedding** |
|------|--------|-------------------|
| Dense 벡터 | O (1024차원) | **O (1024차원)** |
| Sparse 벡터 | **X (미지원)** | **O (lexical weights)** |
| ColBERT 벡터 | X | O (선택 사용) |
| Hybrid Search | **불가** | **완전 지원** |

Ollama는 Dense 벡터만 생성할 수 있으므로 Hybrid Search에 필수적인 Sparse 벡터를 얻을 수 없다. 따라서 임베딩은 **FlagEmbedding(BGE-M3)**으로, LLM은 **Ollama(Qwen3-VL)**로 역할을 분리한다.

#### 임베딩 생성 방식

- BGE-M3의 `encode()` 메서드 한 번의 forward pass로 Dense + Sparse 벡터를 동시 생성
- ColBERT 벡터는 성능 대비 메모리 비용이 높아 비활성화 (`return_colbert_vecs=False`)
- fp16 모드로 메모리 사용량 절감 (약 2GB)
- FlagEmbedding은 동기(synchronous) 라이브러리이므로 `asyncio.run_in_executor`로 thread pool에 위임하여 비동기 래핑
- 배치 크기 32로 처리 (GPU 없이도 동작)

#### Sparse 벡터 구조

BGE-M3의 Sparse 출력은 `dict[int, float]` 형태 (token_id → lexical weight). Qdrant 업로드 시 `SparseVector(indices=[...], values=[...])`로 변환 필요.

### 6.6 Qdrant Hybrid 벡터 저장소

#### Collection 설정

| 벡터 종류 | 이름 | 설정 |
|----------|------|------|
| Dense | `dense` | 1024차원, Cosine distance, on_disk=True (대용량 대응) |
| Sparse | `sparse` | IDF modifier 적용 (빈도 기반 가중치 보정) |

#### Payload 인덱스

검색 성능을 위해 자주 필터링하는 필드에 인덱스를 생성한다.

| 필드 | 타입 | 용도 |
|------|------|------|
| document_id | KEYWORD | 자기 자신 제외 필터링 |
| category | KEYWORD | 카테고리별 검색 |

#### 저장되는 Payload

| 필드 | 설명 |
|------|------|
| document_id | 문서 고유 ID |
| chunk_index | 문서 내 청크 순서 |
| content | 청크 텍스트 원문 |
| filename | 원본 파일명 |
| category | 문서 분류 (선택) |

#### 배치 업로드

대량 인덱싱 시 100개 단위로 `upsert` 배치 처리하여 메모리 안정성을 확보한다.

### 6.7 Phase 0 — MinHash 사전 필터링

대규모 문서(1,000건+)에서 후보를 빠르게 좁히는 사전 필터링 단계.

**알고리즘:**

1. MeCab-ko POS 태깅으로 실질 형태소(명사/동사/형용사) 추출
2. 추출된 형태소로 n-gram 셋(shingles) 생성 (n=3)
3. datasketch MinHash로 문서 지문(fingerprint) 생성 (num_perm=128)
4. LSH 인덱스에 등록/쿼리하여 Jaccard similarity > 0.3인 후보 반환

**핵심 설계 결정:**

| 항목 | 값 | 이유 |
|------|-----|------|
| Shingle 크기 | 3-gram | 형태소 기반이므로 3-gram이면 충분한 문맥 포착 |
| MinHash 순열 수 | 128 | 속도-정확도 균형 (256은 더 정확하지만 느림) |
| LSH 임계값 | 0.3 | 낮게 설정하여 후보를 넓게 확보 (정밀도는 Phase 1/2에서) |
| 형태소 필터 | N*(명사), V*(동사), M*(부사) | 조사/어미 제외로 의미 중심 비교 |

**성능:** 1,000건 문서에서 후보 필터링은 ms 단위로 완료. O(1) 시간복잡도.

**MinHash 지문 관리:** 문서 등록 시 MinHash 시그니처를 PostgreSQL에 JSONB로 저장. 앱 시작 시 전체 지문을 로딩하여 인메모리 LSH 인덱스 재구축.

### 6.8 Phase 1 — 6어절 규칙 검사

교육부 표절 가이드라인에 근거한 물리적 표절 탐지. 6어절 이상 연속 일치 시 `EXACT_COPY`로 판정.

**알고리즘:**

1. MeCab-ko 형태소 분석으로 실질 형태소 추출 (명사, 동사, 형용사, 어근)
2. `difflib.SequenceMatcher`로 두 텍스트의 최장 공통 부분 수열(LCS) 블록 탐색
3. 연속 일치 블록 중 6어절 이상인 구간을 `EXACT_COPY`로 판정

**기존 방식 대비 개선점:**

| 구분 | v1 (공백 기반) | **v2 (형태소 기반)** |
|------|-------------|-------------------|
| 토큰화 | 공백으로 분리 | MeCab-ko 형태소 분석 |
| 조사 변형 | 다른 어절로 인식 | 동일 어근으로 정규화 |
| 어미 변형 | 다른 어절로 인식 | 동일 동사로 정규화 |
| 정확도 | 조사/어미에 취약 | 의미 단위 비교로 정밀 |

**분석 기능:**

- `check()`: 최장 연속 일치 구간 1개 반환 (빠른 판정용)
- `find_all_matches()`: 4어절 이상 모든 일치 구간 반환 (상세 분석용, Side-by-Side 뷰어 증거 제공)

**반환 정보:** 일치 여부, 일치 텍스트, 어절 수, 소스 텍스트 내 시작/종료 인덱스

### 6.9 Phase 2 — Hybrid Search + 코사인 보정

의미적 표절을 탐지하는 AI 기반 분석. Qdrant의 Hybrid Search(RRF)로 후보를 선택한 뒤, 실제 코사인 유사도를 재계산하여 등급을 판정한다.

**핵심 설계 결정: RRF 점수 vs 코사인 유사도**

| | RRF 점수 | **코사인 유사도** |
|---|---------|-----------------|
| 특성 | 순위(rank) 기반 | 절대적 거리 기반 |
| 범위 | 0~1이지만 상대적 | 0~1 절대 스케일 |
| 용도 | **후보 선택 (ranking)** | **등급 분류 (classification)** |
| 임계값 적용 | 부적합 | **적합** |

RRF 점수는 순위에 기반하므로 문서 수에 따라 값이 달라진다. 따라서 등급 분류에는 부적합하며, 반드시 코사인 유사도를 재계산해야 한다.

**검색 흐름:**

1. 쿼리 청크의 Dense + Sparse 벡터 생성
2. Qdrant `query_points`로 Hybrid Search 실행
   - Prefetch: Dense top_k×4건 + Sparse top_k×4건 (충분한 후보 확보)
   - Fusion: RRF로 Dense+Sparse 결과 결합
   - Limit: top_k건 반환
3. 자기 자신 문서 필터링 (`must_not` 필터)
4. 반환된 결과에서 Dense 벡터를 함께 가져와 (`with_vectors={"dense": True}`)
5. 쿼리 벡터와 결과 벡터의 코사인 유사도 직접 계산 (`np.dot / norm`)

**반환 정보:** document_id, filename, chunk_index, content, rrf_score(참고용), cosine_score(분류용)

### 6.10 최종 판정 결합

Phase 1(Rule-based)과 Phase 2(AI-based) 결과를 결합하여 **더 높은 위험도**를 적용한다.

**판정 로직:**

| Phase 1 결과 | Phase 2 결과 | 최종 판정 | 점수 |
|-------------|-------------|----------|------|
| 6어절 일치 (O) | 무관 | `EXACT_COPY` | 1.0 (강제) |
| 6어절 일치 (X) | cosine ≥ 0.70 | `SEMANTIC` | cosine 값 |
| 6어절 일치 (X) | cosine < 0.70 | `CLEAN` | cosine 값 |

**문서 전체 유사도 산정:**

문단 길이 가중 평균을 사용한다. 긴 문단의 유사도가 전체 점수에 더 큰 영향을 미친다.

```
전체 유사도 = Σ(청크 점수 × 청크 길이) / Σ(청크 길이)
```

### 6.11 통합 검사 흐름

유사도 검사 전체 플로우는 `check_service.py`가 오케스트레이션한다.

```
1. 문서 로딩 (File Router)
          │
2. 전처리 (clean_text)
          │
3. 텍스트 청킹 (split_text)
          │
4. Phase 0: MinHash 후보 필터링
          │  (전체 문서 텍스트 → 후보 doc_ids)
          │
5. BGE-M3 임베딩 생성 (청크별 Dense+Sparse)
          │
6. 청크별 반복:
   ├── Phase 2: Hybrid Search (후보 매치 반환)
   ├── Phase 1: 각 매치와 6어절 규칙 검사
   └── 최종 판정 (EXACT_COPY > SEMANTIC > CLEAN)
          │
7. 전체 문서 판정 결합
   ├── 전체 유사도 (가중 평균)
   ├── 문서 등급 (DANGER / WARNING / SAFE)
   └── 통계 (EXACT_COPY 수, SEMANTIC 수, CLEAN 수)
```

---

## 7. API 명세

### 유사도 검사

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/similarity/check` | 동기 유사도 검사 (파일 업로드) |
| POST | `/api/v1/similarity/check/async` | 비동기 유사도 검사 (ARQ 큐 등록, 대용량용) |
| GET | `/api/v1/similarity/check/status/{job_id}` | 비동기 작업 상태/결과 조회 |

**POST /similarity/check 요청:** `multipart/form-data` — `file` (PDF/DOCX/HWP)

**POST /similarity/check 응답:**

| 필드 | 타입 | 설명 |
|------|------|------|
| overall_similarity | float | 전체 문서 유사도 (0.0~1.0) |
| overall_grade | string | DANGER / WARNING / SAFE |
| statistics.total_chunks | int | 총 청크 수 |
| statistics.exact_copy_count | int | EXACT_COPY 판정 청크 수 |
| statistics.semantic_count | int | SEMANTIC 판정 청크 수 |
| statistics.clean_count | int | CLEAN 판정 청크 수 |
| chunks[] | array | 청크별 상세 결과 |
| chunks[].index | int | 청크 순서 |
| chunks[].content | string | 청크 텍스트 (200자 미리보기) |
| chunks[].similarity | float | 최고 유사도 점수 |
| chunks[].grade | string | very_high / high / medium / low |
| chunks[].type | string | EXACT_COPY / SEMANTIC / CLEAN |
| chunks[].matches[] | array | 매칭된 기존 문서 정보 (최대 3건) |

### 문서 관리

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/documents` | 기존 문서 등록 (인덱싱) |
| POST | `/api/v1/documents/batch` | 배치 문서 등록 (ARQ 비동기) |
| GET | `/api/v1/documents` | 문서 목록 조회 (페이지네이션) |
| GET | `/api/v1/documents/{id}` | 문서 상세 조회 |
| DELETE | `/api/v1/documents/{id}` | 문서 삭제 (DB + 벡터스토어 + 파일) |

### 시스템

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/health` | 서비스 상태 확인 (DB, Qdrant, Redis, Ollama) |

### 공통 응답 형식

- **성공:** `{ "success": true, "data": {...} }`
- **에러:** `{ "success": false, "error": { "code": "...", "message": "...", "detail": "..." } }`
- **비동기:** `{ "success": true, "job_id": "...", "status": "queued" }`

### 파일 업로드 검증

| 항목 | 규칙 |
|------|------|
| 허용 확장자 | .pdf, .docx, .hwp |
| 최대 크기 | 10MB |
| MIME 검증 | Content-Type 확인 |

---

## 8. 데이터베이스 설계

### ER 다이어그램

```
┌─────────────────────────────────┐
│           documents             │
├─────────────────────────────────┤
│ id (PK)           VARCHAR       │
│ filename           VARCHAR       │
│ file_type          ENUM          │ ← PDF / DOCX / HWP
│ file_path          VARCHAR       │
│ file_size          INTEGER       │
│ status             ENUM          │ ← PENDING / PROCESSING / COMPLETED / ERROR
│ total_paragraphs   INTEGER       │
│ error_message      TEXT          │
│ category           VARCHAR       │
│ is_reference       BOOLEAN       │ ← 참조 문서 여부
│ minhash_signature  JSONB         │ ← MinHash 지문
│ created_at         TIMESTAMP     │
│ updated_at         TIMESTAMP     │
└───────────────┬─────────────────┘
                │ 1:N
                ▼
┌─────────────────────────────────┐
│         check_results           │
├─────────────────────────────────┤
│ id (PK)           VARCHAR       │
│ document_id (FK)   VARCHAR       │ → documents.id (CASCADE)
│ overall_rate       FLOAT         │
│ overall_grade      VARCHAR       │ ← DANGER / WARNING / SAFE
│ statistics         JSONB         │ ← {total_chunks, exact_copy_count, ...}
│ detail_json        JSONB         │ ← 청크별 상세 결과
│ created_at         TIMESTAMP     │
└─────────────────────────────────┘
```

### 인덱스 전략

| 테이블 | 인덱스 | 용도 |
|--------|--------|------|
| documents | ix_documents_status | 상태별 조회 |
| documents | ix_documents_is_reference | 참조 문서 필터링 |
| documents | ix_documents_created_at | 최신순 정렬 |
| check_results | ix_check_results_document_id | 문서별 검사 결과 조회 |

### MinHash 지문 저장

MinHash 시그니처(128개 해시값 배열)를 JSONB 컬럼에 저장한다. 앱 시작 시 `SELECT id, minhash_signature FROM documents WHERE is_reference = true`로 전체 지문을 로딩하여 인메모리 LSH 인덱스를 재구축한다.

---

## 9. 인프라 구성

### Docker Compose 서비스

| 서비스 | 이미지 | 포트 | 용도 | 볼륨 |
|--------|--------|------|------|------|
| **frontend** | (빌드) | 3000 | Next.js 프론트엔드 | - |
| **backend** | (빌드) | 8000 | FastAPI 백엔드 | uploads, model_cache |
| **arq-worker** | (빌드) | - | ARQ 비동기 작업 처리 | uploads, model_cache |
| **ollama** | ollama/ollama:latest | 11434 | LLM (qwen3-vl만) | ollama_data |
| **qdrant** | qdrant/qdrant:latest | 6333, 6334 | Hybrid Vector DB | qdrant_data |
| **postgres** | postgres:16 | 5432 | 메타데이터 + MinHash | pg_data |
| **redis** | redis:7-alpine | 6379 | ARQ 작업 큐 | - |

### 서비스 의존관계

```
frontend → backend → postgres, qdrant, redis, ollama
arq-worker → postgres, qdrant, redis, ollama
```

### Backend Dockerfile 핵심

- **베이스 이미지:** `python:3.12-slim`
- **시스템 의존성:** `mecab`, `libmecab-dev`, `build-essential`
- **한국어 사전:** mecab-ko-dic 2.1.1 소스 빌드 (autogen → configure → make → install)
- **모델 캐시:** `/root/.cache` 볼륨 마운트로 BGE-M3 모델 재다운로드 방지
- **실행:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Ollama 모델 초기화

인프라 최초 실행 후 수동으로 모델을 다운로드해야 한다.

| 모델 | 용도 | 명령 |
|------|------|------|
| qwen3-vl | LLM (메타데이터 추출, 선택적 판단) | `docker exec -it ollama ollama pull qwen3-vl` |

> **참고:** BGE-M3 임베딩은 Ollama가 아닌 FlagEmbedding(HuggingFace)에서 자동 다운로드된다.

---

## 10. Frontend-Backend 연동

### Rewrite Proxy

Next.js의 `rewrites` 설정으로 프론트엔드 요청을 FastAPI로 프록시한다.

| Frontend 경로 | Backend 경로 | 설명 |
|--------------|-------------|------|
| `/api/backend/:path*` | `http://backend:8000/api/v1/:path*` | 모든 API 요청 프록시 |

이 방식의 장점:
- CORS 설정 불필요 (동일 도메인)
- 프론트엔드에서 상대 경로로 API 호출
- Docker 내부 네트워크로 통신 (외부 노출 없음)

### 프론트엔드 API 호출 변경

현재 Mock 데이터를 사용하는 부분을 `@tanstack/react-query`를 통해 실제 API 호출로 전환한다.

| 페이지 | Mock → API |
|--------|-----------|
| 문서 업로드 | 로컬 파일 처리 → `POST /api/backend/similarity/check` |
| 검사 결과 | 하드코딩 JSON → `GET /api/backend/similarity/check/status/{id}` |
| 문서 관리 | 빈 배열 → `GET /api/backend/documents` |

### SSE (Server-Sent Events) 실시간 진행 상태

대용량 문서 검사 시 프론트엔드에 실시간 진행 상태를 전송한다.

| 이벤트 | 데이터 | 시점 |
|--------|--------|------|
| `progress` | `{ phase, current, total, percent }` | 각 Phase 진행 시 |
| `complete` | `{ result }` | 검사 완료 시 |
| `error` | `{ message }` | 에러 발생 시 |

---

## 11. 성능 목표

### 응답 시간 목표

| 작업 | 목표 | 비고 |
|------|------|------|
| 단일 문서 유사도 검사 | < 30초 | 10페이지 기준 |
| Hybrid Search (단일 쿼리) | < 500ms | Qdrant 응답 |
| MinHash 후보 필터링 | < 100ms | 1,000건 기준 |
| 문서 로딩 + 전처리 | < 5초 | PDF 10페이지 기준 |
| 배치 임베딩 (32건) | < 10초 | CPU 기준 |

### 처리량 목표

| 작업 | 목표 | 비고 |
|------|------|------|
| 1,000건 문서 일괄 인덱싱 | < 1시간 | ARQ 배치 처리 |
| 동시 검사 요청 | 5건 | ARQ Worker 동시성 |

### 리소스 사용량

| 리소스 | 예상 사용량 | 비고 |
|--------|-----------|------|
| BGE-M3 모델 메모리 | ~2GB | fp16 모드 |
| MeCab-ko 사전 | ~100MB | mecab-ko-dic |
| Qdrant 스토리지 (1,000건) | ~500MB | Dense(1024) + Sparse + Payload |
| PostgreSQL | < 100MB | 메타데이터 + MinHash 지문 |

### 최적화 전략

| 전략 | 적용 대상 | 효과 |
|------|----------|------|
| fp16 모드 | BGE-M3 | 메모리 50% 절감, 속도 유지 |
| 배치 임베딩 | 임베딩 생성 | 개별 처리 대비 5~10x 빠름 |
| Qdrant on_disk | Dense 벡터 | 메모리 사용 절감 (대용량) |
| MinHash 사전 필터링 | 검색 범위 | 1,000건 → ~50건 축소 |
| Prefetch 확장 (top_k×4) | Hybrid Search | 더 많은 후보에서 정밀 RRF 결합 |
| 배치 upsert (100건) | Qdrant 인덱싱 | 네트워크 왕복 최소화 |

---

## 12. 에러 처리 및 복구 전략

### 문서 처리 에러

| 에러 상황 | 대응 방식 |
|----------|----------|
| PDF 파싱 실패 | pymupdf4llm 실패 시 에러 메시지와 함께 문서 상태를 ERROR로 변경 |
| HWP 변환 실패 | hwp5txt 프로세스 타임아웃(30초) 설정, 실패 시 사용자에게 DOCX 변환 안내 |
| DOCX 손상 파일 | python-docx 예외 캐치, 상세 에러 메시지 반환 |
| 빈 텍스트 추출 | 전처리 후 텍스트가 비어있으면 "유효한 텍스트 없음" 에러 |

### 외부 서비스 에러

| 서비스 | 에러 상황 | 대응 방식 |
|--------|---------|----------|
| Qdrant | 연결 실패 | 시작 시 헬스체크, 요청 시 3회 재시도 (exponential backoff) |
| PostgreSQL | 연결 실패 | SQLAlchemy 연결 풀 자동 재연결 |
| Redis | 연결 실패 | ARQ 작업 큐잉 실패 → 동기 실행으로 fallback |
| Ollama | 모델 응답 없음 | 타임아웃 60초, LLM 단계는 선택적 (없어도 검사 가능) |

### ARQ 작업 에러

| 상황 | 대응 방식 |
|------|----------|
| 작업 실패 | 최대 3회 재시도, 실패 시 문서 상태 ERROR + 에러 메시지 저장 |
| 워커 비정상 종료 | Redis에 작업 상태 유지, 워커 재시작 시 미완료 작업 재처리 |
| 타임아웃 | 작업별 최대 실행 시간 10분, 초과 시 강제 종료 + ERROR 상태 |

---

## 13. 테스트 전략

### 단위 테스트

| 모듈 | 테스트 항목 | 프레임워크 |
|------|-----------|-----------|
| preprocessor | 각 전처리 규칙(참고문헌, 법령, 인용구 등) 개별 검증 | pytest |
| six_word_rule | 6어절 일치 탐지 정확도 (한국어 테스트 데이터) | pytest |
| minhash | MinHash 지문 생성 및 후보 필터링 정확도 | pytest |
| judge | 판정 로직 (점수→등급, Phase 1+2 결합, 문서 등급) | pytest |
| embedder | BGE-M3 Dense+Sparse 벡터 생성 형태 검증 | pytest |

### 통합 테스트

| 테스트 | 범위 | 필요 서비스 |
|--------|------|-----------|
| 문서 등록 E2E | 파일 업로드 → 로딩 → 전처리 → 임베딩 → Qdrant 인덱싱 | PostgreSQL, Qdrant |
| 유사도 검사 E2E | 파일 업로드 → 3-Phase 분석 → 결과 반환 | 전체 |
| API 통합 | 각 API 엔드포인트 요청/응답 검증 | 전체 |

### 정확도 벤치마크

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| Precision | 표절 판정 건 중 실제 표절 비율 | ≥ 0.80 |
| Recall | 실제 표절 건 중 탐지 비율 | ≥ 0.85 |
| F1 Score | Precision과 Recall의 조화 평균 | ≥ 0.82 |

**테스트 데이터 구성:** 기존 사업계획서 50건 + 의도적 변형본(동의어 치환, 순서 변경, 부분 복사) 20건

### 성능 테스트

| 테스트 | 시나리오 | 측정 항목 |
|--------|---------|----------|
| 단일 문서 | 10페이지 PDF 검사 | 응답 시간, 메모리 사용량 |
| 배치 처리 | 100건 동시 인덱싱 | 총 처리 시간, 실패율 |
| 부하 | 5건 동시 검사 요청 | 응답 시간 분포, 에러율 |

---

## 14. 보안 고려사항

### 파일 업로드 보안

| 위협 | 대응 |
|------|------|
| 악성 파일 업로드 | 확장자 + MIME 타입 이중 검증 |
| 대용량 파일 DoS | 10MB 크기 제한, 스트리밍 읽기 |
| 경로 탐색 (Path Traversal) | UUID 기반 파일명 생성, 업로드 디렉토리 격리 |
| 파일 실행 공격 | 업로드 디렉토리 실행 권한 제거 |

### API 보안

| 위협 | 대응 | 구현 시점 |
|------|------|----------|
| 인증 미비 | JWT 기반 인증 미들웨어 | Phase 6 (향후) |
| Rate Limiting | slowapi 또는 Redis 기반 제한 | Phase 5 |
| 입력 검증 | Pydantic 스키마 검증 | Phase 4 |

### 데이터 보안

| 대상 | 보호 방식 |
|------|----------|
| 업로드 파일 | 서버 파일 시스템 격리, 삭제 시 물리 삭제 |
| DB 자격증명 | 환경변수, Docker Secrets (프로덕션) |
| API 키/토큰 | `.env` 파일, `.gitignore`에 추가 |

---

## 15. 배포 전략

### Docker 이미지 최적화

| 전략 | 효과 |
|------|------|
| Multi-stage 빌드 | 빌드 도구 제외, 최종 이미지 경량화 |
| `.dockerignore` | 불필요한 파일 제외 (tests, docs, .git) |
| 레이어 캐싱 | `requirements.txt` 변경 시만 pip install 재실행 |
| slim 베이스 이미지 | python:3.12-slim 사용 |

### 모델 캐싱

| 모델 | 캐시 위치 | 크기 | 전략 |
|------|----------|------|------|
| BGE-M3 | `/root/.cache/huggingface` | ~2GB | Docker 볼륨(`model_cache`)으로 영속화 |
| mecab-ko-dic | `/usr/local/lib/mecab/dic` | ~100MB | Dockerfile 빌드 시 설치 (이미지에 포함) |

### 환경별 설정

| 환경 | DB | Qdrant | 특이사항 |
|------|-----|--------|---------|
| **개발 (dev)** | localhost:5432 | localhost:6333 | Docker Compose로 로컬 실행 |
| **스테이징** | Docker 내부 네트워크 | Docker 내부 | 프로덕션 동일 구성 테스트 |
| **프로덕션** | Docker 내부 네트워크 | Docker 내부 | 볼륨 백업, 리소스 제한 설정 |

### 백업 전략

| 대상 | 방식 | 주기 |
|------|------|------|
| PostgreSQL | pg_dump 자동 백업 | 일 1회 |
| Qdrant | 스냅샷 API | 주 1회 |
| 업로드 파일 | 볼륨 백업 | 일 1회 |

---

## 16. 구현 로드맵

### Phase 1: 인프라 & 기반 구축 (1주)

| 작업 | 산출물 |
|------|--------|
| FastAPI 프로젝트 초기화 (구조, pyproject.toml, requirements.txt) | backend/ 디렉토리 |
| Docker Compose 업데이트 (backend + arq-worker 추가) | compose.yaml |
| Backend Dockerfile (MeCab-ko 포함) | backend/Dockerfile |
| SQLAlchemy 모델 + Alembic 초기 마이그레이션 | db/models.py, alembic/ |
| Qdrant Hybrid Collection 초기화 스크립트 | rag/indexer.py |
| Next.js Rewrite Proxy 설정 | next.config.ts |
| 헬스체크 API | api/v1/health.py |

**완료 기준:** `docker compose up`으로 전체 서비스 실행, `GET /api/v1/health`에서 모든 서비스 정상 응답

**위험 요소:**
- MeCab-ko Docker 빌드 실패 → mecab-ko-dic 소스 미러 사전 확보
- BGE-M3 모델 다운로드 시간 → model_cache 볼륨으로 1회만 다운로드

### Phase 2: 문서 처리 파이프라인 (1~2주)

| 작업 | 산출물 |
|------|--------|
| PDF 로더 (pymupdf4llm) | pipeline/loader.py |
| DOCX 로더 (python-docx) | pipeline/loader.py |
| HWP 로더 (pyhwp) | pipeline/loader.py |
| 전처리 모듈 (인용구/참고문헌/법령/목차 제거) | pipeline/preprocessor.py |
| MeCab-ko 형태소 분석 연동 | 공통 유틸리티 |
| 텍스트 청킹 (RecursiveCharacterTextSplitter) | pipeline/chunker.py |
| BGE-M3 Dense+Sparse 임베딩 모듈 | pipeline/embedder.py |
| 문서 등록 API (업로드 → 인덱싱) | api/v1/documents.py |

**의존관계:** Phase 1 완료 필수

**완료 기준:** PDF/DOCX/HWP 파일을 업로드하면 전처리된 청크가 Qdrant에 인덱싱되고, PostgreSQL에 메타데이터 저장

**위험 요소:**
- pyhwp HWP 파싱 실패 → HWP5 이외 형식은 미지원 명시
- pymupdf4llm AGPL 라이선스 → 상용 배포 시 대안(pdfplumber) 검토

### Phase 3: 3-Phase 분석 엔진 (2주)

| 작업 | 산출물 |
|------|--------|
| Phase 0: MinHash 지문 생성 + LSH 인덱스 | analysis/minhash.py |
| Phase 1: 6어절 규칙 검사 (MeCab-ko + difflib) | analysis/six_word_rule.py |
| Phase 2: Hybrid Search + 코사인 보정 | rag/retriever.py |
| 3-Phase 결과 결합 판정 로직 | analysis/judge.py |
| 통합 검사 오케스트레이터 | services/check_service.py |
| 유사도 검사 API | api/v1/similarity.py |
| 정확도 벤치마크 테스트 | tests/benchmark/ |

**의존관계:** Phase 2 완료 필수

**완료 기준:**
- 테스트 문서 쌍으로 정확도 검증 (Precision ≥ 0.8)
- 6어절 일치 문서 → EXACT_COPY 정확 탐지
- 의미적 유사 문서 → SEMANTIC 탐지

**위험 요소:**
- RRF 점수와 코사인 유사도 간 불일치 → 반드시 코사인 재계산 구현
- 한국어 형태소 분석 품질 → MeCab-ko 사전 버전(mecab-ko-dic 2.1.1) 고정

### Phase 4: API 완성 & 프론트엔드 연동 (1~2주)

| 작업 | 산출물 |
|------|--------|
| 문서 목록/상세/삭제 API | api/v1/documents.py |
| 배치 문서 등록 API | api/v1/documents.py |
| 비동기 검사 API + 상태 조회 | api/v1/similarity.py |
| Pydantic 요청/응답 스키마 | schemas/ |
| Next.js Mock 데이터 → 실제 API 호출 전환 | 프론트엔드 수정 |
| @tanstack/react-query 연동 | 프론트엔드 수정 |

**의존관계:** Phase 3 완료 필수

**완료 기준:** 프론트엔드에서 파일 업로드 → 실제 분석 → 결과 시각화까지 E2E 동작

### Phase 5: 대용량 처리 & 최적화 (1주)

| 작업 | 산출물 |
|------|--------|
| ARQ Worker 설정 + 비동기 작업 처리 | workers/ |
| 배치 임베딩 최적화 (배치 크기 조정) | pipeline/embedder.py |
| SSE 실시간 진행 상태 전송 | api/v1/similarity.py |
| Qdrant 인덱스 튜닝 | - |
| Rate Limiting | 미들웨어 |
| 성능 테스트 (1,000건 배치) | tests/performance/ |

**의존관계:** Phase 4 완료 필수

**완료 기준:** 1,000건 배치 인덱싱 < 1시간, 동시 5건 검사 시 30초 이내 응답

### Phase 6: 고급 기능 (향후)

| 작업 | 설명 |
|------|------|
| LLM 기반 표절/인용 판단 | RAG Chain + Qwen3-VL로 맥락 기반 판단 |
| PDF 이미지/표 유사도 | Vision-Language 모델 활용 |
| Cross-encoder Re-ranking | BGE-reranker-v2-m3로 Top-K 정밀 재정렬 |
| 검사 보고서 자동 생성 | PDF 보고서 출력 |
| 사용자 커스텀 규칙 | 임계값/규칙 사용자 설정 |
| HWPX 지원 | python-hwpx로 XML 기반 HWPX 형식 추가 |
| JWT 인증/인가 | API 접근 제어 |

---

## 17. 표절 판정 기준

### 유사도 등급

| 유사도 점수 | 등급 | 색상 | 의미 |
|------------|------|------|------|
| 6어절+ 일치 | `EXACT_COPY` | 빨강 | 물리적 복사 (표절 확정) |
| ≥ 0.85 | `very_high` | 빨강 | 표절 강력 의심 |
| 0.70 ~ 0.85 | `high` | 주황 | 높은 유사도 (말 바꾸기 의심) |
| 0.50 ~ 0.70 | `medium` | 노랑 | 중간 유사도 |
| < 0.50 | `low` | 녹색 | 낮은 유사도 |

### 전체 문서 판정

| 상태 | 조건 | 의미 |
|------|------|------|
| `DANGER` | EXACT_COPY 1개 이상 | 물리적 표절 발견 |
| `WARNING` | 전체 유사도 ≥ 50% | 의미적 표절 의심 |
| `SAFE` | 그 외 | 표절 가능성 낮음 |

### 점수 산정 주의사항

- **RRF 점수**는 순위 기반이므로 등급 분류에 직접 사용하지 않는다 (참고용)
- **코사인 유사도**로 등급을 분류한다 (RRF로 후보 선택 → 코사인 재계산)
- **6어절 일치** 시 점수를 1.0으로 강제 설정한다 (최고 위험도)
- **전체 유사도**는 청크 길이 가중 평균으로 산정한다

---

## 18. 라이선스 호환성

| 컴포넌트 | 라이선스 | 상용 사용 |
|----------|---------|-----------|
| FastAPI | MIT | OK |
| KoNLPy + MeCab-ko | GPL v3 / BSD (MeCab) | OK (서버사이드, Docker 내부) |
| BGE-M3 (FlagEmbedding) | MIT | OK |
| Qdrant | Apache 2.0 | OK |
| datasketch | MIT | OK |
| LangChain | MIT | OK |
| **pymupdf4llm** | **AGPL** | **주의 필요** |
| python-docx | MIT | OK |
| pyhwp | MIT | OK |
| difflib | PSF (표준) | OK |
| SQLAlchemy | MIT | OK |

> **주의:** pymupdf4llm은 AGPL 라이선스. 상용 배포 시 PyMuPDF 상용 라이선스 구매 또는 대안(pdfplumber 등) 검토 필요.

---

## 19. 주요 고려사항

### BGE-M3 vs Ollama 임베딩

Ollama는 Dense 벡터만 생성 가능하여 Hybrid Search에 필수적인 Sparse 벡터를 제공하지 못한다. FlagEmbedding(BGE-M3)은 단일 forward pass로 Dense + Sparse + ColBERT를 동시 생성한다. 따라서 **임베딩은 FlagEmbedding, LLM은 Ollama로 역할을 분리**한다.

### 대용량 처리 (1,000건+)

- MinHash 사전 필터링으로 1,000건 → ~50건으로 후보 축소 (ms 단위)
- ARQ Worker로 비동기 배치 처리 (메인 API 서버 블로킹 방지)
- 배치 임베딩 (32건 단위) — GPU 없이도 동작, 느리지만 가능

### 한국어 특화

- **MeCab-ko**: 최고속 한국어 형태소 분석기, Linux 프로덕션 환경 최적
- **mecab-ko-dic**: 한국어 특화 사전 (세종 코퍼스 기반)
- **정보 밀도**: 한국어 1,000자 ≈ 영어 2,000~3,000자 → 청크 크기 1,000자가 적절
- **문장 경계**: 종결어미 패턴(`다`, `요`, `함`, `임`, `음`, `됨`, `짐`) 인식

### 6어절 규칙의 한계와 보완

| 한계 | 보완 |
|------|------|
| 순서 변경 | Phase 2 의미적 검색으로 탐지 |
| 동의어 치환 | SEMANTIC 판정으로 경고 |
| 조사/어미 변형 | MeCab-ko 형태소 기반 분석으로 정규화 |
| 불연속 복사 | find_all_matches()로 4어절 이상 모든 구간 탐지 |

### 법적 근거

- **교육부 표절 가이드라인**: 6어절 연속 일치
- **학술지 일반 기준**: 15~20% 이하 유사도 권장

---

## 20. 향후 계획

### Cross-encoder Re-ranking

BGE-reranker-v2-m3로 Hybrid Search Top-K 후보를 정밀 재정렬한다. Bi-encoder(BGE-M3) 대비 높은 정확도를 제공하지만 속도가 느리므로 Top-K 결과에만 적용한다.

### LLM 기반 판단 (RAG Chain)

유사 구간 발견 시 LLM에게 "표절 vs 인용 vs 우연의 일치" 판단을 요청한다. 맥락 정보(앞뒤 문단)를 함께 제공하여 더 정확한 판단을 유도한다. Qwen3-VL의 Vision 기능으로 PDF 이미지/표/그래프 유사도 분석도 가능하다.

### HWPX 지원

최신 HWPX(XML 기반) 형식을 python-hwpx 라이브러리로 추가 지원한다. HWP(바이너리) + HWPX(XML) 동시 지원.

---

## 21. 참고 자료

### 상용 솔루션 벤치마킹
- [카피킬러](https://www.copykiller.com/) — 6어절 규칙 참고
- [턴잇인 (Turnitin)](https://www.turnitin.com/) — 하이브리드 검색 참고
- [KCI 문헌 유사도 검사](https://check.kci.go.kr/)

### 핵심 기술 문서
- [FastAPI](https://fastapi.tiangolo.com/)
- [FlagEmbedding (BGE-M3)](https://github.com/FlagOpen/FlagEmbedding)
- [Qdrant Hybrid Search](https://qdrant.tech/documentation/concepts/hybrid-queries/)
- [datasketch (MinHash LSH)](https://ekzhu.com/datasketch/)
- [KoNLPy](https://konlpy.org/)
- [MeCab-ko](https://bitbucket.org/eunjeon/mecab-ko)
- [LangChain Python](https://python.langchain.com/)
- [ARQ (Async Redis Queue)](https://arq-docs.helpmanual.io/)

### 임베딩 모델
- [BGE-M3 (HuggingFace)](https://huggingface.co/BAAI/bge-m3)
- [BGE-M3-ko (한국어 파인튜닝)](https://huggingface.co/upskyy/bge-m3-ko)

### UI
- [react-diff-viewer](https://github.com/praneshr/react-diff-viewer)
- [shadcn/ui](https://ui.shadcn.com/)

---

이 계획서는 오픈소스 기술만으로 **카피킬러, 턴잇인 수준의 정밀도**를 구현하도록 설계되었습니다. FastAPI(Python) 백엔드 전환으로 한국어 NLP, HWP 직접 지원, BGE-M3 하이브리드 임베딩의 이점을 최대한 활용합니다.
