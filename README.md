<div align="center">

# Smart AI Customer Support & RAG Knowledge Platform

**A full-stack, multi-tenant AI Customer Support platform powered by Retrieval-Augmented Generation (RAG).**

Upload internal knowledge, index it into vector embeddings, and deploy branded AI support assistants via embeddable widgets or a REST API - running fully offline with Ollama or in the cloud with Gemini/OpenAI.

[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama-000000)](https://ollama.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](#license)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Environment Configuration](#environment-configuration)
8. [Running Locally](#running-locally)
9. [Available Scripts](#available-scripts)
10. [Architecture & Core Systems](#architecture--core-systems)
11. [Embedding the Widget](#embedding-the-widget)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)
15. [License](#license)

---

## Overview

**Smart AI Customer Support** gives organizations an end-to-end solution for automated, knowledge-grounded customer support:

| Capability | Description |
|---|---|
| **Multi-Tenant Workspaces** | Create, manage, and switch between company workspaces with role-based access (`owner`, `admin`, `member`). |
| **Knowledge Ingestion** | Automatic text extraction and chunking from PDF, DOCX, TXT, and Markdown files. |
| **Vector Search** | 1024-dimensional embeddings with cosine similarity ranking via `pgvector`. |
| **RAG Inference** | Grounded response synthesis using local (Ollama) or cloud (Gemini/OpenAI) models. |
| **Embeddable Widget** | White-label, floating chat widget with live theming and secure iframe isolation. |
| **Developer API** | Scoped API keys (`live_` / `test_`) with granular rate limiting for programmatic access. |

---

## Key Features

- **Strict Tenant Isolation** - every table scoped by `company_id`, enforced by workspace routing guards.
- **Multi-Format Document Parsing** - PDF (`pdf-parse`), DOCX (`mammoth`), and raw TXT/Markdown via UTF-8 ingestion.
- **Flexible AI Providers** - swap between local and cloud models without code changes:
  - **Ollama** (offline, privacy-first): `qwen3:1.7b` for generation, `qwen3-embedding:0.6b` for embeddings.
  - **Google Gemini** (cloud-scale): `gemini-2.0-flash` for generation, `text-embedding-004` for embeddings.
- **Firebase Authentication** - Email/Password, Google OAuth, password reset, plus a dev-bypass mode for automated testing.
- **Dual Database Support** - standard PostgreSQL + `pgvector`, or zero-config embedded **PGlite** with WASM `pgvector` for local development.
- **Live Embeddable Widget** - a vanilla JS loader (`widget.js`) with a responsive drawer UI and `frame-ancestors *` CSP support.
- **Audit Logs & Analytics** - track query volume, resolution rates, chunk counts, and conversation history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + pgvector (or embedded PGlite) |
| Auth | Firebase Authentication |
| AI / Embeddings | Ollama (local) | Google Gemini / OpenAI (cloud) |
| Testing | Vitest |
| Deployment | Vercel (frontend) | Node container/VM (backend) |

---

## Project Structure

```
team-pro/
|-- client/                       # React + Vite frontend
|   |-- public/
|   |   |-- demo.html             # Standalone embed widget demo
|   |   |-- test-embed.html       # Iframe embed verification page
|   |   |-- widget.html           # Hosted chat interface (iframe target)
|   |   `-- widget.js             # Embeddable widget loader script
|   `-- src/
|       |-- api/client.ts         # Fetch client w/ Auth & Tenant headers
|       |-- components/           # Reusable UI components
|       |-- contexts/             # AuthContext, TenantContext
|       |-- lib/firebase.ts       # Firebase Web SDK init
|       |-- pages/                # App views (Dashboard, Chat, Docs, Settings, ...)
|       |-- App.tsx               # Routes & tenant guards
|       `-- main.tsx              # App entry point
|
|-- server/                       # Express + TypeScript backend
|   |-- data/                     # PGlite embedded DB storage
|   |-- uploads/                  # Local knowledge document storage
|   |-- src/
|   |   |-- config/               # env.ts, firebase.ts
|   |   |-- db/                   # Connection pool + SQL migrations
|   |   |-- middleware/           # auth.ts, rateLimit.ts, tenant.ts
|   |   |-- modules/              # analytics, apiKeys, chatbot, companies,
|   |   |                         # conversations, documents, rag
|   |   |-- routes/               # apiV1.ts, appApi.ts, publicApi.ts
|   |   |-- services/             # ai/ (LLM+embeddings), storage/
|   |   |-- app.ts                # Express app & CORS config
|   |   `-- index.ts              # Server bootstrap
|   `-- __tests__/                # Vitest test suites
|
`-- README.md
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | v18+ (v20/v22 recommended) | |
| npm | v9+ | |
| Git | latest | |
| Ollama | latest | Optional - only needed for local AI inference |
| PostgreSQL | 15+ with `pgvector` | Optional - falls back to embedded PGlite |

If using local AI, pull the default models:

```bash
ollama pull qwen3:1.7b
ollama pull qwen3-embedding:0.6b
```

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/yaswanthjada1/Smart-AI-Customer-Support.git
cd "team pro"

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install
```

---

## Environment Configuration

### Backend - `server/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# Database (optional - defaults to embedded PGlite if unset)
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/rag_support
# PGLITE_DIR=./data/pglite_db

# Firebase Admin SDK
FIREBASE_PROJECT_ID=smart-ai-customer-suppor-24d0e
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=smart-ai-customer-suppor-24d0e.firebasestorage.app

# Local AI (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_GENERATION_MODEL=qwen3:1.7b
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b

# AI Provider Selection: 'ollama' | 'gemini' | 'openai' | 'mock'
LLM_PROVIDER=ollama
LLM_MODEL=qwen3:1.7b
LLM_API_KEY=

EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=qwen3-embedding:0.6b
EMBEDDING_DIMENSIONS=1024
EMBEDDING_API_KEY=

# Storage: 'local' | 'firebase'
STORAGE_PROVIDER=local

# Public widget rate limiting
PUBLIC_CHAT_RATE_WINDOW=600
PUBLIC_CHAT_RATE_LIMIT=30
```

### Frontend - `client/.env`

```env
VITE_API_URL=http://localhost:5000

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> [!] **Never commit real credentials.** Keep `.env` files out of version control and rotate any keys that were previously exposed.

---

## Running Locally

**1. Start Ollama** *(if using local AI)*

```bash
ollama serve
ollama list   # verify models are pulled
```

**2. Start the backend**

```bash
cd server
npm run dev
```
Runs at `http://localhost:5000` - health check: `http://localhost:5000/api/health`

**3. Start the frontend**

```bash
cd client
npm run dev
```
Runs at `http://localhost:5173`

---

## Available Scripts

### Backend (`server/package.json`)

| Command | Runs | Description |
|---|---|---|
| `npm run dev` | `nodemon --watch src -e ts --exec ts-node src/index.ts` | Dev server with live TypeScript reload |
| `npm run build` | `tsc` | Compile to `dist/` |
| `npm run start` | `node dist/index.js` | Run compiled production server |
| `npm run test` | `vitest run --fileParallelism=false` | Run backend test suite |
| `npm run migrate` | `ts-node src/db/runMigrations.ts` | Apply SQL schema migrations |

### Frontend (`client/package.json`)

| Command | Runs | Description |
|---|---|---|
| `npm run dev` | `vite` | Dev server with HMR |
| `npm run build` | `tsc && vite build` | Type-check and build production bundle |
| `npm run preview` | `vite preview` | Preview the production build locally |

---

## Architecture & Core Systems

### Authentication Flow
1. User signs in via Firebase Auth (Email/Password or Google) in `AuthContext.tsx`.
2. `apiClient` (`client/src/api/client.ts`) attaches the Firebase ID token as `Authorization: Bearer <idToken>` on every request.
3. `server/src/middleware/auth.ts` verifies the token via `firebase-admin` (or resolves dev tokens in development), extracting `uid`, `email`, `name`.
4. The backend upserts the user into the `users` table via `syncUser()`.

### Database & Multi-Tenancy
- `server/src/db/index.ts` attempts `DATABASE_URL` first, falling back to embedded **PGlite** with vector extensions if unavailable.
- Tenant-scoped tables (`documents`, `document_chunks`, `conversations`, `messages`, `api_keys`, `chatbot_configs`) all reference `company_id`.
- `/api/app/*` routes pass through `requireTenantMembership` (`server/src/middleware/tenant.ts`), verifying active membership in `company_members`.

### AI & RAG Pipeline
- LLM/embedding operations are abstracted behind provider interfaces in `server/src/services/ai/`.
- `OllamaProvider.generateEmbedding(s)` calls `/api/embed` with `qwen3-embedding:0.6b` -> 1024-dim vectors.
- Retrieval (`server/src/modules/rag/ragService.ts`) ranks chunks by cosine distance:

```sql
SELECT chunk_id, content, 1 - (embedding <=> $1::vector) AS similarity
FROM document_chunks
WHERE company_id = $2
ORDER BY embedding <=> $1::vector ASC
LIMIT 5;
```

- Retrieved chunks are injected into a grounded system prompt to minimize hallucination.

---

## Embedding the Widget

Add the assistant to any external site with a single script tag:

```html
<!-- Smart AI Chatbot Widget -->
<script
  src="https://your-domain.com/widget.js"
  data-company-id="YOUR_COMPANY_ID"
  data-api-url="https://your-api-domain.com"
  defer>
</script>
```

- Renders an isolated iframe (`widget.html`) with your configured branding, colors, and greeting.
- Backed by `/api/public/widget-config/:companyId` and `/api/public/chat` - CORS-open, rate-limited to **30 requests / 10 minutes / IP**.

---

## Deployment

### Frontend (Vercel)
`client/vercel.json` defines SPA rewrites and widget CORS headers:
- Root/dashboard routes rewrite to `/index.html`.
- `/widget.js` and `/widget` set `Content-Security-Policy: frame-ancestors *` for cross-origin embedding.
- Build command: `npm run build` | Output directory: `dist`

### Backend
Runs in any standard Node.js container or VM (Render, Railway, AWS ECS, GCP Cloud Run, or a VPS).

```bash
npm run build
npm run start
```

Ensure `PORT`, `DATABASE_URL`, Firebase credentials, and AI provider keys are set in the host environment.

---

## Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `Ollama embedding error (qwen3-embedding:0.6b at http://localhost:11434)` | Ollama daemon offline, or model not pulled | Run `ollama serve`, then `ollama pull qwen3-embedding:0.6b` and `ollama pull qwen3:1.7b` |
| CORS preflight blocked (`No Access-Control-Allow-Origin`) | Backend unreachable / returning 502-503 via proxy or tunnel | Confirm the server is running on `PORT=5000` and `/api/health` responds |
| PostgreSQL / PGlite lock conflicts | Stale `postmaster.pid` left by an abrupt process kill | Stop existing server processes; delete `server/data/pglite_db/postmaster.pid` if needed |
| Firebase authentication errors | Missing/invalid Firebase Web config in `client/.env` | Verify `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` match your Firebase console |

---

## Contributing

Contributions are welcome! To propose a change:

1. Fork the repository and create a feature branch.
2. Make your changes with clear, focused commits.
3. Run `npm run test` (server) to confirm nothing is broken.
4. Open a pull request describing the change and motivation.

---

## License

Distributed under the MIT License. See `LICENSE` for details.