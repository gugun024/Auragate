<div align="center">
  <img src="./public/auragate_logo.jpg" alt="AuraGate Logo" width="140" style="border-radius: 20px; margin-bottom: 12px;" />
  <h1>⚡ AuraGate</h1>
  <p><b>Self-hosted AI Gateway, Smart API Key Rotator & Token Saver Engine for OpenCode, Cursor, and LLMs</b></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-16.2-black.svg?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-SQLite-indigo.svg?logo=prisma)](https://www.prisma.io/)
  [![Snyk SAST](https://img.shields.io/badge/Snyk_Security-0_Vulnerabilities-brightgreen.svg?logo=snyk)](https://snyk.io/)
</div>

---

## 📖 Overview

**AuraGate** is a high-performance, self-hosted **AI Gateway Proxy**, **Smart API Key Rotator**, and **Token Optimization Engine**. Built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **SQLite (Prisma)**, AuraGate provides a unified OpenAI-compatible endpoint (`/v1`) that load-balances requests across multiple LLM providers, automatically handles rate-limiting failovers, reduces token costs, and secures client connections with custom gateway access tokens.

```text
  █████╗ ██╗   ██╗██████╗  █████╗  ██████╗  █████╗ ████████╗███████╗
 ██╔══██╗██║   ██║██╔══██╗██╔══██╗██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝
 ███████║██║   ██║██████╔╝███████║██║  ███╗███████║   ██║   █████╗  
 ██╔══██║██║   ██║██╔══██╗██╔══██║██║   ██║██╔══██║   ██║   ██╔══╝  
 ██║  ██║╚██████╔╝██║  ██║██║  ██║╚██████╔╝██║  ██║   ██║   ███████╗
 ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

 ⚡ AuraGate v0.1.0 — Smart AI Gateway & API Key Rotator (OpenCode & LLMs)

 > Server Endpoint : http://localhost:20128/v1
 > Web Dashboard   : http://localhost:20128
 > Status          : Ready to route ✓
```

---

## 🎯 Architecture Diagram

```mermaid
flowchart LR
    subgraph Clients["Clients & AI Editors"]
        OC["OpenCode CLI"]
        CU["Cursor IDE"]
        CL["Cline / Roo-Code"]
        CR["cURL / Custom SDK"]
    end

    subgraph AG["AuraGate Engine (Port 20128)"]
        AUTH["Gateway Token Auth (ar-sk-...)"]
        CSP["Centralized System Prompt Injector"]
        RTK["RTK Token Saver & Sanitizer"]
        ROT["Smart Key Pool Rotator & Cooldown"]
        DB[(SQLite DB)]
    end

    subgraph Providers["LLM Providers"]
        GROQ["Groq API"]
        MIST["Mistral AI"]
        OAI["OpenAI"]
        DS["DeepSeek"]
        GEM["Google Gemini"]
    end

    Clients -->|Bearer Token| AUTH
    AUTH --> CSP
    CSP --> RTK
    RTK --> ROT
    ROT <--> DB
    ROT -->|Auto Failover & Round-Robin| Providers
```

---

## 🌟 Key Features

### 🔄 1. Smart API Key Pool & Automatic Failover
- **Round-Robin Key Rotation**: Distributes requests across active provider keys sorted by priority.
- **Failover Cooldown (429 / 401 / 403 / 5xx)**: If a key hits a rate limit or authorization error, AuraGate automatically puts it in temporary cooldown (10–30m) and retries the request using the next available candidate key without failing client connections.

### ✨ 2. Auto-Detect Provider & Live Model Importer
- **Provider Auto-Detection**: Automatically detects AI providers from key prefixes (`gsk_`, `sk-or-`, `sk-`, `AIzaSy`, `sk-ant-`).
- **Live Model Syncing**: Queries provider `/models` endpoints to automatically import and register active models.

### ⚡ 3. RTK Token Saver & Prompt Optimizer
- **Whitespace & Linebreak Sanitization**: Trims excessive blank lines (`\n\n\n+` $\rightarrow$ `\n\n`) and trailing spaces.
- **System Prompt Deduplication**: Merges duplicate consecutive system messages.
- **In-Memory LRU Caching**: Caches identical query responses to save 100% tokens on repeated prompts.

### 🎯 4. Centralized System Prompt Injection
- **Global Rules Engine**: Inject global instructions (e.g. *"Always respond in Indonesian and write clean TypeScript code"*) into every chat completion centrally from the Web Dashboard.

### 🔒 5. Multi-Client Gateway Access Tokens
- Issue secure gateway access tokens (`ar-sk-...`) for different team members or local editors.
- Protects the proxy endpoint from unauthorized external access.

### 📦 6. Live Model Catalog & 1-Click Copy
- Search across all imported models from active keys and copy model IDs in 1 click for editor setup.

### ⚡ 7. Live Provider Network Ping Test
- Test real-time network latency (in `ms`) to Groq, Mistral AI, OpenAI, DeepSeek, Gemini, and OpenRouter directly from the dashboard.

### 📊 8. Graph Analytics & Usage Breakdown
- Visual request distribution per provider, average processing latency, and estimated total token savings.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/gugun024/Auragate.git
cd Auragate

# Install dependencies
npm install

# Initialize SQLite database schema
npx prisma db push
```

### 2. Launch Development Server

```bash
npm run dev
```

Open **[http://localhost:20128](http://localhost:20128)** in your browser to access the Web Admin Dashboard.

---

## 💻 Global CLI Launcher Setup

Link AuraGate globally to run it from any terminal window:

```bash
# Link binary executable globally
npm link

# Run AuraGate from anywhere
auragate

# Run on a custom port
auragate -p 8080
```

---

## 🔌 Integration Guides

### OpenCode CLI (`opencode.json`)

```json
{
  "provider": "openai",
  "options": {
    "baseURL": "http://localhost:20128/v1",
    "apiKey": "ar-sk-your-client-gateway-token"
  }
}
```

### cURL

```bash
curl -X POST http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer ar-sk-your-client-gateway-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Halo dari cURL!"}]
  }'
```

### Python SDK (`openai`)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:20128/v1",
    api_key="ar-sk-your-client-gateway-token"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Halo dari Python!"}]
)

print(response.choices[0].message.content)
```

### Node.js SDK (`openai`)

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:20128/v1',
  apiKey: 'ar-sk-your-client-gateway-token',
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Halo dari Node.js!' }],
  });

  console.log(completion.choices[0].message.content);
}

main();
```

### Context7 MCP Integration

Add Context7 MCP server to your editor configuration (`opencode.json` / `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

---

## 🛡️ Security & Privacy

- **Local SQLite Database**: Your API keys and client access tokens remain 100% local on your machine in `prisma/dev.db`.
- **`.gitignore` Protected**: `.env` and SQLite database files are excluded from git commits to prevent accidental token exposure.

---

## 📜 License

MIT License © 2026 [AuraGate Team](https://github.com/gugun024/Auragate)
