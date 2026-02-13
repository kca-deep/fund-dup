# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

사업계획서 유사도 검사 시스템 - A business proposal similarity detection system that compares uploaded documents against existing submissions to detect plagiarism. Uses a 2-track approach: rule-based (6-word consecutive match) and AI-based (semantic similarity via hybrid vector search).

**Current Status**: UI/frontend complete with mock data. Backend analysis pipeline not yet implemented.

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Infrastructure Setup

```bash
# Start all services (Ollama, Qdrant, PostgreSQL, Redis)
docker compose up -d

# Stop all services
docker compose down

# Download required Ollama models
docker exec -it ollama ollama pull qwen3-vl
docker exec -it ollama ollama pull bge-m3

# Initialize database
npx prisma migrate dev
npx prisma generate
```

## Architecture

### 2-Track Plagiarism Detection

1. **Track 1 (Rule-based)**: 6+ consecutive Korean words matching = `EXACT_COPY`
2. **Track 2 (AI-based)**: Hybrid vector search (Dense BGE-M3 + Sparse BM25) = `SEMANTIC`

Final judgment uses the higher risk result from both tracks.

### Core Data Flow (Planned)

```
Upload → LangChain Loader → Preprocessing (remove citations/refs)
→ Chunking (1000 chars) → Hybrid Search → 6-word Rule + Semantic Score → Result
```

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `components/` - React components (shadcn/ui base-lyra variant)
- `components/ui/` - shadcn/ui primitives with Base UI + HugeIcons
- `lib/` - Utilities and shared logic
- `lib/types/` - TypeScript type definitions (e.g., BusinessMetaInfo for proposal metadata)
- `prisma/` - Database schema (Document, Paragraph, CheckResult, JobQueue)

### Planned Directories (Not Yet Created)

- `lib/langchain/` - Document loading, embedding, similarity analysis
- `lib/analysis/` - 6-word rule engine using `diff` library
- `app/api/` - Next.js API routes for similarity check

### External Services (via Docker)

| Service | Port | Purpose |
|---------|------|---------|
| Ollama | 11434 | LLM (qwen3-vl) & embeddings (bge-m3, 1024 dim) |
| Qdrant | 6333 | Hybrid vector DB (Dense + Sparse) |
| PostgreSQL | 5432 | Metadata storage |
| Redis | 6379 | Job queue (BullMQ) |

## Similarity Thresholds

- `EXACT_COPY`: 6+ consecutive words match (red)
- `very_high`: ≥0.85 similarity (red)
- `high`: 0.70-0.85 (orange)
- `medium`: 0.50-0.70 (yellow)
- `low`: <0.50 (green)

Document grades: `DANGER` (any EXACT_COPY), `WARNING` (≥50% overall), `SAFE`

## File Formats

Currently supported: PDF, DOCX (via LangChain loaders)
HWP support: Planned for future release (Python microservice)

## Key Implementation Notes

- Next.js 16 with App Router and React 19
- shadcn/ui with base-lyra style variant, neutral base color, JetBrains Mono font, and HugeIcons (see `components.json`)
- Prisma 7 ORM with PostgreSQL (currently stubbed in `lib/prisma.ts`)
- react-dropzone for file uploads
- react-diff-viewer-continued for side-by-side diff visualization
- TanStack Query for data fetching
- Preprocessing removes: citations, table of contents, legal references, bibliography
- Korean currency formatting utilities in `lib/types/meta-info.ts`

## Data Types

Key interfaces in `lib/types/meta-info.ts`:
- `BusinessMetaInfo` - Proposal metadata (project name, organization, budget, period, etc.)
- `CheckResultData` - Similarity check results with chunk-level matches
- `UploadedFile` - File upload state with extraction progress
