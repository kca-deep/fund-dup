# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

사업계획서 유사도 검사 시스템 (ICT기금 중복수급 AI기반 유사도검증) — compares uploaded Korean business proposals against existing submissions to detect plagiarism using a 3-Phase approach: MinHash pre-filtering, rule-based 6-word match, and AI semantic similarity via hybrid vector search.

**Current Status**: Frontend UI complete with mock data. Backend (FastAPI + Python) not yet implemented.

## Development Commands

```bash
npm run dev      # Start Next.js dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Infrastructure

```bash
docker compose up -d                              # Start Ollama, Qdrant, PostgreSQL, Redis
docker compose down                               # Stop all
docker exec -it ollama ollama pull qwen3-vl       # Vision-Language LLM
docker exec -it ollama ollama pull bge-m3         # Embedding model
npx prisma migrate dev                            # DB migration
npx prisma generate                               # Generate Prisma client types
```

| Service    | Port  | Purpose                          |
|------------|-------|----------------------------------|
| Ollama     | 11434 | LLM only (qwen3-vl) — embeddings via FlagEmbedding |
| Qdrant     | 6333  | Hybrid vector DB (Dense + Sparse)   |
| PostgreSQL | 5432  | Metadata (user: funddup, db: fund_dup) |
| Redis      | 6379  | ARQ job queue                       |

## Architecture

### Two-Service Split

- **Frontend**: Next.js 16 (App Router) — complete, serves UI and proxies API calls
- **Backend**: FastAPI (Python) — planned, handles document processing and similarity analysis

Frontend talks to backend via Next.js rewrite proxy (`/api/backend/:path*` → FastAPI `:8000`).

### 3-Phase Plagiarism Detection

1. **Phase 0** (MinHash/LSH via datasketch): Pre-filter 1,000+ docs to ~50 candidates in ms
2. **Phase 1** (Rule-based): 6+ consecutive Korean morphemes match (Kiwi) = `EXACT_COPY`
3. **Phase 2** (AI-based): BGE-M3 Dense+Sparse hybrid search (Qdrant RRF) → cosine similarity = `SEMANTIC`

Final judgment: higher risk from Phase 1 vs Phase 2. Score thresholds:
- `EXACT_COPY`: 6+ word match → score forced to 1.0 (red)
- `very_high`: >=0.85 (red), `high`: 0.70-0.85 (orange), `medium`: 0.50-0.70 (yellow), `low`: <0.50 (green)
- Document grades: `DANGER` (any EXACT_COPY), `WARNING` (>=50% overall), `SAFE`

### Frontend Pages

- `/` — File upload (react-dropzone) + process log viewer → navigates to `/result` on completion
- `/result` — Results dashboard with chunk-level scoring + side-by-side diff viewer (react-diff-viewer-continued)
- `/docu` — Document management (reference docs vs submissions, search/delete)

### Key Data Types

Defined inline in components (not centralized):
- `CheckResultData` in `components/result-dashboard.tsx` — full check result with chunks and matches
- `BusinessMetaInfo` in `lib/types/meta-info.ts` — proposal metadata (project name, org, budget, period)
- `UploadedFile` in `components/file-upload.tsx` — upload state machine (pending→uploading→extracting→processing→completed)
- `ProcessLogEntry` in `lib/types/process-log.ts` — terminal-style log events
- `Document` in `components/document-list.tsx` — document list item

### Mock Data

`lib/mock-data.ts` provides `mockCheckResult` (12 chunks, 68% similarity, DANGER grade) and `mockDocuments` (3 docs). The result page and document page use these directly. File upload simulates 9 log events with timeouts.

### Frontend-Backend Boundary

All backend calls are currently mocked. Components that will need real API integration:
- `FileUpload` — simulates upload + processing, will call `POST /api/v1/similarity/check`
- `ResultDashboard` — reads `mockCheckResult`, will fetch from `GET /api/v1/similarity/results/{id}`
- `DocumentList` — reads `mockDocuments`, will fetch from `GET /api/v1/documents`

### Backend (Planned — `backend/` directory)

FastAPI + Python with: SQLAlchemy 2.0 (replacing Prisma for backend), FlagEmbedding (BGE-M3 dense+sparse), Kiwi/kiwipiepy (Korean morphological analysis, pip-only install, cross-platform), datasketch (MinHash/LSH), ARQ (async Redis job queue). See `docs/implementation-plan.md` for full details.

## Conventions

- **shadcn/ui**: `base-lyra` style variant, `neutral` base color, HugeIcons icon library, Base UI primitives (see `components.json`)
- **Fonts**: JetBrains Mono as primary `--font-sans`, Geist as fallback
- **Imports**: `@/*` path alias from project root
- **Components**: All interactive components use `"use client"` directive
- **State**: React hooks only (useState/useCallback/useMemo) — no Redux or Context
- **Styling**: Tailwind CSS v4 with `cn()` utility (clsx + tailwind-merge). Custom CSS vars for `danger`/`warning`/`safe` plagiarism colors in `app/globals.css`
- **Prisma**: Currently stubbed in `lib/prisma.ts` (returns empty arrays). Schema in `prisma/schema.prisma` has Document, Paragraph, CheckResult, JobQueue models
- **Language**: Korean UI text throughout. Korean currency formatting in `lib/types/meta-info.ts` (`formatBudget`)
