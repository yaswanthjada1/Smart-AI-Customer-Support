# Smart AI Customer Support & RAG Knowledge Platform

> **Note**: This documentation describes the existing codebase, architecture, scripts, configuration, and workflows without altering application behavior.

A full-stack, multi-tenant AI Customer Support and Retrieval-Augmented Generation (RAG) platform. The application empowers organizations to create dedicated workspaces, upload internal knowledge documents (PDF, DOCX, TXT, MD), index them into vector embeddings, customize interactive customer-facing chat widgets, and deploy AI assistants via iframe embed scripts or REST APIs.

---

## 📑 Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Key Features](#2-key-features)
- [3. Project Structure](#3-project-structure)
- [4. Prerequisites & System Requirements](#4-prerequisites--system-requirements)
- [5. Installation](#5-installation)
- [6. Environment Configuration](#6-environment-configuration)
- [7. Running the Application Locally](#7-running-the-application-locally)
- [8. Available Scripts & Commands](#8-available-scripts--commands)
- [9. Architecture & Core Systems](#9-architecture--core-systems)
  - [Authentication Flow](#authentication-flow)
  - [Database & Multi-Tenant Architecture](#database--multi-tenant-architecture)
  - [AI & Ollama Integration](#ai--ollama-integration)
  - [Public Widget & Embed System](#public-widget--embed-system)
- [10. Deployment](#10-deployment)
- [11. Troubleshooting Guide](#11-troubleshooting-guide)

---

## 1. Project Overview

**Smart AI Customer Support** provides an end-to-end multi-tenant solution for automated customer support:
- **Tenant Management**: Multi-workspace organization model where users can create, manage, and switch between company workspaces with role-based access control (`owner`, `admin`, `member`).
- **Knowledge Ingestion & Vector Search**: Automatic text extraction and chunking from PDF, DOCX, TXT, and Markdown files, transformed into 1024-dimensional dense vector embeddings with cosine similarity distance ranking.
- **RAG Inference Pipeline**: Grounded retrieval and response synthesis using either local offline AI models (via Ollama) or cloud providers (Google Gemini / OpenAI).
- **Customizable Customer Widget**: White-label, floating chat widget with live theme customization, greeting messages, and secure iframe isolation.
- **Developer API & Webhooks**: Programmatic chat endpoints protected by scoped API keys (`live_` / `test_`) with granular rate limiting.

---

## 2. Key Features

- **Multi-Tenant Isolation**: Strict logical database isolation using `company_id` foreign keys and workspace routing guards.
- **Multi-Format Document Parsing**:
  - PDF extraction via `pdf-parse`
  - DOCX extraction via `mammoth`
  - Raw text / Markdown via UTF-8 buffer ingestion
- **Vector Search & Embedding Dimensions**: Standardized 1024-dimensional embeddings with PostgreSQL `pgvector` (`vector(1024)`) and cosine distance indexing (`<=>`).
- **Flexible LLM & Embedding Providers**:
  - **Local AI (Ollama)**: Offline, privacy-first generation and embeddings (e.g. `qwen3:1.7b` and `qwen3-embedding:0.6b` at `http://localhost:11434`).
  - **Google Gemini**: Cloud-scale generation (`gemini-2.0-flash`) and embeddings (`text-embedding-004`).
- **Authentication**:
  - Firebase Authentication (Email/Password, Google OAuth, Password Reset)
  - Development bypass mode for automated integration testing and local simulation.
- **Dual Database Support**:
  - Standard PostgreSQL with `pgvector` extension
  - Embedded in-process PostgreSQL (**PGlite**) with dynamic `pgvector` WASM loading for zero-config local development and testing.
- **Live Embeddable Widget**: Standalone vanilla JavaScript widget loader (`widget.js`) with responsive drawer UI (`demo.html`, `test-embed.html`) and CSP `frame-ancestors *` support.
- **Audit Logs & Analytics**: Track query volumes, resolution rates, document chunk counts, and conversation histories.

---

## 3. Project Structure

The repository is organized into a decoupled client-server architecture:

```
team-pro/
├── client/                     # Frontend Single Page Application (React + Vite)
│   ├── public/                 # Static assets & embed widget distribution
│   │   ├── demo.html           # Interactive standalone embed widget demo
│   │   ├── test-embed.html     # Verification page for iframe embed
│   │   ├── widget.html         # Hosted chat interface loaded in widget iframe
│   │   └── widget.js           # Client-side JavaScript snippet for external websites
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # Centralized Fetch client with dynamic Auth & Tenant headers
│   │   ├── components/         # Reusable UI component library (Layout, Modals, Navbar, etc.)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx # Firebase auth listener & user profile synchronization
│   │   │   └── TenantContext.tsx # Company/workspace state & active tenant switching
│   │   ├── lib/
│   │   │   └── firebase.ts     # Firebase Web SDK initialization
│   │   ├── pages/              # Application views (Dashboard, Chat, Documents, Settings, etc.)
│   │   ├── types/              # Frontend TypeScript definitions
│   │   ├── App.tsx             # Route declarations & tenant protection guards
│   │   ├── index.css           # Global Tailwind CSS and styling rules
│   │   └── main.tsx            # React application entry point
│   ├── package.json            # Frontend scripts and dependencies
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   ├── tsconfig.json           # Frontend TypeScript compiler configuration
│   ├── vercel.json             # Vercel SPA routing & CORS rewrite rules
│   └── vite.config.ts          # Vite build tool & development proxy configuration
│
├── server/                     # Backend API & RAG Engine (Node.js + Express + TypeScript)
│   ├── data/                   # Embedded database storage (PGlite)
│   ├── uploads/                # Local file storage for ingested knowledge documents
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts          # Validated environment settings & provider selectors
│   │   │   └── firebase.ts     # Firebase Admin SDK initialization
│   │   ├── db/
│   │   │   ├── index.ts        # Database connection pool (PostgreSQL / PGlite auto-switch)
│   │   │   └── migrations/     # SQL schema migrations (001_initial_schema, 002_vector_1024)
│   │   ├── middleware/
│   │   │   ├── auth.ts         # Bearer token verification (Firebase ID Token & dev tokens)
│   │   │   ├── rateLimit.ts    # Rate limiting for public and authenticated routes
│   │   │   └── tenant.ts       # X-Company-Id verification and tenant role resolution
│   │   ├── modules/            # Domain-driven feature controllers & services
│   │   │   ├── analytics/      # Usage metrics and query reporting
│   │   │   ├── apiKeys/        # Scoped developer API key generation and hashing
│   │   │   ├── chatbot/        # Widget customization and branding configs
│   │   │   ├── companies/      # Workspace creation, member management, and invites
│   │   │   ├── conversations/  # Conversation threads and message persistence
│   │   │   ├── documents/      # File upload, document chunking, and vector indexing
│   │   │   └── rag/            # Vector similarity search and context-grounded prompting
│   │   ├── routes/
│   │   │   ├── apiV1.ts        # External developer REST API v1 (API Key authenticated)
│   │   │   ├── appApi.ts       # Internal Dashboard REST API (Session authenticated)
│   │   │   └── publicApi.ts    # Public Widget API (CORS open, rate limited)
│   │   ├── services/
│   │   │   ├── ai/             # LLM & Embedding provider implementations (Ollama, Gemini)
│   │   │   └── storage/        # File storage abstraction (Firebase Storage / Local Disk)
│   │   ├── app.ts              # Express application configuration & CORS policies
│   │   └── index.ts            # Server bootstrap and port listener
│   ├── __tests__/              # Automated test suites (Auth, Multitenancy, RAG, Widget)
│   ├── package.json            # Server dependencies and scripts
│   ├── tsconfig.json           # Server TypeScript configuration
│   └── vitest.config.ts        # Vitest test runner configuration
│
└── README.md                   # Project documentation
```

---

## 4. Prerequisites & System Requirements

Ensure the following tools are installed on your environment before running the project:

- **Node.js**: Version `v18.0.0` or higher (Node `v20+` or `v22+` recommended).
- **npm**: Version `v9.0.0` or higher.
- **Git**: For version control.
- **Ollama** *(Optional for local AI)*: Required if using local LLM inference or embeddings without cloud API keys.
  - Download from: [https://ollama.com](https://ollama.com)
  - Models used by default:
    ```bash
    ollama pull qwen3:1.7b
    ollama pull qwen3-embedding:0.6b
    ```
- **PostgreSQL** *(Optional)*: PostgreSQL 15+ with `pgvector` extension. If not installed or configured, the server automatically defaults to embedded **PGlite** with persistence in `server/data/pglite_db`.

---

## 5. Installation

Clone the repository and install dependencies for both `server` and `client`:

```bash
# 1. Clone the repository
git clone https://github.com/yaswanthjada1/Smart-AI-Customer-Support.git
cd "team pro"

# 2. Install Server Dependencies
cd server
npm install

# 3. Install Client Dependencies
cd ../client
npm install
```

---

## 6. Environment Configuration

### Backend Configuration (`server/.env`)

Create a `.env` file in the `server/` directory (or root if configured):

```env
# Server Port & Environment
PORT=5000
NODE_ENV=development

# Database Connection (Optional - defaults to embedded PGlite if empty)
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/rag_support
# PGLITE_DIR=./data/pglite_db

# Firebase Admin SDK (For User Authentication & Cloud Storage)
FIREBASE_PROJECT_ID=smart-ai-customer-suppor-24d0e
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=smart-ai-customer-suppor-24d0e.firebasestorage.app

# Local AI Configuration (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_GENERATION_MODEL=qwen3:1.7b
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b

# AI Provider Selection ('ollama' | 'gemini' | 'openai' | 'mock')
LLM_PROVIDER=ollama
LLM_MODEL=qwen3:1.7b
LLM_API_KEY=

EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=qwen3-embedding:0.6b
EMBEDDING_DIMENSIONS=1024
EMBEDDING_API_KEY=

# Storage Provider ('local' | 'firebase')
STORAGE_PROVIDER=local

# Public Widget Rate Limiting
PUBLIC_CHAT_RATE_WINDOW=600
PUBLIC_CHAT_RATE_LIMIT=30
```

### Frontend Configuration (`client/.env`)

Create a `.env` file in the `client/` directory:

```env
# Backend API Base URL (Leave blank if using Vite proxy, or specify server URL)
VITE_API_URL=http://localhost:5000

# Firebase Web Client Configuration
VITE_FIREBASE_API_KEY=AIzaSyDF1tp_nkMUyiT-9Z5WF205XlGMTj1hKZ4
VITE_FIREBASE_AUTH_DOMAIN=smart-ai-customer-suppor-24d0e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-ai-customer-suppor-24d0e
VITE_FIREBASE_STORAGE_BUCKET=smart-ai-customer-suppor-24d0e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=58034439041
VITE_FIREBASE_APP_ID=1:58034439041:web:e35678f28f4fc737549e80
VITE_FIREBASE_MEASUREMENT_ID=G-JQKY8Y7PYB
```

---

## 7. Running the Application Locally

### Step 1: Start Ollama (If using local AI)
Ensure Ollama is running and the required models are pulled:
```bash
ollama serve
# Verify models in another terminal:
ollama list
```

### Step 2: Start the Backend Server
From the `server/` directory:
```bash
cd server
npm run dev
```
The API server will start at `http://localhost:5000`. You can verify system health by opening `http://localhost:5000/api/health`.

### Step 3: Start the Frontend Client
In a separate terminal, from the `client/` directory:
```bash
cd client
npm run dev
```
The Vite development server will start at `http://localhost:5173`. Open this URL in your web browser to access the dashboard.

---

## 8. Available Scripts & Commands

All scripts documented below exist directly in the project configuration files:

### Backend Scripts (`server/package.json`)

| Command | Script | Description |
| :--- | :--- | :--- |
| `npm run dev` | `nodemon --watch src -e ts --exec ts-node src/index.ts` | Starts the Express server with live TypeScript reloading via nodemon. |
| `npm run build` | `tsc` | Compiles backend TypeScript source code into production JavaScript in `dist/`. |
| `npm run start` | `node dist/index.js` | Runs the compiled production server from `dist/`. |
| `npm run test` | `vitest run --fileParallelism=false` | Executes the backend automated test suite using Vitest. |
| `npm run migrate` | `ts-node src/db/runMigrations.ts` | Manually runs SQL schema migrations against the configured database. |

### Frontend Scripts (`client/package.json`)

| Command | Script | Description |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts the Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | `tsc && vite build` | Validates TypeScript types and builds the production bundle into `dist/`. |
| `npm run preview` | `vite preview` | Locally serves the production build output from `dist/` for testing. |

---

## 9. Architecture & Core Systems

### Authentication Flow
1. **Frontend Authentication**: Users sign in via Firebase Auth (Email/Password, Google popup) inside `AuthContext.tsx`.
2. **Token Passing**: On every authenticated API request, `apiClient` in `client/src/api/client.ts` attaches the Firebase JWT as an `Authorization: Bearer <idToken>` header.
3. **Backend Validation**: In `server/src/middleware/auth.ts`, the Express middleware validates the token with `firebase-admin` (or resolves dev simulation tokens in development mode), decoding the `uid`, `email`, and `name`.
4. **User Synchronization**: The backend dynamically provisions or updates the corresponding user row in the PostgreSQL `users` table via `syncUser()`.

### Database & Multi-Tenant Architecture
- **Automatic Engine Fallback**: The database module `server/src/db/index.ts` first attempts connection to `DATABASE_URL`. If unavailable, it seamlessly initializes **PGlite** (in-process PostgreSQL) with vector extensions enabled.
- **Tenant Scoping**: All tenant data (`documents`, `document_chunks`, `conversations`, `messages`, `api_keys`, `chatbot_configs`) references `company_id`.
- **Row-Level Tenancy Checks**: Requests to `/api/app/*` pass through `requireTenantMembership` middleware in `server/src/middleware/tenant.ts`, verifying that the requesting user possesses an active membership in `company_members`.

### AI & Ollama Integration
- **LLM Abstraction**: AI operations are decoupled behind provider interfaces in `server/src/services/ai/`.
- **Ollama Embedding**: Handled via `OllamaProvider.generateEmbedding` and `generateEmbeddings` targeting the `/api/embed` endpoint with `qwen3-embedding:0.6b` (1024-dim output).
- **RAG Retrieval**: The RAG service (`server/src/modules/rag/ragService.ts`) performs vector similarity ranking:
  ```sql
  SELECT chunk_id, content, 1 - (embedding <=> $1::vector) AS similarity
  FROM document_chunks
  WHERE company_id = $2
  ORDER BY embedding <=> $1::vector ASC
  LIMIT 5;
  ```
- **Context Injection**: Retrieved relevant chunks are synthesized into structured system prompts with strict grounding instructions to prevent hallucinations.

### Public Widget & Embed System
Customers can embed the chat assistant onto any external website with a single `<script>` tag:

```html
<!-- Smart AI Chatbot Widget -->
<script
  src="https://your-domain.com/widget.js"
  data-company-id="YOUR_COMPANY_ID"
  data-api-url="https://your-api-domain.com"
  defer>
</script>
```

- **Iframe Isolation**: The widget renders an isolated iframe (`widget.html`) with configured colors, branding, and welcome messages.
- **Public API**: The widget queries `/api/public/widget-config/:companyId` and `/api/public/chat` with CORS enabled (`origin: '*'`) and rate limiting (`30 requests per 10 minutes per IP`).

---

## 10. Deployment

Refer to the project configuration for hosting environments:

### Frontend Deployment (Vercel)
The `client/vercel.json` configuration defines SPA routing rewrites and CORS headers for widget distribution:
- Root and dashboard routes are rewritten to `/index.html`.
- Static assets `/widget.js` and `/widget` explicitly allow cross-origin framing (`Content-Security-Policy: frame-ancestors *`).
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend Deployment
- The backend Express server is designed to run in any standard Node.js container or cloud VM environment (e.g. Render, Railway, AWS ECS, GCP Cloud Run, or VPS).
- Ensure required environment variables (`PORT`, `DATABASE_URL`, Firebase credentials, and AI provider API keys) are configured in the host environment.
- Run migrations and start with:
  ```bash
  npm run build
  npm run start
  ```

---

## 11. Troubleshooting Guide

### 1. `Ollama embedding error (qwen3-embedding:0.6b at http://localhost:11434)`
- **Cause**: Ollama daemon is offline, or the required embedding model has not been pulled.
- **Resolution**:
  1. Start Ollama: `ollama serve`
  2. Pull the embedding model: `ollama pull qwen3-embedding:0.6b`
  3. Pull the generation model: `ollama pull qwen3:1.7b`

### 2. CORS Preflight Blocked (`No Access-Control-Allow-Origin`)
- **Cause**: The frontend is sending requests to an endpoint that is offline, returning a 502/503 from a reverse proxy or tunnel.
- **Resolution**: Ensure the backend server is running on the expected port (`PORT=5000`) and responding at `/api/health`.

### 3. PostgreSQL / PGlite Lock Conflicts
- **Cause**: An abrupt process termination left a stale `postmaster.pid` file in `server/data/pglite_db`.
- **Resolution**: Stop any existing server processes. The database initialization automatically detects and recovers corrupted checkpoints, or you can remove `server/data/pglite_db/postmaster.pid` before starting.

### 4. Firebase Authentication Token Issues
- **Cause**: Missing or invalid Firebase Web configuration keys in `client/.env`.
- **Resolution**: Verify that `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` match your active Firebase console credentials.

---

> **Note**: This README documents the existing system implementation and does not alter application behavior, business logic, or dependencies.
