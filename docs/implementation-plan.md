# [최종 v2] 사업계획서 유사도 검사 시스템 구현 계획 (상용 솔루션 수준)

## 1. 프로젝트 개요

사업계획서를 업로드하면 기존 제출된 사업계획서들과 비교하여 문단별 유사도를 검사하고 시각화하는 웹 애플리케이션

### 사용자 요구사항 (확정)
- **파일 형식**: PDF + DOCX + HWP (Python 백엔드로 직접 지원)
- **저장 방식**: DB + 로컬 파일 시스템
- **문서 수량**: 1,000건 이상 (대규모) → 벡터 DB + MinHash 사전필터링 필수
- **LLM API**: 오픈소스 (Ollama + Qwen3-VL)
- **임베딩**: BGE-M3 (FlagEmbedding, Dense+Sparse 동시 생성)

### v1 대비 주요 변경사항

| 구분 | v1 (기존) | **v2 (개선)** | 변경 이유 |
|------|-----------|---------------|-----------|
| **Backend** | Next.js API Routes (Node.js) | **FastAPI (Python)** | Python ML 생태계, 한국어 NLP, HWP 직접 지원 |
| **임베딩** | Ollama(Dense) + FastEmbed(Sparse) | **FlagEmbedding (BGE-M3)** | 단일 모델로 Dense+Sparse+ColBERT 동시 생성 |
| **표절 탐지** | 2-Track | **3-Phase** | MinHash 사전필터링 추가로 대규모 처리 성능 확보 |
| **한국어 NLP** | 공백 기반 어절 분리 | **MeCab-ko (KoNLPy)** | 최고속 한국어 형태소 분석 (Linux 프로덕션) |
| **비동기 처리** | BullMQ (Node.js) | **ARQ (Python async)** | Python async-native, 낮은 복잡도 |
| **문서 로딩** | LangChain.js 로더 | **pymupdf4llm + python-docx + pyhwp** | RAG 최적화 출력, HWP 직접 지원 |
| **DB ORM** | Prisma (Node.js) | **SQLAlchemy 2.0 + Alembic** | Python 표준 ORM |
| **RAG 설계** | 미명시 | **유사도 탐지 특화 RAG** | Q&A가 아닌 Similarity Retrieval |

### 현재 프로젝트 상태
- **프론트엔드**: Next.js 16.1.1 + React 19.2.3 + TypeScript (UI 완성, Mock 데이터)
- **스타일링**: Tailwind CSS v4 + shadcn/ui (Base UI 기반)
- **백엔드**: 미구현 → FastAPI로 신규 개발
- **배포 환경**: Linux (Docker 컨테이너) — 모든 백엔드 의존성은 Linux 기준

---

## 2. 상용 솔루션 수준 보완 전략

### 핵심 보완 사항 (Commercial Grade)

| 구분 | 기존 계획 (Basic) | **최종 계획 (Commercial Grade)** | 비고 |
|------|------------------|-----------------------------------|------|
| **검색 엔진** | 의미 기반 (Vector Only) | **Hybrid (Dense + Sparse via BGE-M3)** | 단일 모델에서 두 벡터 동시 생성 |
| **사전 필터링** | 없음 | **MinHash/LSH (datasketch)** | 1,000건+ 문서에서 O(1) 후보 필터링 |
| **판정 기준** | 코사인 유사도 점수만 | **6어절 이상 연속 일치 (형태소 기반)** | MeCab-ko 형태소 분석 + difflib |
| **HWP 지원** | 미지원 | **직접 지원 (pyhwp)** | Python 백엔드로 네이티브 처리 |
| **전처리** | 없음 | **지능형 필터링** | 인용구, 목차, 법령, 참고문헌 자동 제외 |
| **시각화** | 단순 하이라이팅 | **좌우 대조(Side-by-Side) 뷰어** | 직관적인 비교 증거 제시 |
| **점수 보정** | RRF 점수 직접 사용 | **RRF로 후보 선택 → 코사인 유사도로 분류** | 정확한 등급 판정 |

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

Next.js (Frontend) + FastAPI (Backend) 분리 구조

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
│  │   ┌─────────────────────────────────────────────────────┐  │ │
│  │   │  전처리 (인용구/목차/법령/참고문헌 제거)             │  │ │
│  │   └─────────────────────────────────────────────────────┘  │ │
│  │                          │                                  │ │
│  │                          ▼                                  │ │
│  │   ┌─────────────────────────────────────────────────────┐  │ │
│  │   │  MeCab-ko 형태소 분석 → 한국어 문장 경계 인식         │  │ │
│  │   └─────────────────────────────────────────────────────┘  │ │
│  │                          │                                  │ │
│  │                          ▼                                  │ │
│  │   ┌─────────────────────────────────────────────────────┐  │ │
│  │   │  RecursiveCharacterTextSplitter (1000자, 200 오버랩) │  │ │
│  │   └─────────────────────────────────────────────────────┘  │ │
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
| Framework | **FastAPI + Uvicorn** | 고성능 비동기 API 서버 |
| ORM | **SQLAlchemy 2.0 + Alembic** | DB 모델링 + 마이그레이션 |
| Validation | **Pydantic v2** | 데이터 검증/직렬화 |
| Task Queue | **ARQ + Redis** | 대용량 비동기 처리 (async-native) |
| Config | **pydantic-settings** | 환경변수 관리 |

### 문서 처리 (Document Processing)
| 구분 | 기술 | 용도 |
|------|------|------|
| PDF | **pymupdf4llm** | RAG 최적화 Markdown 출력 (가장 빠름) |
| DOCX | **python-docx** | DOCX 텍스트/구조 추출 |
| HWP | **pyhwp** | HWP 파일 직접 처리 |
| 청킹 | **langchain-text-splitters** | RecursiveCharacterTextSplitter |
| 한국어 NLP | **MeCab-ko (via KoNLPy)** | 최고속 형태소 분석 (Linux, mecab-ko-dic) |

### 임베딩 & 검색 (Embedding & Search)
| 구분 | 기술 | 용도 |
|------|------|------|
| Embedding | **FlagEmbedding (BGE-M3)** | Dense + Sparse 동시 생성 (단일 모델) |
| Vector DB | **Qdrant (Hybrid Mode)** | RRF 기반 Dense+Sparse 동시 검색 |
| Near-Dup | **datasketch** | MinHash/LSH 사전 필터링 |
| LLM | **Qwen3-VL (Ollama)** | 메타데이터 추출, 선택적 판단 |

### 분석 엔진 (Analysis)
| 구분 | 기술 | 용도 |
|------|------|------|
| Text Diff | **difflib (표준)** | SequenceMatcher 기반 텍스트 비교 |
| Rule Engine | **6어절 규칙 (형태소 기반)** | 물리적 표절 판정 |
| Orchestration | **LangChain (Python)** | 문서 로딩/처리 파이프라인 |

### Frontend (Next.js - 기존 유지)
| 구분 | 기술 | 용도 |
|------|------|------|
| Framework | Next.js 16.1 (App Router) | 프론트엔드 |
| UI | shadcn/ui + Tailwind CSS v4 | 컴포넌트/스타일링 |
| Diff Viewer | react-diff-viewer-continued | Side-by-Side 비교 |
| Data Fetching | @tanstack/react-query | API 호출/캐싱 |
| File Upload | react-dropzone | 파일 업로드 |

---

## 5. 필요 패키지

### Python (FastAPI Backend)
```bash
# FastAPI 핵심
pip install fastapi uvicorn[standard] pydantic-settings

# DB
pip install sqlalchemy[asyncio] alembic asyncpg  # PostgreSQL async

# 문서 처리
pip install pymupdf4llm python-docx pyhwp

# LangChain (문서 처리 파이프라인)
pip install langchain langchain-community langchain-text-splitters

# 임베딩 & 벡터 검색
pip install FlagEmbedding qdrant-client

# 한국어 NLP
pip install konlpy
# + 시스템 패키지: mecab, mecab-ko, mecab-ko-dic (Dockerfile에서 설치)

# Near-Duplicate Detection
pip install datasketch

# 비동기 작업 큐
pip install arq

# LLM (Ollama 연동)
pip install httpx  # Ollama REST API 호출

# 유틸리티
pip install python-multipart  # 파일 업로드
```

### Node.js (Next.js Frontend - 기존 유지)
```bash
# UI
npm install react-diff-viewer-continued react-dropzone @tanstack/react-query

# 기타 (기존)
npm install zod
```

---

## 6. 상세 구현 가이드

### A. FastAPI 프로젝트 구조

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
│   │   ├── document.py            # Pydantic 스키마
│   │   └── similarity.py          # 검사 결과 스키마
│   │
│   ├── services/
│   │   ├── document_service.py    # 문서 관리 서비스
│   │   ├── check_service.py       # 유사도 검사 오케스트레이터
│   │   └── vector_store.py        # Qdrant 벡터스토어 서비스
│   │
│   └── workers/
│       ├── settings.py            # ARQ 워커 설정
│       └── tasks.py               # 비동기 작업 (인덱싱/검사)
│
├── alembic/                       # DB 마이그레이션
│   └── versions/
├── alembic.ini
├── requirements.txt
├── Dockerfile
└── pyproject.toml
```

### B. FastAPI 앱 초기화

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import AsyncQdrantClient

from app.config import settings
from app.api.v1 import documents, similarity, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 리소스 관리"""
    # Startup: 무거운 리소스 1회 초기화
    app.state.qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)

    # BGE-M3 모델 로딩 (FlagEmbedding)
    from FlagEmbedding import BGEM3FlagModel
    app.state.embedding_model = BGEM3FlagModel(
        "BAAI/bge-m3", use_fp16=True
    )

    # MeCab-ko 형태소 분석기
    from konlpy.tag import Mecab
    app.state.mecab = Mecab()

    yield

    # Shutdown: 리소스 정리
    await app.state.qdrant.close()


app = FastAPI(
    title="사업계획서 유사도 검사 API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(documents.router, prefix="/api/v1", tags=["documents"])
app.include_router(similarity.router, prefix="/api/v1", tags=["similarity"])
```

### C. 환경 설정 (Pydantic Settings)

```python
# backend/app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/fund_dup"

    # Ollama (LLM only - 임베딩은 FlagEmbedding 사용)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen3-vl"

    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "business_proposals"

    # Redis (ARQ)
    REDIS_URL: str = "redis://localhost:6379"

    # BGE-M3 Embedding
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    EMBEDDING_BATCH_SIZE: int = 32

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10_485_760  # 10MB

    # Analysis
    MIN_CONSECUTIVE_WORDS: int = 6  # 6어절 규칙
    MINHASH_THRESHOLD: float = 0.3  # MinHash 후보 필터링
    SIMILARITY_TOP_K: int = 5       # Hybrid Search Top-K

    class Config:
        env_file = ".env"


settings = Settings()
```

### D. BGE-M3 하이브리드 임베딩 (핵심 변경)

```python
# backend/app/core/pipeline/embedder.py
"""
핵심 변경: Ollama 대신 FlagEmbedding 사용
- Ollama: Dense 벡터만 생성
- FlagEmbedding: Dense + Sparse + ColBERT 동시 생성 (단일 forward pass)
"""
import asyncio
from functools import partial
from typing import TypedDict

import numpy as np
from FlagEmbedding import BGEM3FlagModel


class EmbeddingResult(TypedDict):
    dense: np.ndarray           # (N, 1024) Dense vectors
    sparse: list[dict[int, float]]  # Lexical weights (token_id: weight)


class BGEm3Embedder:
    def __init__(self, model_name: str = "BAAI/bge-m3", use_fp16: bool = True):
        self.model = BGEM3FlagModel(model_name, use_fp16=use_fp16)

    def encode_sync(
        self, texts: list[str], batch_size: int = 32
    ) -> EmbeddingResult:
        """동기 임베딩 생성 (Dense + Sparse)"""
        output = self.model.encode(
            texts,
            batch_size=batch_size,
            return_dense=True,
            return_sparse=True,
            return_colbert_vecs=False,  # 성능 위해 ColBERT은 비활성화
        )
        return EmbeddingResult(
            dense=output["dense_vecs"],
            sparse=output["lexical_weights"],
        )

    async def encode(
        self, texts: list[str], batch_size: int = 32
    ) -> EmbeddingResult:
        """비동기 래퍼 (FlagEmbedding은 동기 → thread pool 위임)"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, partial(self.encode_sync, texts, batch_size)
        )
```

### E. Qdrant Hybrid Collection 설정

```python
# backend/app/core/rag/indexer.py
from qdrant_client import AsyncQdrantClient, models


async def initialize_collection(client: AsyncQdrantClient, collection_name: str):
    """Qdrant Hybrid Collection 초기화 (최초 1회)"""

    exists = await client.collection_exists(collection_name)
    if exists:
        return

    await client.create_collection(
        collection_name=collection_name,
        vectors_config={
            # Dense 벡터 (BGE-M3, 1024차원, 코사인 유사도)
            "dense": models.VectorParams(
                size=1024,
                distance=models.Distance.COSINE,
                on_disk=True,  # 대용량 시 디스크 저장
            ),
        },
        sparse_vectors_config={
            # Sparse 벡터 (BGE-M3 lexical weights)
            "sparse": models.SparseVectorParams(
                modifier=models.Modifier.IDF,  # IDF 가중치 적용
            ),
        },
    )

    # 페이로드 인덱스 (필터링 성능)
    await client.create_payload_index(
        collection_name=collection_name,
        field_name="document_id",
        field_schema=models.PayloadSchemaType.KEYWORD,
    )
    await client.create_payload_index(
        collection_name=collection_name,
        field_name="category",
        field_schema=models.PayloadSchemaType.KEYWORD,
    )


async def index_chunks(
    client: AsyncQdrantClient,
    collection_name: str,
    chunks: list[dict],
    dense_vectors: list[list[float]],
    sparse_vectors: list[dict[int, float]],
):
    """청크를 Qdrant에 인덱싱"""
    points = []
    for i, chunk in enumerate(chunks):
        # Sparse vector를 Qdrant 형식으로 변환
        sparse_indices = list(sparse_vectors[i].keys())
        sparse_values = list(sparse_vectors[i].values())

        points.append(
            models.PointStruct(
                id=chunk["id"],
                vector={
                    "dense": dense_vectors[i],
                    "sparse": models.SparseVector(
                        indices=sparse_indices,
                        values=sparse_values,
                    ),
                },
                payload={
                    "document_id": chunk["document_id"],
                    "chunk_index": chunk["chunk_index"],
                    "content": chunk["content"],
                    "filename": chunk["filename"],
                    "category": chunk.get("category"),
                },
            )
        )

    # 배치 업로드 (100개씩)
    batch_size = 100
    for j in range(0, len(points), batch_size):
        await client.upsert(
            collection_name=collection_name,
            points=points[j : j + batch_size],
        )
```

### F. Hybrid Search (RRF + 코사인 보정)

```python
# backend/app/core/rag/retriever.py
"""
핵심: RRF 점수는 순위 기반 → 분류에 부적합
→ RRF로 후보 선택 후, 코사인 유사도로 등급 분류
"""
import numpy as np
from qdrant_client import AsyncQdrantClient, models


async def hybrid_search(
    client: AsyncQdrantClient,
    collection_name: str,
    dense_vector: list[float],
    sparse_vector: dict[int, float],
    top_k: int = 5,
    exclude_document_id: str | None = None,
) -> list[dict]:
    """Hybrid Search (Dense + Sparse + RRF)"""

    # 필터 (자기 자신 제외)
    search_filter = None
    if exclude_document_id:
        search_filter = models.Filter(
            must_not=[
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchValue(value=exclude_document_id),
                )
            ]
        )

    # Sparse vector 변환
    sparse_indices = list(sparse_vector.keys())
    sparse_values = list(sparse_vector.values())

    # Qdrant Hybrid Search (RRF 기반 Dense+Sparse 결합)
    results = await client.query_points(
        collection_name=collection_name,
        prefetch=[
            models.Prefetch(
                query=dense_vector,
                using="dense",
                limit=top_k * 4,  # 더 많은 후보 가져오기
                filter=search_filter,
            ),
            models.Prefetch(
                query=models.SparseVector(
                    indices=sparse_indices,
                    values=sparse_values,
                ),
                using="sparse",
                limit=top_k * 4,
                filter=search_filter,
            ),
        ],
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=top_k,
        with_payload=True,
        with_vectors={"dense": True},  # 코사인 재계산용
    )

    # RRF 결과에서 실제 코사인 유사도 재계산
    query_vec = np.array(dense_vector)
    matches = []
    for point in results.points:
        match_vec = np.array(point.vector["dense"])
        cosine_sim = float(
            np.dot(query_vec, match_vec)
            / (np.linalg.norm(query_vec) * np.linalg.norm(match_vec))
        )
        matches.append({
            "id": point.id,
            "document_id": point.payload["document_id"],
            "filename": point.payload["filename"],
            "chunk_index": point.payload["chunk_index"],
            "content": point.payload["content"],
            "rrf_score": point.score,       # RRF 순위 점수 (참고용)
            "cosine_score": cosine_sim,     # 실제 코사인 유사도 (분류용)
        })

    return matches
```

### G. Phase 0: MinHash 사전 필터링

```python
# backend/app/core/analysis/minhash.py
"""
대규모 문서(1,000건+)에서 후보를 빠르게 좁히는 사전 필터링
datasketch MinHash + LSH 사용
"""
from datasketch import MinHash, MinHashLSH
from konlpy.tag import Mecab


class MinHashIndex:
    def __init__(self, threshold: float = 0.3, num_perm: int = 128):
        self.threshold = threshold
        self.num_perm = num_perm
        self.lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
        self.mecab = Mecab()

    def _text_to_shingles(self, text: str, n: int = 3) -> set[str]:
        """한국어 텍스트를 n-gram 셋으로 변환 (MeCab-ko 형태소 기반)"""
        # MeCab POS 태깅 → 실질 형태소(명사/동사/형용사) 추출
        pos_tagged = self.mecab.pos(text)
        words = [word for word, tag in pos_tagged if tag.startswith(("N", "V", "M"))]
        # n-gram 생성
        shingles = set()
        for i in range(len(words) - n + 1):
            shingle = " ".join(words[i : i + n])
            shingles.add(shingle)
        return shingles

    def _create_minhash(self, shingles: set[str]) -> MinHash:
        """셋에서 MinHash 시그니처 생성"""
        m = MinHash(num_perm=self.num_perm)
        for s in shingles:
            m.update(s.encode("utf-8"))
        return m

    def add_document(self, doc_id: str, text: str):
        """문서를 LSH 인덱스에 추가"""
        shingles = self._text_to_shingles(text)
        if not shingles:
            return
        mh = self._create_minhash(shingles)
        self.lsh.insert(doc_id, mh)

    def query_candidates(self, text: str) -> list[str]:
        """유사 후보 문서 ID 목록 반환 (ms 단위)"""
        shingles = self._text_to_shingles(text)
        if not shingles:
            return []
        mh = self._create_minhash(shingles)
        return self.lsh.query(mh)
```

### H. Phase 1: 6어절 규칙 (형태소 기반 개선)

```python
# backend/app/core/analysis/six_word_rule.py
"""
기존 공백 기반 어절 분리 → MeCab-ko 형태소 분석 기반으로 개선
difflib.SequenceMatcher로 연속 일치 구간 정밀 탐지
"""
from dataclasses import dataclass
from difflib import SequenceMatcher

from konlpy.tag import Mecab


@dataclass
class SixWordMatch:
    is_plagiarism: bool       # 6어절 규칙 위반 여부
    match_text: str           # 일치하는 원본 문구
    match_word_count: int     # 연속 일치 어절 수
    source_start: int         # 소스 시작 인덱스
    source_end: int           # 소스 종료 인덱스


class SixWordRuleChecker:
    def __init__(self, mecab: Mecab, min_words: int = 6):
        self.mecab = mecab
        self.min_words = min_words

    def _tokenize_to_words(self, text: str) -> list[str]:
        """MeCab-ko 형태소 분석 → 실질 형태소만 추출"""
        pos_tagged = self.mecab.pos(text)
        # 명사(N*), 동사(V*), 형용사(VA), 부사(MA*) 등 실질 형태소
        return [word for word, tag in pos_tagged if tag.startswith(("N", "V", "M", "XR"))]

    def check(self, source_text: str, target_text: str) -> SixWordMatch:
        """6어절 연속 일치 검사 (최장 일치 구간)"""
        source_words = self._tokenize_to_words(source_text)
        target_words = self._tokenize_to_words(target_text)

        if not source_words or not target_words:
            return SixWordMatch(False, "", 0, 0, 0)

        # SequenceMatcher로 최장 공통 부분 수열(LCS) 블록 탐색
        matcher = SequenceMatcher(None, source_words, target_words)
        blocks = matcher.get_matching_blocks()

        # 최장 연속 일치 구간 탐색
        max_block = max(blocks, key=lambda b: b.size, default=None)
        if max_block is None or max_block.size == 0:
            return SixWordMatch(False, "", 0, 0, 0)

        match_words = source_words[max_block.a : max_block.a + max_block.size]
        match_text = " ".join(match_words)

        return SixWordMatch(
            is_plagiarism=max_block.size >= self.min_words,
            match_text=match_text,
            match_word_count=max_block.size,
            source_start=max_block.a,
            source_end=max_block.a + max_block.size,
        )

    def find_all_matches(
        self, source_text: str, target_text: str, min_words: int = 4
    ) -> list[SixWordMatch]:
        """모든 일치 구간 찾기 (상세 분석용)"""
        source_words = self._tokenize_to_words(source_text)
        target_words = self._tokenize_to_words(target_text)

        if not source_words or not target_words:
            return []

        matcher = SequenceMatcher(None, source_words, target_words)
        matches = []

        for block in matcher.get_matching_blocks():
            if block.size >= min_words:
                match_words = source_words[block.a : block.a + block.size]
                matches.append(SixWordMatch(
                    is_plagiarism=block.size >= self.min_words,
                    match_text=" ".join(match_words),
                    match_word_count=block.size,
                    source_start=block.a,
                    source_end=block.a + block.size,
                ))

        return matches
```

### I. 문서 로딩 및 전처리

```python
# backend/app/core/pipeline/loader.py
"""
문서 형식별 로딩:
- PDF: pymupdf4llm (RAG 최적화 Markdown 출력)
- DOCX: python-docx
- HWP: pyhwp (직접 지원!)
"""
import re
from pathlib import Path

import pymupdf4llm
from docx import Document as DocxDocument


def load_pdf(file_path: str) -> str:
    """PDF → Markdown 텍스트 (pymupdf4llm)"""
    md_text = pymupdf4llm.to_markdown(file_path)
    return md_text


def load_docx(file_path: str) -> str:
    """DOCX → 텍스트"""
    doc = DocxDocument(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def load_hwp(file_path: str) -> str:
    """HWP → 텍스트 (pyhwp)"""
    import subprocess
    result = subprocess.run(
        ["hwp5txt", file_path],
        capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        raise RuntimeError(f"HWP 변환 실패: {result.stderr}")
    return result.stdout


def load_document(file_path: str) -> str:
    """파일 확장자에 따라 적절한 로더 선택"""
    ext = Path(file_path).suffix.lower()
    loaders = {
        ".pdf": load_pdf,
        ".docx": load_docx,
        ".hwp": load_hwp,
    }
    loader = loaders.get(ext)
    if not loader:
        raise ValueError(f"지원하지 않는 파일 형식: {ext}")
    return loader(file_path)
```

```python
# backend/app/core/pipeline/preprocessor.py
"""전처리: 표절 검사에서 제외해야 할 영역 제거"""
import re


def clean_text(text: str) -> str:
    """인용구, 목차, 법령, 참고문헌 등 제거"""
    cleaned = text

    # 1. 참고문헌 이후 전체 삭제
    ref_patterns = [
        r"참\s*고\s*문\s*헌.*",
        r"References.*",
        r"참\s*조\s*자\s*료.*",
        r"Bibliography.*",
    ]
    for pattern in ref_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL)

    # 2. 법령 표기 제거
    cleaned = re.sub(r"\[[^\]]*법\s*제\d+조[^\]]*\]", "", cleaned)
    cleaned = re.sub(r"제\d+조(의\d+)?(\s*제\d+항)?", "", cleaned)

    # 3. 인용구 제거 (큰따옴표, 작은따옴표)
    cleaned = re.sub(r"["""][^"""]*["""]", "", cleaned)
    cleaned = re.sub(r"['''][^''']*[''']", "", cleaned)

    # 4. 목차 패턴 제거
    cleaned = re.sub(r"^[\d가-힣]+\.\s+[^\n]+\.{3,}\s*\d+$", "", cleaned, flags=re.MULTILINE)

    # 5. 인라인 인용 ([1], (2024), 【1】)
    cleaned = re.sub(r"\[\d+\]", "", cleaned)
    cleaned = re.sub(r"【\d+】", "", cleaned)
    cleaned = re.sub(r"\(\d{4}\)", "", cleaned)

    # 6. 페이지 번호
    cleaned = re.sub(r"^\s*-?\s*\d+\s*-?\s*$", "", cleaned, flags=re.MULTILINE)

    # 7. 연속 공백 정리
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned
```

### J. 최종 판정 결합

```python
# backend/app/core/analysis/judge.py
"""3-Phase 결과를 결합하여 최종 판정"""
from dataclasses import dataclass
from enum import Enum


class PlagiarismType(str, Enum):
    EXACT_COPY = "EXACT_COPY"   # 물리적 복사
    SEMANTIC = "SEMANTIC"       # 의미적 유사
    CLEAN = "CLEAN"             # 유사도 낮음


class SimilarityGrade(str, Enum):
    VERY_HIGH = "very_high"     # ≥ 0.85
    HIGH = "high"               # 0.70 ~ 0.85
    MEDIUM = "medium"           # 0.50 ~ 0.70
    LOW = "low"                 # < 0.50


class DocumentGrade(str, Enum):
    DANGER = "DANGER"           # EXACT_COPY 1개 이상
    WARNING = "WARNING"         # 전체 유사도 50% 이상
    SAFE = "SAFE"               # 표절 가능성 낮음


@dataclass
class ChunkJudgment:
    chunk_index: int
    content: str
    plagiarism_type: PlagiarismType
    similarity_grade: SimilarityGrade
    final_score: float
    matches: list[dict]


def get_similarity_grade(score: float) -> SimilarityGrade:
    if score >= 0.85:
        return SimilarityGrade.VERY_HIGH
    if score >= 0.70:
        return SimilarityGrade.HIGH
    if score >= 0.50:
        return SimilarityGrade.MEDIUM
    return SimilarityGrade.LOW


def determine_plagiarism_type(
    six_word_plagiarism: bool, cosine_score: float
) -> PlagiarismType:
    """Phase 1 + Phase 2 결과 결합 → 더 높은 위험도 적용"""
    if six_word_plagiarism:
        return PlagiarismType.EXACT_COPY
    if cosine_score >= 0.70:
        return PlagiarismType.SEMANTIC
    return PlagiarismType.CLEAN


def calculate_overall_similarity(
    chunks: list[ChunkJudgment],
) -> float:
    """문단 길이 가중 평균 유사도"""
    if not chunks:
        return 0.0
    total_weight = sum(len(c.content) for c in chunks)
    if total_weight == 0:
        return 0.0
    weighted_sum = sum(c.final_score * len(c.content) for c in chunks)
    return round(weighted_sum / total_weight, 4)


def get_document_grade(
    overall_similarity: float,
    exact_copy_count: int,
) -> DocumentGrade:
    """전체 문서 등급"""
    if exact_copy_count > 0:
        return DocumentGrade.DANGER
    if overall_similarity >= 0.50:
        return DocumentGrade.WARNING
    return DocumentGrade.SAFE
```

### K. 통합 검사 오케스트레이터

```python
# backend/app/services/check_service.py
"""유사도 검사 전체 플로우 오케스트레이터"""
from app.core.pipeline.loader import load_document
from app.core.pipeline.preprocessor import clean_text
from app.core.pipeline.chunker import split_text
from app.core.pipeline.embedder import BGEm3Embedder
from app.core.analysis.minhash import MinHashIndex
from app.core.analysis.six_word_rule import SixWordRuleChecker
from app.core.analysis.judge import (
    ChunkJudgment, determine_plagiarism_type,
    get_similarity_grade, calculate_overall_similarity,
    get_document_grade,
)
from app.core.rag.retriever import hybrid_search


async def perform_similarity_check(
    file_path: str,
    embedder: BGEm3Embedder,
    qdrant_client,
    mecab,
    minhash_index: MinHashIndex,
    collection_name: str,
) -> dict:
    """
    전체 유사도 검사 플로우:
    1. 문서 로딩 → 전처리 → 청킹
    2. Phase 0: MinHash 후보 필터링
    3. Phase 1 + Phase 2: 청크별 정밀 분석
    4. 최종 판정 결합
    """
    # 1. 문서 로딩 & 전처리 & 청킹
    raw_text = load_document(file_path)
    cleaned_text = clean_text(raw_text)
    chunks = split_text(cleaned_text)

    # 2. Phase 0: MinHash 후보 필터링
    candidate_doc_ids = minhash_index.query_candidates(cleaned_text)

    # 3. 임베딩 생성
    chunk_texts = [c["content"] for c in chunks]
    embeddings = await embedder.encode(chunk_texts)

    # 4. 청크별 분석
    six_word_checker = SixWordRuleChecker(mecab)
    judgments: list[ChunkJudgment] = []

    for i, chunk in enumerate(chunks):
        # Phase 2: Hybrid Search
        matches = await hybrid_search(
            client=qdrant_client,
            collection_name=collection_name,
            dense_vector=embeddings["dense"][i].tolist(),
            sparse_vector=embeddings["sparse"][i],
            top_k=5,
        )

        # Phase 1 + Phase 2: 각 매치에 대해 판정
        match_details = []
        best_score = 0.0
        best_type = "CLEAN"

        for match in matches:
            # Phase 1: 6어절 규칙
            six_word = six_word_checker.check(chunk["content"], match["content"])
            cosine = match["cosine_score"]

            ptype = determine_plagiarism_type(six_word.is_plagiarism, cosine)
            final_score = 1.0 if six_word.is_plagiarism else cosine

            if final_score > best_score:
                best_score = final_score
                best_type = ptype

            match_details.append({
                "document_id": match["document_id"],
                "filename": match["filename"],
                "content": match["content"][:200],
                "cosine_score": cosine,
                "six_word_match": six_word.is_plagiarism,
                "evidence": six_word.match_text if six_word.is_plagiarism else None,
                "final_type": ptype.value,
                "final_score": final_score,
            })

        judgments.append(ChunkJudgment(
            chunk_index=i,
            content=chunk["content"],
            plagiarism_type=best_type,
            similarity_grade=get_similarity_grade(best_score),
            final_score=best_score,
            matches=match_details,
        ))

    # 5. 전체 문서 판정
    overall = calculate_overall_similarity(judgments)
    exact_count = sum(1 for j in judgments if j.plagiarism_type == "EXACT_COPY")
    grade = get_document_grade(overall, exact_count)

    return {
        "overall_similarity": overall,
        "overall_grade": grade.value,
        "statistics": {
            "total_chunks": len(judgments),
            "exact_copy_count": exact_count,
            "semantic_count": sum(1 for j in judgments if j.plagiarism_type == "SEMANTIC"),
            "clean_count": sum(1 for j in judgments if j.plagiarism_type == "CLEAN"),
        },
        "chunks": [
            {
                "index": j.chunk_index,
                "content": j.content[:200] + "...",
                "similarity": j.final_score,
                "grade": j.similarity_grade.value,
                "type": j.plagiarism_type.value if isinstance(j.plagiarism_type, str) else j.plagiarism_type,
                "matches": j.matches[:3],
            }
            for j in judgments
        ],
    }
```

---

## 7. API 엔드포인트

### 유사도 검사 API

```python
# backend/app/api/v1/similarity.py
from fastapi import APIRouter, UploadFile, File, Request, HTTPException
from fastapi.responses import StreamingResponse
from pathlib import Path
import uuid
import aiofiles

from app.config import settings

router = APIRouter(prefix="/similarity")


@router.post("/check")
async def check_similarity(request: Request, file: UploadFile = File(...)):
    """파일 업로드 후 유사도 검사"""
    # 파일 검증
    ext = Path(file.filename).suffix.lower()
    if ext not in {".pdf", ".docx", ".hwp"}:
        raise HTTPException(400, "지원하지 않는 파일 형식입니다.")

    # 파일 저장
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / filename

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(400, "파일 크기가 10MB를 초과합니다.")
        await f.write(content)

    # 유사도 검사 (ARQ 작업으로 위임하거나 직접 실행)
    from app.services.check_service import perform_similarity_check

    result = await perform_similarity_check(
        file_path=str(file_path),
        embedder=request.app.state.embedding_model,
        qdrant_client=request.app.state.qdrant,
        mecab=request.app.state.mecab,
        minhash_index=request.app.state.minhash_index,
        collection_name=settings.QDRANT_COLLECTION,
    )

    return {"success": True, "data": result}


@router.post("/check/async")
async def check_similarity_async(request: Request, file: UploadFile = File(...)):
    """대용량 파일: ARQ 비동기 작업으로 위임"""
    # 파일 저장 (위와 동일)
    # ...

    # ARQ 작업 등록
    from arq import create_pool
    redis = await create_pool(settings.REDIS_URL)
    job = await redis.enqueue_job(
        "perform_check_task", str(file_path)
    )

    return {"success": True, "job_id": job.job_id, "status": "queued"}


@router.get("/check/status/{job_id}")
async def check_status(job_id: str):
    """비동기 작업 상태 조회"""
    from arq import create_pool
    redis = await create_pool(settings.REDIS_URL)
    job = await redis.job(job_id)

    if job is None:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")

    return {
        "job_id": job_id,
        "status": job.status,
        "result": job.result if job.status == "complete" else None,
    }
```

### 문서 관리 API

```python
# backend/app/api/v1/documents.py
from fastapi import APIRouter, UploadFile, File, Request, HTTPException
from typing import Optional

router = APIRouter(prefix="/documents")


@router.post("/")
async def register_document(
    request: Request,
    file: UploadFile = File(...),
    category: Optional[str] = None,
):
    """기존 문서 등록 (벡터스토어 인덱싱)"""
    # 파일 저장 → 로딩 → 전처리 → 청킹 → 임베딩 → Qdrant 인덱싱
    # ... (check_service와 유사한 파이프라인)
    return {"success": True, "document_id": "..."}


@router.get("/")
async def list_documents(
    page: int = 1,
    size: int = 20,
    category: Optional[str] = None,
):
    """등록된 문서 목록 조회"""
    # SQLAlchemy 쿼리
    return {"documents": [], "total": 0, "page": page}


@router.delete("/{document_id}")
async def delete_document(document_id: str, request: Request):
    """문서 삭제 (DB + 벡터스토어)"""
    # Qdrant에서 해당 document_id 청크 삭제
    # PostgreSQL에서 메타데이터 삭제
    return {"success": True}


@router.post("/batch")
async def batch_register(
    request: Request,
    files: list[UploadFile] = File(...),
    category: Optional[str] = None,
):
    """배치 문서 등록 (ARQ 비동기)"""
    # 여러 문서를 ARQ 작업으로 등록
    return {"success": True, "job_ids": []}
```

---

## 8. Next.js 프론트엔드 연동

### Rewrite Proxy 설정 (CORS 없이 통신)

```typescript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

프론트엔드에서는 `/api/backend/...`로 호출하면 자동으로 FastAPI로 프록시됩니다.

---

## 9. 환경 설정

### 환경변수 (.env)
```bash
# Database
DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/fund_dup"

# Ollama (LLM만 - 임베딩은 FlagEmbedding 사용)
OLLAMA_BASE_URL="http://localhost:11434"
LLM_MODEL="qwen3-vl"

# Qdrant (Hybrid Vector Store)
QDRANT_URL="http://localhost:6333"
QDRANT_COLLECTION="business_proposals"

# Redis (ARQ)
REDIS_URL="redis://localhost:6379"

# BGE-M3 Embedding (FlagEmbedding)
EMBEDDING_MODEL="BAAI/bge-m3"
EMBEDDING_BATCH_SIZE=32

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# Analysis Parameters
MIN_CONSECUTIVE_WORDS=6
MINHASH_THRESHOLD=0.3
SIMILARITY_TOP_K=5

# App
LOG_LEVEL="info"
```

### Docker Compose (compose.yaml)
```yaml
services:
  # Next.js Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - BACKEND_URL=http://backend:8000
    depends_on:
      - backend

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/fund_dup
      - OLLAMA_BASE_URL=http://ollama:11434
      - QDRANT_URL=http://qdrant:6333
      - REDIS_URL=redis://redis:6379
      - EMBEDDING_MODEL=BAAI/bge-m3
    volumes:
      - uploads_data:/app/uploads
      - model_cache:/root/.cache  # HuggingFace 모델 캐시
    depends_on:
      - postgres
      - qdrant
      - redis
      - ollama

  # ARQ Worker (비동기 작업 처리)
  arq-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: arq app.workers.settings.WorkerSettings
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/fund_dup
      - OLLAMA_BASE_URL=http://ollama:11434
      - QDRANT_URL=http://qdrant:6333
      - REDIS_URL=redis://redis:6379
      - EMBEDDING_MODEL=BAAI/bge-m3
    volumes:
      - uploads_data:/app/uploads
      - model_cache:/root/.cache
    depends_on:
      - postgres
      - qdrant
      - redis
      - ollama

  # Ollama (LLM만 - 임베딩은 FlagEmbedding)
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # 모델 다운로드: docker exec -it ollama ollama pull qwen3-vl

  # Qdrant (Hybrid Vector DB)
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

  # PostgreSQL (Metadata + MinHash)
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: fund_dup
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  # Redis (ARQ Queue)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  ollama_data:
  qdrant_data:
  pg_data:
  uploads_data:
  model_cache:
```

### Backend Dockerfile (MeCab-ko 포함)
```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

# MeCab-ko 시스템 의존성 설치 (Linux)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    mecab \
    libmecab-dev \
    mecab-ipadic-utf8 \
    && rm -rf /var/lib/apt/lists/*

# mecab-ko-dic (한국어 사전) 설치
RUN curl -fsSL https://bitbucket.org/eunjeon/mecab-ko-dic/downloads/mecab-ko-dic-2.1.1-20180720.tar.gz \
    | tar xz && cd mecab-ko-dic-2.1.1-20180720 \
    && ./autogen.sh && ./configure && make && make install \
    && cd .. && rm -rf mecab-ko-dic-2.1.1-20180720

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 10. 데이터베이스 스키마 (SQLAlchemy)

```python
# backend/app/db/models.py
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, DateTime,
    Enum, ForeignKey, JSON, Index,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class DocumentStatus(str, PyEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class FileType(str, PyEnum):
    PDF = "PDF"
    DOCX = "DOCX"
    HWP = "HWP"


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    file_type = Column(Enum(FileType), nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING)
    total_paragraphs = Column(Integer)
    error_message = Column(Text)
    category = Column(String)
    is_reference = Column(Boolean, default=False)

    # MinHash 지문 (JSONB로 저장)
    minhash_signature = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    check_results = relationship("CheckResult", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_documents_status", "status"),
        Index("ix_documents_is_reference", "is_reference"),
        Index("ix_documents_created_at", "created_at"),
    )


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    overall_rate = Column(Float, nullable=False)
    overall_grade = Column(String)  # DANGER / WARNING / SAFE
    statistics = Column(JSON)       # {total_chunks, exact_copy_count, ...}
    detail_json = Column(JSON)      # 청크별 상세 결과
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="check_results")

    __table_args__ = (
        Index("ix_check_results_document_id", "document_id"),
    )
```

---

## 11. 구현 로드맵

### Phase 1: 인프라 & 기반 구축
- [ ] FastAPI 프로젝트 초기화 (프로젝트 구조, pyproject.toml)
- [ ] Docker Compose 업데이트 (backend + arq-worker 컨테이너 추가)
- [ ] SQLAlchemy 모델 + Alembic 마이그레이션
- [ ] Qdrant Hybrid Collection 초기화 스크립트
- [ ] BGE-M3 모델 다운로드/캐시 설정
- [ ] Next.js Rewrite Proxy 설정

### Phase 2: 문서 처리 파이프라인
- [ ] PDF 로더 (pymupdf4llm)
- [ ] DOCX 로더 (python-docx)
- [ ] HWP 로더 (pyhwp)
- [ ] 전처리 모듈 (인용구/참고문헌/법령 제거)
- [ ] 한국어 형태소 분석 (MeCab-ko via KoNLPy) 연동
- [ ] 텍스트 청킹 (RecursiveCharacterTextSplitter)
- [ ] BGE-M3 Dense+Sparse 임베딩 파이프라인

### Phase 3: 3-Phase 분석 엔진
- [ ] Phase 0: MinHash/LSH 문서 지문 생성 및 필터링 (datasketch)
- [ ] Phase 1: 6어절 규칙 검사 (MeCab-ko 형태소 + difflib)
- [ ] Phase 2: Hybrid Search (Qdrant RRF) + 코사인 보정
- [ ] 3-Phase 결과 결합 판정 로직 (judge.py)
- [ ] 통합 검사 오케스트레이터 (check_service.py)

### Phase 4: API 개발 & 프론트엔드 연동
- [ ] `POST /api/v1/documents` - 기존 문서 등록 (인덱싱)
- [ ] `POST /api/v1/documents/batch` - 배치 문서 등록
- [ ] `POST /api/v1/similarity/check` - 유사도 검사
- [ ] `POST /api/v1/similarity/check/async` - 비동기 검사
- [ ] `GET /api/v1/similarity/check/status/{job_id}` - 상태 조회
- [ ] `GET /api/v1/documents` - 문서 목록
- [ ] `DELETE /api/v1/documents/{id}` - 문서 삭제
- [ ] Next.js 프론트엔드 API 호출 변경

### Phase 5: 대용량 처리 & 최적화
- [ ] ARQ Worker 설정 및 비동기 작업
- [ ] 배치 임베딩 최적화 (GPU 활용 시)
- [ ] 임베딩 캐싱 전략
- [ ] 검색 성능 튜닝 (Qdrant 인덱스)
- [ ] SSE/WebSocket 실시간 진행 상태

### Phase 6: 고급 기능 (향후)
- [ ] LLM 기반 표절/인용 판단 (RAG Chain with Qwen3-VL)
- [ ] PDF 이미지/표 유사도 분석 (Vision-Language)
- [ ] 검사 보고서 자동 생성
- [ ] 사용자 커스텀 규칙 설정
- [ ] Cross-encoder Re-ranking (BGE-reranker-v2-m3)

---

## 12. 표절 판정 기준

### 유사도 등급
| 유사도 점수 | 등급 | 색상 | 의미 |
|------------|------|------|------|
| 6어절+ 일치 | `EXACT_COPY` | 빨강 | 물리적 복사 (표절 확정) |
| 0.85 이상 | `very_high` | 빨강 | 표절 강력 의심 |
| 0.70 ~ 0.85 | `high` | 주황 | 높은 유사도 (말 바꾸기 의심) |
| 0.50 ~ 0.70 | `medium` | 노랑 | 중간 유사도 |
| 0.50 미만 | `low` | 녹색 | 낮은 유사도 |

### 전체 문서 판정
| 상태 | 조건 | 의미 |
|------|------|------|
| `DANGER` | EXACT_COPY 1개 이상 | 물리적 표절 발견 |
| `WARNING` | 전체 유사도 50% 이상 | 의미적 표절 의심 |
| `SAFE` | 그 외 | 표절 가능성 낮음 |

### 점수 산정 주의사항
- **RRF 점수**는 순위 기반 → 분류에 부적합 (참고용)
- **코사인 유사도**로 등급 분류 (RRF 후보 → 코사인 재계산)
- **6어절 일치** 시 점수를 1.0으로 강제 (최고 위험도)

---

## 13. 오픈소스 기술 라이선스 호환성

| 컴포넌트 | 라이선스 | 상용 사용 |
|----------|---------|-----------|
| FastAPI | MIT | OK |
| KoNLPy + MeCab-ko | GPL v3 / BSD (MeCab) | OK (서버사이드, Linux Docker) |
| BGE-M3 (FlagEmbedding) | MIT | OK |
| Qdrant | Apache 2.0 | OK |
| datasketch | MIT | OK |
| LangChain | MIT | OK |
| pymupdf4llm | AGPL → 상용 라이선스 필요 | 주의 필요 |
| python-docx | MIT | OK |
| pyhwp | MIT | OK |
| difflib | PSF (표준) | OK |
| SQLAlchemy | MIT | OK |

> **주의**: pymupdf4llm은 AGPL 라이선스. 상용 배포 시 PyMuPDF 상용 라이선스 구매 또는 대안(pdfplumber) 검토 필요.

---

## 14. 주요 고려사항

### 1. BGE-M3 vs Ollama 임베딩
- **Ollama**: Dense 벡터만 생성 → Hybrid Search 불가
- **FlagEmbedding**: Dense + Sparse + ColBERT 동시 생성 → 완전한 Hybrid
- **결론**: 임베딩은 FlagEmbedding, LLM은 Ollama로 역할 분리

### 2. 대용량 처리 (1,000건+)
- MinHash 사전 필터링으로 후보를 빠르게 축소
- ARQ Worker로 비동기 배치 처리
- 임베딩 배치 크기 32 (GPU 없이도 동작, 느리지만 가능)

### 3. 한국어 특화
- MeCab-ko: 최고속 한국어 형태소 분석기, Linux 프로덕션 환경 최적
- mecab-ko-dic: 한국어 특화 사전 (세종 코퍼스 기반)
- 한국어 1000자 ≈ 영어 2000~3000자 (정보 밀도 높음)
- 문장 경계: `다`, `요`, `함`, `임`, `음`, `됨`, `짐` 패턴 인식

### 4. 6어절 규칙의 한계와 보완
- 순서 변경 → Phase 2 의미 검색으로 보완
- 동의어 치환 → SEMANTIC 판정으로 경고
- 형태소 기반 분석으로 조사/어미 변형 대응

### 5. 법적 근거
- 교육부 표절 가이드라인: 6어절 연속 일치
- 학술지 일반 기준: 15~20% 이하 유사도 권장

---

## 15. 향후 계획 (Future Plans)

### Cross-encoder Re-ranking
- BGE-reranker-v2-m3로 Top-K 후보 정밀 재정렬
- Phase 2 정확도 향상 (Phase 6에서 추가)

### LLM 기반 판단 (RAG Chain)
- 유사 구간 발견 시 LLM에게 "표절 vs 인용 vs 우연의 일치" 판단 요청
- 맥락 정보(앞뒤 문단)를 함께 제공하여 더 정확한 판단
- Qwen3-VL로 PDF 이미지 표/그래프 유사도 분석

### HWPX 지원
- 최신 HWPX (XML 기반) 형식: python-hwpx 라이브러리
- HWP (바이너리) + HWPX (XML) 동시 지원

---

## 16. 참고 자료

### 상용 솔루션 벤치마킹
- [카피킬러](https://www.copykiller.com/) - 6어절 규칙 참고
- [턴잇인 (Turnitin)](https://www.turnitin.com/) - 하이브리드 검색 참고
- [KCI 문헌 유사도 검사](https://check.kci.go.kr/)

### 핵심 기술 문서
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [FlagEmbedding (BGE-M3)](https://github.com/FlagOpen/FlagEmbedding)
- [Qdrant Hybrid Search](https://qdrant.tech/documentation/concepts/hybrid-queries/)
- [datasketch (MinHash LSH)](https://ekzhu.com/datasketch/)
- [KoNLPy (한국어 NLP)](https://konlpy.org/)
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

이 계획서는 오픈소스 기술만으로 **카피킬러, 턴잇인 수준의 정밀도**를 구현하도록 설계되었습니다.
FastAPI(Python) 백엔드 전환으로 한국어 NLP, HWP 직접 지원, BGE-M3 하이브리드 임베딩의 이점을 최대한 활용합니다.
