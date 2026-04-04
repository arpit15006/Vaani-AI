<p align="center">
  <img src="frontend/public/logo.svg" alt="VaaniAI" width="80" />
</p>

<h1 align="center">VaaniAI</h1>

<p align="center">
  <strong>A production-grade, voice-first AI assistant with multi-agent reasoning, real-time execution streaming, and persistent memory.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/AI-Groq%20LLaMA%203.3%2070B-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/DB-Supabase-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/Auth-Google%20OAuth%202.0-4285F4?style=flat-square&logo=google" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" />
</p>

---

> **Built a production-grade AI assistant with multi-agent reasoning, real-time execution streaming, and persistent memory -- capable of performing real-world tasks across Google Calendar, Gmail, and Weather APIs through natural voice interaction.**

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Engineering Highlights](#engineering-highlights)
- [Tech Stack](#tech-stack)
- [Demo](#demo)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Future Roadmap](#future-roadmap)
- [License](#license)

---

## Why This Exists

Most AI chatbot projects call an LLM API and display the response. VaaniAI is architecturally different.

It implements a **four-stage agentic pipeline** where each stage has a distinct responsibility -- planning, routing, execution, and critique -- mirroring how production AI systems at companies like Google and OpenAI decompose complex tasks internally. The system doesn't just answer questions; it **reasons about intent, selects tools, executes real API calls, and self-corrects its output** before delivering a voice-optimized response to the user.

This is not a wrapper around an LLM. It is a reasoning engine.

---

## Architecture

```
                          +------------------+
                          |   Voice Input    |
                          |  (Web Speech API)|
                          +--------+---------+
                                   |
                                   v
+--------------------------------------------------------------------------+
|                        FRONTEND (Next.js 15)                             |
|                                                                          |
|   Chat UI  ----->  NDJSON Stream Reader  ----->  Status Indicator        |
|                          |                        "Calling Gmail API..." |
|                          |                                               |
|   TTS Engine <-----  Final Response  <-----  Agent Trace Panel           |
|   (Chunked Queue)                              (Execution Debugger)      |
+--------------------------------------------------------------------------+
                                   |
                            POST /api/chat
                          (NDJSON Streaming)
                                   |
                                   v
+--------------------------------------------------------------------------+
|                        BACKEND (Express.js)                              |
|                                                                          |
|  +-------------+    +--------------+    +------------+    +----------+   |
|  |   PLANNER   | -> | TOOL ROUTER  | -> |  EXECUTOR  | -> |  CRITIC  |  |
|  |             |    |              |    |            |    |          |   |
|  | Decomposes  |    | Maps steps   |    | Calls real |    | Refines  |   |
|  | intent into |    | to tool      |    | APIs with  |    | output   |   |
|  | steps       |    | handlers     |    | OAuth      |    | for voice|   |
|  +-------------+    +--------------+    +------------+    +----------+   |
|         ^                                     |                          |
|         |           AUTO-LOOP (max 3)         |                          |
|         +-------------------------------------+                          |
|                                                                          |
|  +-------------------+  +------------------+  +---------------------+   |
|  | Memory Service    |  | Action Logger    |  | Input Validator     |   |
|  | (Contextual       |  | (Supabase)       |  | (XSS/Injection     |   |
|  |  keyword filter)  |  |                  |  |  protection)        |   |
|  +-------------------+  +------------------+  +---------------------+   |
+--------------------------------------------------------------------------+
                                   |
                                   v
              +--------------------------------------------+
              |            EXTERNAL SERVICES               |
              |                                            |
              |  Google Calendar    Gmail    OpenWeather    |
              |  (CRUD events)   (Read/Send)  (Forecast)   |
              +--------------------------------------------+
```

### Pipeline Breakdown

| Stage | Agent | Responsibility | Model |
|-------|-------|---------------|-------|
| 1 | **Planner** | Analyzes user intent, decomposes into ordered steps with tool assignments | LLaMA 3.3 70B |
| 2 | **Tool Router** | Validates tool availability, resolves dependencies, builds execution manifest | Rule-based |
| 3 | **Executor** | Authenticates with external APIs via OAuth, executes tools, captures structured results | LLaMA 3.3 70B |
| 4 | **Critic** | Refines raw output into natural, voice-optimized language; injects user context from memory | LLaMA 3.3 70B |

The pipeline supports an **Auto-Loop** mechanism: after execution, the Executor's output is fed back into the Planner to determine if additional steps are required. This enables multi-step autonomous workflows (e.g., "Check my email from Zorvyn and add the meeting to my calendar") without manual intervention. The loop is hard-capped at 3 iterations to prevent runaway API costs.

---

## Key Features

### Real-Time Execution Streaming
The backend streams execution state to the frontend via **NDJSON (Newline-Delimited JSON)** over a single HTTP connection. As the pipeline progresses, the UI updates in real time:

```
"Analyzing request intent..."  ->  "Formulating execution plan..."  ->  "Executing tools: calendar_list..."  ->  "Polishing voice output..."
```

This is not simulated. Each status corresponds to an actual pipeline stage completing on the server.

### Autonomous Multi-Step Execution
When a user says *"Plan my weekend"*, the system doesn't just respond with text. It can:
1. Check the weather forecast
2. Query the user's calendar for conflicts
3. Generate an itinerary
4. Create calendar events
5. Send a confirmation email

Each step is planned, executed, and validated autonomously through the agent loop.

### Contextual Memory
User preferences, facts, and habits are persisted in Supabase and **selectively injected** based on query relevance. A weather query retrieves location preferences; an email query retrieves communication habits. This prevents token bloat and improves response accuracy.

### Voice-First Design
- **Speech-to-Text**: Web Speech API with real-time transcription
- **Text-to-Speech**: Custom chunked queue engine with intent-based tone variation, 150ms inter-sentence pauses, and automatic robotic-phrase filtering
- **Voice Selection**: Dynamic female voice prioritization with fallback hierarchy (Google Enhanced > Natural > System default)

### Transparent AI
Every response includes a full **Agent Trace** -- a collapsible debug panel showing exactly what each agent decided, which tools were called, execution times, and the raw data returned. Nothing is a black box.

### Analytics Dashboard
Real-time metrics computed from action history: total automations, emails sent, tool distribution, and average execution speed. Designed to demonstrate measurable AI impact.

---

## Engineering Highlights

### Why Multi-Agent Over Single-Prompt?

A single LLM call with tool-use instructions works for simple tasks but degrades unpredictably with complex, multi-step requests. The multi-agent decomposition provides:

- **Separation of concerns**: The Planner never sees raw API responses; the Executor never reasons about intent. Each agent operates within a focused context window.
- **Debuggability**: When something fails, the trace pinpoints exactly which agent made the wrong decision.
- **Independent optimization**: The Planner uses a fast model for JSON planning; the Critic uses a tuned prompt for voice output. No single prompt tries to do everything.

### Tool Routing as a Decoupling Layer

The Tool Router sits between planning and execution as a validation gate. It ensures:
- Tools referenced by the Planner actually exist
- Required parameters are present before execution begins
- The Executor receives a clean, validated manifest rather than raw LLM output

This prevents the common failure mode where an LLM hallucinates a tool name or parameter, causing a runtime crash.

### Memory as Context Engineering

Injecting all stored memories into every prompt wastes tokens and introduces noise. VaaniAI implements **keyword-based relevance filtering**: the user's message is tokenized, and only memories whose keys or values contain matching terms are included. High-relevance memories (score > 1.5) bypass the filter entirely. If filtering removes everything, a baseline of 3 core preferences is preserved.

### SSE Over WebSockets

Server-Sent Events (implemented as NDJSON streaming) were chosen over WebSockets because:
- The communication is unidirectional (server to client) during execution
- No persistent connection management or heartbeat logic required
- Works through standard HTTP infrastructure (proxies, load balancers, CDNs)
- Simpler error recovery -- the client just retries the POST

### Speech Optimization Pipeline

Raw LLM output sounds robotic when fed directly to the Web Speech API. VaaniAI preprocesses text through `optimizeSpeech()`:
1. Strips markdown artifacts and meta-phrases ("As per your request", "I have checked")
2. Replaces formal constructions with conversational equivalents
3. Splits into sentence-level chunks for natural pacing
4. Adds intent-based rate variation (alerts speak faster; transitions speak slower)
5. Injects occasional conversational fillers ("Okay, so...") at controlled probability

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router) | Server components, streaming support |
| Styling | Tailwind CSS + shadcn/ui | Design system with dark mode |
| Backend | Node.js + Express 5 | API server with NDJSON streaming |
| AI Model | Groq (LLaMA 3.3 70B Versatile) | Fast inference for all agents |
| Database | Supabase (PostgreSQL) | Memory, conversations, action logs |
| Auth | Google OAuth 2.0 | Calendar + Gmail access |
| Calendar | Google Calendar API v3 | CRUD operations on events |
| Email | Gmail API v1 | Read, list, and send emails |
| Weather | OpenWeather API | Current conditions + forecast |
| Voice | Web Speech API | Browser-native STT + TTS |

---

## Demo

<!-- Add screenshots here -->

| Dashboard | Agent Trace | Analytics |
|-----------|------------|-----------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Trace](docs/screenshots/trace.png) | ![Analytics](docs/screenshots/analytics.png) |

<!-- Add demo video link -->
> **Live Demo**: [https://vaani-ai-pi.vercel.app](https://vaani-ai-pi.vercel.app)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the required tables
- Google Cloud project with Calendar and Gmail APIs enabled
- Groq API key
- OpenWeather API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/VaaniAI.git
cd VaaniAI

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Setup Database

Run the following SQL in your Supabase SQL Editor:

```sql
-- Users
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  action TEXT,
  agent_trace JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Memory
CREATE TABLE user_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  relevance_score FLOAT DEFAULT 1.0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);

-- Action History
CREATE TABLE action_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action_type TEXT,
  tool_name TEXT,
  input_summary TEXT,
  result_summary TEXT,
  success BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Run the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:5001`.

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=5001
FRONTEND_URL=http://localhost:3000

# AI
GROQ_API_KEY=your_groq_api_key

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/callback

# Weather
OPENWEATHER_API_KEY=your_openweather_api_key

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CHAT_RATE_LIMIT_WINDOW_MS=60000
CHAT_RATE_LIMIT_MAX=20
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

---

## Project Structure

```
VaaniAI/
├── backend/
│   ├── agents/
│   │   ├── planner.js          # Intent decomposition
│   │   ├── toolRouter.js       # Tool validation + routing
│   │   ├── executor.js         # API execution engine
│   │   ├── critic.js           # Voice output refinement
│   │   ├── memoryExtractor.js  # Automatic memory extraction
│   │   └── suggestionGenerator.js
│   ├── controllers/
│   │   ├── chatController.js   # NDJSON streaming pipeline
│   │   └── authController.js   # Google OAuth flow
│   ├── middleware/
│   │   ├── authenticateUser.js # Token validation
│   │   ├── inputValidator.js   # XSS/injection protection
│   │   └── rateLimit.js        # Per-route rate limiting
│   ├── services/
│   │   ├── llmService.js       # Groq API abstraction
│   │   ├── memoryService.js    # Contextual memory with keyword filtering
│   │   ├── conversationService.js
│   │   ├── actionLogger.js     # Analytics data collection
│   │   └── supabase.js
│   ├── tools/
│   │   ├── calendar.js         # Google Calendar CRUD
│   │   ├── email.js            # Gmail read/send with smart fallback
│   │   └── weather.js          # OpenWeather integration
│   └── server.js
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Main dashboard with streaming
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-container.tsx
│   │   │   ├── chat-input.tsx
│   │   │   └── status-indicator.tsx  # Real-time SSE status
│   │   └── dashboard/
│   │       ├── analytics-panel.tsx
│   │       ├── memory-panel.tsx
│   │       └── action-history-panel.tsx
│   ├── hooks/
│   │   ├── use-speech-synthesis.ts   # Chunked TTS engine
│   │   └── use-speech-recognition.ts
│   └── lib/
│       └── api.ts              # NDJSON stream client
└── README.md
```

---

## Future Roadmap

- **Webhook-based triggers**: Calendar reminders and email notifications that proactively initiate agent actions
- **RAG integration**: Connect personal documents (PDFs, notes) as a knowledge base for contextual Q&A
- **Multi-model routing**: Use smaller models for simple queries and reserve large models for complex reasoning
- **Mobile companion app**: React Native client with push notifications and background voice activation
- **Learning system**: Reinforcement from user corrections to improve planning accuracy over time
- **Additional integrations**: Slack, Notion, Google Drive, Spotify

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Designed and engineered by <strong>Arpit Patel</strong></sub>
</p>
