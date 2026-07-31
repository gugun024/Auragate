# ⚡ AuraGate — Smart AI Gateway & API Key Rotator

**AuraGate** is a high-performance, self-hosted AI Gateway, Smart API Key Rotator, and Token Optimization Engine built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **SQLite (Prisma)**.

Designed for AI coding assistants and CLI tools such as **OpenCode**, **Cursor IDE**, and **Cline**, AuraGate allows you to pool multiple API keys across LLM providers, balance request loads, automatically recover from rate limits, save token costs via RTK Token Saver, and manage multi-client access keys securely.

---

## 🌟 Key Features

- **🔄 Smart Key Pool & Round-Robin Rotation**: Load balances requests across multiple provider API keys with priority tiers.
- **⚡ Automatic Failover & Cooldown (429 / 401 / 403 / 5xx)**: Automatically puts rate-limited or failing keys into temporary cooldown (10–30m) and rotates to the next candidate instantly.
- **✨ Auto-Detect Provider & Live Model Importer**: Automatically detects AI providers from key prefixes (`gsk_`, `sk-or-`, `sk-`, `AIzaSy`, `sk-ant-`) and fetches active models live from provider API endpoints.
- **⚡ RTK Token Saver & Prompt Optimizer**: Cleans whitespace, sanitizes trailing spaces, deduplicates consecutive system prompts, and caches responses to reduce token consumption by 30%–60%.
- **🎯 Centralized System Prompt Injection**: Inject global custom instructions (e.g. language preferences, coding rules) into every chat completion request centrally from the Web Dashboard.
- **🔒 Multi-Client Gateway Tokens**: Issue secure `ar-sk-...` tokens for different team members or local editors.
- **📦 Model Catalog with 1-Click Copy**: Browse all aggregated imported models and copy model IDs in 1 click.
- **⚡ Live Network Ping Test**: Test real-time latency (in ms) to Groq, Mistral AI, OpenAI, DeepSeek, Gemini, and OpenRouter directly from the dashboard.
- **📊 Graph Analytics & Usage Breakdown**: Interactive visual analytics showing request distribution per provider and token savings metrics.
- **📱 100% Responsive & SEO Optimized UI**: Sleek Slate Dark mode UI built with Tailwind CSS, sticky headers, and smooth vertical scrolling.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/yourusername/auragate.git
cd auragate

# Install dependencies
npm install

# Push SQLite database schema
npx prisma db push
```

### 2. Running Dev Server

```bash
npm run dev
```

The Web Dashboard will be available at: **http://localhost:20128**  
The AI Proxy Base URL is: **http://localhost:20128/v1**

---

## 🔌 Integration Examples

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

---

## 📜 License

MIT License © 2026 AuraGate Team
