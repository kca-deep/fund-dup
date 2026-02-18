# 프로덕션 구현 체크리스트

> `docs/implementation-plan.md` 기반 실행 가능한 단계별 작업 목록.
> 각 Phase는 순차적으로 진행하며, 완료 검증을 통과해야 다음 Phase로 진행한다.

---

## 0. 사전 준비

### 서버 환경

- [ ] Linux 서버 준비 (Ubuntu 22.04+ 권장)
- [ ] Docker 및 Docker Compose 설치
- [ ] NVIDIA Container Toolkit 설치 (GPU 사용 시)
- [ ] 포트 가용성 확인: 3000, 8000, 5432, 6333, 6379, 11434
- [ ] 디스크 공간 확인: 50GB 이상 (모델 + Docker + DB)

### GPU 확인 (선택)

- [ ] `nvidia-smi` 정상 동작 확인
- [ ] VRAM 12GB 이상 (BGE-M3 ~2GB + Qwen3-VL ~8GB)
- [ ] Docker에서 GPU 접근 가능 확인: `docker run --gpus all nvidia/cuda:12.0-base nvidia-smi`

---

## 1. Phase 1: 인프라 & 기반 구축

> **목표:** `docker compose up`으로 전체 서비스 실행, `GET /api/v1/health` 정상 응답

### 1.1 Python 프로젝트 초기화

- [ ] `backend/` 디렉토리 생성
- [ ] `pyproject.toml` 작성 (프로젝트 메타데이터)
- [ ] `requirements.txt` 작성 (전체 의존성)
- [ ] `app/__init__.py` 생성
- [ ] `app/main.py` — FastAPI 앱 스켈레톤 (lifespan, 라우터 등록)

### 1.2 환경 설정

- [ ] `app/config.py` — pydantic-settings BaseSettings 클래스
- [ ] `backend/.env.example` 작성 (전체 설정 키 + 기본값)
- [ ] `backend/.env` 로컬 환경 설정 (`.gitignore`에 추가)

### 1.3 데이터베이스 설정

- [ ] `app/db/session.py` — AsyncSession, async_sessionmaker 설정
- [ ] `app/db/models.py` — Document, CheckResult 모델 정의
  - [ ] documents 테이블 (id, filename, file_type, status, minhash_signature 등)
  - [ ] check_results 테이블 (id, document_id FK, overall_rate, detail_json 등)
  - [ ] 인덱스 정의 (status, is_reference, created_at, document_id)
- [ ] Alembic 초기화: `alembic init alembic`
- [ ] `alembic.ini` — DB URL 설정
- [ ] 첫 마이그레이션 생성 및 적용

### 1.4 Docker 설정

- [ ] `backend/Dockerfile` 작성
  - [ ] python:3.12-slim 베이스
  - [ ] build-essential 설치
  - [ ] requirements.txt → pip install
  - [ ] uvicorn 실행 CMD
- [ ] `compose.yaml` 업데이트
  - [ ] backend 서비스 추가 (포트 8000, 환경변수, 볼륨)
  - [ ] arq-worker 서비스 추가 (backend과 동일 이미지, 다른 CMD)
  - [ ] frontend 서비스 추가 (또는 로컬 실행)
  - [ ] model_cache 볼륨 추가 (BGE-M3 캐시)
  - [ ] uploads_data 볼륨 추가
- [ ] `docker compose up -d` 전체 서비스 실행 확인
- [ ] 각 서비스 정상 기동 확인 (`docker compose ps`)

### 1.5 Qdrant 초기화

- [ ] `app/core/rag/indexer.py` — Collection 생성 함수
  - [ ] Dense 벡터: 1024차원, Cosine, on_disk=True
  - [ ] Sparse 벡터: IDF modifier
  - [ ] Payload 인덱스: document_id (KEYWORD), category (KEYWORD)
- [ ] lifespan에서 Collection 존재 여부 확인 후 자동 생성
- [ ] Qdrant 대시보드(http://localhost:6333/dashboard)에서 컬렉션 확인

### 1.6 Frontend-Backend 연동

- [ ] `next.config.ts` rewrite 규칙 추가: `/api/backend/:path*` → FastAPI
- [ ] `app/api/v1/health.py` 헬스체크 API 구현
  - [ ] PostgreSQL 연결 확인
  - [ ] Qdrant 연결 확인
  - [ ] Redis 연결 확인
- [ ] 브라우저에서 `/api/backend/health` 호출 확인

### Phase 1 완료 검증

- [ ] `docker compose up -d` → 모든 서비스 Running
- [ ] `curl http://localhost:8000/api/v1/health` → 200 OK, 모든 서비스 정상
- [ ] 프론트엔드에서 `/api/backend/health` 프록시 동작 확인
- [ ] Qdrant 대시보드에서 `business_proposals` 컬렉션 존재
- [ ] Alembic 마이그레이션 적용 → PostgreSQL 테이블 생성 확인
- [ ] Ollama 모델 다운로드: `docker exec -it ollama ollama pull qwen3-vl`

---

## 2. Phase 2: 문서 처리 파이프라인

> **목표:** PDF/DOCX/HWP 업로드 → 전처리 → 청킹 → 임베딩 → Qdrant 인덱싱 동작

### 2.1 문서 로딩

- [ ] `app/core/pipeline/loader.py` — File Router 구현
  - [ ] PDF 로더: pymupdf4llm → Markdown 텍스트
  - [ ] DOCX 로더: python-docx → 플레인 텍스트
  - [ ] HWP 로더: pyhwp (hwp5txt CLI) → 플레인 텍스트
  - [ ] 확장자 기반 자동 로더 선택
- [ ] 각 로더별 테스트 파일 준비 (PDF, DOCX, HWP 샘플)
- [ ] 로더 단위 테스트 작성

### 2.2 전처리

- [ ] `app/core/pipeline/preprocessor.py` — 지능형 필터링
  - [ ] 참고문헌/Bibliography 이후 전체 삭제
  - [ ] 법령 표기 제거 (`제N조`, `[법 제N조]`)
  - [ ] 인용구 제거 (큰따옴표, 작은따옴표 내부)
  - [ ] 목차 패턴 제거
  - [ ] 인라인 인용 제거 (`[1]`, `【1】`, `(2024)`)
  - [ ] 페이지 번호 제거
  - [ ] 연속 공백 정리
- [ ] 전처리 단위 테스트 (각 규칙별)

### 2.3 한국어 NLP (Kiwi)

- [ ] lifespan에서 `kiwipiepy.Kiwi()` 인스턴스 초기화 → `app.state.kiwi`
- [ ] 형태소 분석 유틸리티 함수
  - [ ] 실질 형태소 추출 (명사 NNG/NNP, 동사 VV, 형용사 VA, 어근 XR)
  - [ ] POS 태그 필터링
- [ ] 문장 분리: `kiwi.split_into_sents()` 래퍼
- [ ] Kiwi 형태소 분석 단위 테스트 (한국어 샘플 텍스트)

### 2.4 텍스트 청킹

- [ ] `app/core/pipeline/chunker.py` — 청킹 모듈
  - [ ] RecursiveCharacterTextSplitter 설정
  - [ ] chunk_size=1000, chunk_overlap=200
  - [ ] separators: `\n\n`, `\n`, `. `, ` `
- [ ] 청킹 결과 검증 (청크 크기, 오버랩 확인)

### 2.5 BGE-M3 임베딩

- [ ] `app/core/pipeline/embedder.py` — BGEm3Embedder 클래스
  - [ ] BGEM3FlagModel 로딩 (fp16 모드)
  - [ ] `encode_sync()` — Dense + Sparse 동시 생성
  - [ ] `encode()` — 비동기 래퍼 (run_in_executor)
  - [ ] 배치 처리 (batch_size=32)
- [ ] lifespan에서 모델 로딩 → `app.state.embedding_model`
- [ ] 임베딩 출력 형태 검증 (Dense: 1024차원, Sparse: dict)
- [ ] Sparse → Qdrant SparseVector 변환 유틸리티

### 2.6 문서 등록 API

- [ ] `app/api/v1/documents.py` — POST /documents
  - [ ] 파일 업로드 수신 (multipart/form-data)
  - [ ] 파일 검증 (확장자, 크기 10MB)
  - [ ] UUID 기반 파일명으로 저장
  - [ ] 전체 파이프라인 실행: 로딩 → 전처리 → 청킹 → 임베딩
  - [ ] Qdrant 벡터 인덱싱 (배치 upsert)
  - [ ] PostgreSQL 메타데이터 저장 (Document 레코드)
  - [ ] MinHash 지문 생성 및 저장
- [ ] `app/schemas/document.py` — 요청/응답 Pydantic 스키마
- [ ] API 통합 테스트 (파일 업로드 → DB + Qdrant 확인)

### Phase 2 완료 검증

- [ ] PDF 파일 업로드 → Document 레코드 생성 (status=COMPLETED)
- [ ] DOCX 파일 업로드 → 정상 처리
- [ ] HWP 파일 업로드 → 정상 처리
- [ ] Qdrant 대시보드에서 포인트(벡터) 확인
- [ ] PostgreSQL에서 문서 메타데이터 확인
- [ ] 전처리 후 참고문헌/법령 제거 확인
- [ ] 청크 크기가 ~1000자 범위인지 확인

---

## 3. Phase 3: 3-Phase 분석 엔진

> **목표:** 유사도 검사 API 동작, 정확도 Precision ≥ 0.8

### 3.1 Phase 0 — MinHash 사전 필터링

- [ ] `app/core/analysis/minhash.py` — MinHashIndex 클래스
  - [ ] Kiwi POS 태깅 → 실질 형태소 추출
  - [ ] 3-gram shingles 생성
  - [ ] datasketch MinHash 지문 생성 (num_perm=128)
  - [ ] LSH 인덱스 등록 (`add_document`)
  - [ ] LSH 쿼리 (`query_candidates`) — Jaccard > 0.3 후보 반환
- [ ] 앱 시작 시 PostgreSQL에서 기존 MinHash 지문 로딩 → LSH 인덱스 재구축
- [ ] MinHash 필터링 단위 테스트 (유사 문서 → 후보에 포함 확인)

### 3.2 Phase 1 — 6어절 규칙 검사

- [ ] `app/core/analysis/six_word_rule.py` — SixWordRuleChecker 클래스
  - [ ] Kiwi 형태소 분석 → 실질 형태소 리스트 생성
  - [ ] `check()` — difflib.SequenceMatcher 최장 연속 일치 블록 탐색
  - [ ] 6어절 이상 → EXACT_COPY 판정, 점수 1.0 강제
  - [ ] `find_all_matches()` — 4어절 이상 모든 일치 구간 반환
  - [ ] 반환: 일치 여부, 일치 텍스트, 어절 수, 시작/종료 인덱스
- [ ] 6어절 규칙 단위 테스트
  - [ ] 동일 텍스트 → EXACT_COPY
  - [ ] 조사 변형 → 정규화 후 탐지
  - [ ] 무관한 텍스트 → 미탐지

### 3.3 Phase 2 — Hybrid Search + 코사인 보정

- [ ] `app/core/rag/retriever.py` — hybrid_search 함수
  - [ ] Qdrant query_points: Prefetch (Dense top_k×4 + Sparse top_k×4)
  - [ ] Fusion: RRF
  - [ ] 자기 자신 문서 제외 필터 (`must_not`)
  - [ ] Dense 벡터 함께 반환 (`with_vectors={"dense": True}`)
  - [ ] 코사인 유사도 재계산 (np.dot / norm)
- [ ] 반환: document_id, filename, chunk_index, content, rrf_score, cosine_score
- [ ] Hybrid Search 통합 테스트 (기존 문서 등록 → 유사 문서 검색)

### 3.4 최종 판정 결합

- [ ] `app/core/analysis/judge.py` — 판정 로직
  - [ ] PlagiarismType enum: EXACT_COPY, SEMANTIC, CLEAN
  - [ ] SimilarityGrade enum: very_high(≥0.85), high(0.70~), medium(0.50~), low(<0.50)
  - [ ] DocumentGrade enum: DANGER, WARNING, SAFE
  - [ ] `determine_plagiarism_type()` — Phase 1 + 2 결합
  - [ ] `calculate_overall_similarity()` — 청크 길이 가중 평균
  - [ ] `get_document_grade()` — 전체 문서 등급
- [ ] 판정 로직 단위 테스트 (각 등급별 경계값 검증)

### 3.5 통합 오케스트레이터

- [ ] `app/services/check_service.py` — perform_similarity_check
  - [ ] 문서 로딩 → 전처리 → 청킹
  - [ ] Phase 0: MinHash 후보 필터링
  - [ ] BGE-M3 임베딩 생성
  - [ ] 청크별 반복: Phase 2 (Hybrid Search) + Phase 1 (6어절 규칙)
  - [ ] 최종 판정 결합
  - [ ] 결과 반환: overall_similarity, overall_grade, statistics, chunks[]
- [ ] `app/api/v1/similarity.py` — POST /similarity/check
  - [ ] 파일 업로드 수신
  - [ ] check_service 호출
  - [ ] 결과 JSON 반환
- [ ] `app/schemas/similarity.py` — 검사 결과 Pydantic 스키마
- [ ] PostgreSQL에 CheckResult 저장

### Phase 3 완료 검증

- [ ] 동일 문서 업로드 → EXACT_COPY 탐지, DANGER 등급
- [ ] 유사 문서 (말 바꾸기) → SEMANTIC 탐지, high/very_high
- [ ] 무관한 문서 → CLEAN, SAFE 등급
- [ ] 정확도 벤치마크: 테스트 데이터 준비 → Precision ≥ 0.8 확인
- [ ] MinHash 필터링으로 후보 축소 확인 (전체 대비 감소율)
- [ ] 코사인 유사도 재계산 값이 합리적인 범위인지 확인

---

## 4. Phase 4: API 완성 & 프론트엔드 연동

> **목표:** 프론트엔드 E2E 동작 — 업로드 → 분석 → 결과 시각화

### 4.1 문서 관리 API 완성

- [ ] GET /api/v1/documents — 목록 조회 (페이지네이션, 카테고리 필터)
- [ ] GET /api/v1/documents/{id} — 상세 조회
- [ ] DELETE /api/v1/documents/{id} — 삭제 (DB + Qdrant 포인트 + 파일)
- [ ] POST /api/v1/documents/batch — 배치 등록 (ARQ 큐 등록)

### 4.2 비동기 검사 API

- [ ] POST /api/v1/similarity/check/async — ARQ 작업 등록, job_id 반환
- [ ] GET /api/v1/similarity/check/status/{job_id} — 상태/결과 조회
- [ ] GET /api/v1/similarity/results/{id} — 저장된 검사 결과 조회

### 4.3 스키마 & 에러 처리

- [ ] 공통 응답 형식: `{ success, data }` / `{ success, error: { code, message } }`
- [ ] 파일 검증 에러 (확장자, 크기, MIME)
- [ ] 문서 미존재 에러 (404)
- [ ] 서비스 장애 에러 (Qdrant/DB 연결 실패)

### 4.4 프론트엔드 Mock → API 전환

- [ ] @tanstack/react-query 설치 및 QueryClient 설정
- [ ] `FileUpload` 컴포넌트: Mock → `POST /api/backend/similarity/check` 호출
- [ ] `ResultDashboard` 컴포넌트: mockCheckResult → API 응답 데이터
- [ ] `DocumentList` 컴포넌트: mockDocuments → `GET /api/backend/documents`
- [ ] 문서 삭제 기능 연동
- [ ] 에러 상태 처리 (로딩, 에러, 빈 결과)

### Phase 4 완료 검증

- [ ] 프론트엔드에서 파일 업로드 → 실제 분석 → 결과 표시 E2E 동작
- [ ] 문서 목록 페이지에서 등록된 문서 표시
- [ ] 문서 삭제 → DB, Qdrant, 파일 모두 제거 확인
- [ ] Side-by-Side diff 뷰어에 실제 유사 구간 표시
- [ ] 에러 발생 시 사용자 친화적 메시지 표시

---

## 5. Phase 5: 대용량 처리 & 최적화

> **목표:** 1,000건 배치 인덱싱 < 1시간, 동시 5건 검사 30초 이내

### 5.1 ARQ Worker

- [ ] `app/workers/settings.py` — WorkerSettings 설정
  - [ ] Redis 연결
  - [ ] 동시성 설정
  - [ ] 재시도 정책 (최대 3회)
  - [ ] 작업 타임아웃 (10분)
- [ ] `app/workers/tasks.py` — 비동기 작업 정의
  - [ ] `perform_check_task` — 유사도 검사
  - [ ] `perform_index_task` — 문서 인덱싱
  - [ ] `perform_batch_index_task` — 배치 인덱싱
- [ ] 워커 실행 확인: `arq app.workers.settings.WorkerSettings`
- [ ] 작업 실패 시 문서 상태 ERROR + 에러 메시지 저장

### 5.2 SSE 실시간 진행

- [ ] 검사 진행 상태 SSE 엔드포인트
  - [ ] `progress` 이벤트: `{ phase, current, total, percent }`
  - [ ] `complete` 이벤트: `{ result }`
  - [ ] `error` 이벤트: `{ message }`
- [ ] 프론트엔드 SSE 수신 및 프로그레스 바 표시

### 5.3 성능 최적화

- [ ] 배치 임베딩 크기 튜닝 (GPU 유무에 따라 조정)
- [ ] Qdrant 인덱스 최적화 (HNSW 파라미터)
- [ ] 임베딩 캐싱 (동일 청크 재계산 방지)
- [ ] Rate Limiting 적용 (slowapi 또는 Redis 기반)

### 5.4 성능 테스트

- [ ] 단일 문서 검사 응답 시간 측정 (목표: < 30초)
- [ ] 1,000건 배치 인덱싱 시간 측정 (목표: < 1시간)
- [ ] 동시 5건 검사 부하 테스트 (목표: 30초 이내)
- [ ] 메모리 사용량 프로파일링 (BGE-M3 ~2GB 확인)

### Phase 5 완료 검증

- [ ] ARQ Worker가 비동기 작업 정상 처리
- [ ] 1,000건 배치 인덱싱 < 1시간
- [ ] 동시 5건 검사 시 30초 이내 응답
- [ ] SSE로 실시간 진행 상태 표시
- [ ] 작업 실패 시 재시도 → 최종 실패 시 ERROR 상태

---

## 6. Phase 6: 고급 기능 (향후)

- [ ] LLM 기반 표절/인용 판단 (RAG Chain + Qwen3-VL)
- [ ] PDF 이미지/표 유사도 분석 (Vision-Language)
- [ ] Cross-encoder Re-ranking (BGE-reranker-v2-m3)
- [ ] 검사 보고서 자동 생성 (PDF 출력)
- [ ] 사용자 커스텀 규칙 설정 (임계값 조정)
- [ ] HWPX 지원 (python-hwpx)
- [ ] JWT 인증/인가

---

## 부록: 주요 커맨드 참조

### 인프라 실행/중지

```bash
docker compose up -d          # 전체 서비스 시작
docker compose down           # 전체 서비스 중지
docker compose ps             # 서비스 상태 확인
docker compose logs backend   # 백엔드 로그 확인
```

### Ollama 모델

```bash
docker exec -it ollama ollama pull qwen3-vl    # LLM 모델
```

### DB 마이그레이션

```bash
cd backend
alembic revision --autogenerate -m "설명"   # 마이그레이션 생성
alembic upgrade head                         # 마이그레이션 적용
```

### 테스트

```bash
cd backend
pytest tests/unit/              # 단위 테스트
pytest tests/integration/       # 통합 테스트
pytest -v --tb=short            # 상세 출력
```

### 프론트엔드

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```
