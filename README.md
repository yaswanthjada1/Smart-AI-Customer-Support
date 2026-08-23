# Smart AI Customer Support (Multi-Tenant RAG SaaS)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-yellow.svg)](https://vitest.dev/)

A production-grade, multi-tenant AI Customer Support SaaS platform powered by **Retrieval-Augmented Generation (RAG)**, vector similarity search with `pgvector`, embeddable customer-facing chat widgets, and an interactive admin dashboard.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup & Migrations](#database-setup--migrations)
  - [Running Locally](#running-locally)
- [Chatbot Widget Integration](#-chatbot-widget-integration)
- [API Reference](#-api-reference)
  - [Developer REST API (v1)](#1-developer-rest-api-v1)
  - [Public Widget API](#2-public-widget-api)
  - [Private Dashboard API](#3-private-dashboard-api)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🌟 Overview

This platform enables businesses to upload their product documentation, FAQs, and support policies (PDF, DOCX, TXT, MD) to build an intelligent, domain-aware customer support chatbot.

The system uses **semantic chunking** and **vector embeddings** stored in PostgreSQL with `pgvector` to ground every response strictly in company documentation, eliminating hallucinations and providing transparent source citations.

---

## ✨ Key Features

### 🏢 Multi-Tenant SaaS Architecture
- **Tenant Isolation**: Strict data segregation per company workspace for documents, embeddings, conversations, API keys, and analytics.
- **Role-Based Access Control**: `owner`, `admin`, and `member` roles for company workspace members.

### 🧠 Intelligent RAG Pipeline
- **Multi-Format Ingestion**: Supports `.pdf`, `.docx`, `.txt`, and `.md` file parsing using `pdf-parse` and `mammoth`.
- **Vector Search**: 1024-dimensional vector embeddings with cosine similarity distance ranking (`<=>`).
- **Flexible AI Providers**:
  - **Local AI (Ollama)**: Offline privacy-first AI generation and embeddings (e.g. `qwen3`, `nomic-embed-text`).
  - **Google Gemini**: Cloud-scale generation (`gemini-2.0-flash`) and embeddings (`text-embedding-004`).
  - **Deterministic / Mock Providers**: Built-in mock providers for fast, reliable unit testing and offline development.
- **Hallucination Guardrails**: Automated confidence scoring (`HIGH`, `MEDIUM`, `LOW`). If evidence is insufficient or out-of-scope, the bot gracefully refuses to speculate and offers human escalation.
- **Source Attribution**: Transparent document and page-level source citations returned with every answer.

### 💬 Embeddable Web Chat Widget
- **Zero-Dependency Widget Script**: Lightweight standalone `widget.js` embeddable on any customer website with a single `<script>` tag.
- **Custom Branding**: Configurable bot name, avatar, primary brand colors, and custom welcome messages.
- **Direct Iframe Support**: Dedicated `/widget/:botId` route for embedding into web portals and mobile webviews.

### 📊 Admin Management Dashboard
- **Knowledge Base Manager**: Upload, inspect text chunks, re-index, or delete documentation.
- **Live Sandbox Tester**: Test RAG responses and review retrieved chunks, similarity scores, and latency in real-time.
- **Conversation Logs & Escalations**: Monitor live customer sessions, track source citations, and resolve human escalation requests.
- **Analytics & Metrics**: View total queries, resolution rates, quality distributions, and escalation trends.
- **Developer API Key Management**: Generate, inspect, and revoke API keys (`sk_live_...`) with instant revocation.

---

## 📐 System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend & Clients"]
        Dashboard["React Admin Dashboard\n(Vite + Tailwind CSS)"]
        Widget["Embeddable Chat Widget\n(widget.js / Iframe)"]
        ExternalApp["Third-Party App / Backend\n(REST API v1)"]
    end

    subgraph Backend ["Express.js Backend API"]
        Router["API Gateway / Routers"]
        AuthMiddleware["Auth & Tenant Isolation Middleware"]
        RAGModule["RAG Service & Pipeline"]
        DocService["Document Ingestion & Chunking"]
        ConvService["Conversation & Escalation Service"]
    end

    subgraph AI ["AI & Embeddings"]
        Ollama["Local Ollama\n(Qwen / LLaMA / Embeddings)"]
        Gemini["Google Gemini API\n(Gemini 2.0 Flash / Embeddings)"]
    end

    subgraph Storage ["Database & Storage"]
        PG["PostgreSQL + pgvector\n(or Embedded PGlite)"]
        FileStore["Firebase Storage / Local Filesystem"]
    end

    Dashboard -->|Firebase Auth & JWT| Router
    Widget -->|Widget Token / Public API| Router
    ExternalApp -->|Bearer sk_live_...| Router

    Router --> AuthMiddleware
    AuthMiddleware --> RAGModule
    AuthMiddleware --> DocService
    AuthMiddleware --> ConvService

    DocService -->|Parse & Chunk| RAGModule
    RAGModule -->|Generate Vectors| AI
    RAGModule -->|Vector Cosine Search| PG
    RAGModule -->|Prompt + Context| AI
    DocService -->|Store Files| FileStore
    ConvService -->|Store Messages & Events| PG
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v7, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Zod, Multer, `pdf-parse`, `mammoth` |
| **Database** | PostgreSQL 16 with `pgvector` (or embedded in-process `@electric-sql/pglite`) |
| **AI / LLMs** | Google Gemini (`@google/generative-ai`), Local Ollama REST API, Mock Provider |
| **Auth & Storage** | Firebase Auth / Firebase Admin SDK, Firebase Storage (or Local disk) |
| **Testing** | Vitest, Supertest |

---

## 📁 Project Structure

```
.
├── client/                     # Frontend Single Page Application
│   ├── public/                 # Static assets, widget.js, and embed demos
│   │   ├── widget.js           # Standalone embeddable chat widget script
│   │   ├── demo.html           # Widget integration showcase page
│   │   └── test-embed.html     # Test environment for iframe and widget embed
│   ├── src/
│   │   ├── api/                # API client with token & tenant injection
│   │   ├── components/         # Reusable UI components & layouts
│   │   ├── contexts/           # AuthContext and WorkspaceContext
│   │   ├── lib/                # Firebase client initialization
│   │   ├── pages/              # Dashboard, Knowledge, Chatbot, Analytics, etc.
│   │   ├── types/              # Frontend TypeScript definitions
│   │   ├── App.tsx             # Main routing & application shell
│   │   └── main.tsx            # React application entry point
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend API & RAG Engine
│   ├── src/
│   │   ├── config/             # Environment variables & runtime configuration
│   │   ├── db/                 # Database pool connection & SQL migrations
│   │   │   └── migrations/     # PostgreSQL + pgvector initial schema
│   │   ├── middleware/         # Auth, Tenant isolation, and Rate limiting
│   │   ├── modules/            # Domain feature modules
│   │   │   ├── analytics/      # Analytics event tracking & summaries
│   │   │   ├── apiKeys/        # API key generation, hashing & validation
│   │   │   ├── chatbot/        # Widget customization settings
│   │   │   ├── companies/      # Multi-tenant workspace management
│   │   │   ├── conversations/  # Conversation sessions & message history
│   │   │   ├── documents/      # File parsing, chunking & document lifecycle
│   │   │   └── rag/            # Vector search, prompt building & evaluation
│   │   ├── routes/             # Express route declarations (appApi, publicApi, apiV1)
│   │   ├── services/           # AI providers (Gemini, Ollama) & Storage adapters
│   │   ├── types/              # Backend TypeScript interfaces
│   │   ├── app.ts              # Express application setup
│   │   └── index.ts            # Server entry point
│   ├── src/__tests__/          # Vitest unit and RAG evaluation tests
│   └── package.json
│
├── .env.example                # Example environment configuration
├── package.json                # Root package scripts
├── vercel.json                 # Vercel deployment configuration
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- *(Optional)* **PostgreSQL** with `pgvector` extension (If not configured, the backend automatically boots an embedded **PGlite** engine for zero-config local development).
- *(Optional)* **Ollama** running locally if using local offline AI models (`ollama run qwen3:1.7b`).

---

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yaswanthjada1/Smart-AI-Customer-Support.git
   cd Smart-AI-Customer-Support
   ```

2. **Install dependencies for root, server, and client:**
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

---

### Environment Configuration

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```ini
# Server Port & Mode
PORT=5000
NODE_ENV=development

# Database Configuration (PostgreSQL + pgvector)
# Leave blank to automatically use the zero-setup embedded PGlite vector database:
DATABASE_URL=

# AI / LLM Configuration
# Options: 'gemini', 'ollama', 'mock'
LLM_PROVIDER=gemini
LLM_API_KEY=your_google_gemini_api_key
LLM_MODEL=gemini-2.0-flash

# Vector Embedding Configuration
# Options: 'gemini', 'ollama', 'mock'
EMBEDDING_PROVIDER=gemini
EMBEDDING_API_KEY=your_google_gemini_api_key
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=1024

# Local AI (Ollama) Settings (If LLM_PROVIDER=ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_GENERATION_MODEL=qwen3:1.7b
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b

# Storage Provider
# Options: 'local', 'firebase'
STORAGE_PROVIDER=local
LOCAL_STORAGE_DIR=./uploads

# Firebase Admin SDK (Optional for production auth & cloud storage)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

---

### Database Setup & Migrations

If using a standard PostgreSQL database, ensure `vector` extension is supported and execute migrations:

```bash
npm --prefix server run migrate
```

> **Note**: If `DATABASE_URL` is omitted, the application uses **PGlite** with vector support out-of-the-box and persists data automatically in `server/data/pglite_db`.

---

### Running Locally

You can launch both the frontend and backend in development mode:

**Option A: Using root scripts**
```bash
# Terminal 1: Start Backend API (runs on port 5000)
npm run dev:server

# Terminal 2: Start Client App (runs on port 5173)
npm run dev:client
```

**Option B: Running from respective directories**
```bash
# Server:
cd server && npm run dev

# Client:
cd client && npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 💬 Chatbot Widget Integration

Add the AI customer support widget to any website with a single `<script>` tag:

```html
<!-- Smart AI Support Widget Embed -->
<script
  src="https://your-domain.com/widget.js"
  data-company-id="YOUR_COMPANY_UUID"
  data-api-url="https://your-domain.com"
  data-primary-color="#4f46e5"
  data-bot-name="Support Bot"
  data-position="bottom-right"
  defer
></script>
```

### Configuration Options

| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `data-company-id` | `UUID` | **Required** | Your workspace company ID. |
| `data-api-url` | `string` | Current origin | Base URL of the backend API server. |
| `data-primary-color` | `string` | `#4f46e5` | Primary brand hex color for header & launcher. |
| `data-bot-name` | `string` | `Support Assistant` | Display name of the bot. |
| `data-position` | `string` | `bottom-right` | Position of launcher: `bottom-right` or `bottom-left`. |

### Iframe Embed Alternative

```html
<iframe
  src="https://your-domain.com/widget/YOUR_COMPANY_UUID"
  width="400"
  height="600"
  frameborder="0"
  style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);"
  allow="clipboard-write"
></iframe>
```

---

## 📡 API Reference

### 1. Developer REST API (v1)

Authenticate via API Key created in the dashboard:

```http
POST /api/v1/chat
Authorization: Bearer sk_live_your_api_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What is the return policy for international orders?",
  "session_id": "cust_sess_12345",
  "customer_identifier": "user@example.com"
}
```

**Response (`200 OK`):**
```json
{
  "answer": "International orders can be returned within 30 days of delivery. Return shipping fees apply.",
  "sources": [
    {
      "document": "shipping_and_returns_policy.pdf",
      "document_id": "550e8400-e29b-41d4-a716-446655440000",
      "page": 4,
      "section": "International Returns",
      "snippet": "All international shipments qualify for standard returns within 30 days...",
      "similarity_score": 0.8921
    }
  ],
  "evidence_quality": "HIGH",
  "escalation_required": false,
  "session_id": "cust_sess_12345"
}
```

---

### 2. Public Widget API

#### Get Widget Configuration
```http
GET /api/public/widget-config/:companyId
```

#### Send Message via Widget
```http
POST /api/public/chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "companyId": "YOUR_COMPANY_UUID",
  "message": "How do I reset my password?",
  "sessionId": "session_abc123"
}
```

---

### 3. Private Dashboard API

Protected routes require Firebase User Token (`Authorization: Bearer <idToken>`) and Tenant Header (`X-Company-Id: <companyId>`).

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/app/me` | Get current authenticated user profile & company list | Authenticated |
| `POST` | `/api/app/companies` | Create a new company workspace | Authenticated |
| `GET` | `/api/app/companies/:id/documents` | List all ingested documents | `member` |
| `POST` | `/api/app/companies/:id/documents` | Upload & chunk document (Multipart form) | `member` |
| `DELETE` | `/api/app/companies/:id/documents/:docId` | Delete document & vector embeddings | `admin` |
| `POST` | `/api/app/companies/:id/chatbot/test` | Live RAG test query with debug metadata | `member` |
| `PATCH` | `/api/app/companies/:id/chatbot/config` | Update bot branding, colors & welcome message | `admin` |
| `GET` | `/api/app/companies/:id/conversations` | List conversation histories & escalations | `member` |
| `GET` | `/api/app/companies/:id/api-keys` | List active developer API keys | `admin` |
| `POST` | `/api/app/companies/:id/api-keys` | Generate a new `sk_live_...` API key | `admin` |
| `DELETE` | `/api/app/companies/:id/api-keys/:keyId` | Revoke an API key | `admin` |
| `GET` | `/api/app/companies/:id/analytics` | Get analytics summary & quality metrics | `member` |

---

## 🧪 Testing

The backend includes a comprehensive Vitest suite covering API endpoints, tenant data isolation, RAG evidence evaluation, and widget embedding security:

```bash
# Run all server tests
npm test

# Run tests in watch mode
npm --prefix server run test -- --watch
```

### Test Suites Included:
- `phase1.test.ts`: Multi-tenant database migrations, document chunking & vector search.
- `phase1_api.test.ts`: REST endpoints, authentication middleware & tenant isolation.
- `public_widget_embed.test.ts`: Widget configuration, public chat RAG & CORS/CSP security headers.
- `rag_eval.test.ts`: Grounding accuracy, hallucination prevention, and fallback escalation evaluation.

---

## 🚢 Deployment

### Deploying Frontend to Vercel
The repository includes a pre-configured [`vercel.json`](file:///c:/Users/GANESH%20BARLA/Desktop/team%20pro/vercel.json) with SPA rewrites and CORS headers for `widget.js`:

```bash
npm run build --prefix client
```

### Deploying Backend
The backend can be containerized with Docker or deployed to platforms like Google Cloud Run, AWS App Runner, Railway, or Render:

```bash
cd server
npm run build
npm start
```

Ensure environment variables (`PORT`, `DATABASE_URL`, `LLM_PROVIDER`, `LLM_API_KEY`, etc.) are configured in your deployment environment.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
