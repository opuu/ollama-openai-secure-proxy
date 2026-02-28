# vps-llm — Ollama OpenAI-Compatible Proxy

A lightweight [Bun](https://bun.sh) + [Elysia](https://elysiajs.com) proxy that sits between
your application (using the **OpenAI SDK**) and a local **Ollama** instance.

```
Your App (OpenAI SDK)
        │
        │  Bearer <api-key>
        ▼
  vps-llm proxy  :3000          ← this repo
        │
        │  http://127.0.0.1:11434
        ▼
     Ollama
        │
        ▼
  qwen2.5:14b  (or any model)
```

---

## Features

- **OpenAI-compatible** – `/v1/chat/completions`, `/v1/models`, `/v1/embeddings`
- **Streaming** – SSE pass-through with zero buffering
- **API key auth** – multiple keys, checked on every request
- **Model aliasing** – map `gpt-4` → `qwen2.5:14b` transparently
- **CPU throttling** – injects `num_thread` per request so Ollama never saturates all cores
- **Zero GPU required** – designed for CPU-only VPS

---

## 1. Choose Your Model

For an **8-core / 24 GB RAM / CPU-only** server, these are the recommended models:

| Model                       | RAM usage | JSON quality | Speed (tok/s CPU) | Recommended use                  |
| --------------------------- | --------- | ------------ | ----------------- | -------------------------------- |
| `qwen2.5:14b` (Q4_K_M)      | ~9 GB     | ★★★★★        | ~3-5              | **Best overall — use this**      |
| `qwen2.5:7b` (Q4_K_M)       | ~5 GB     | ★★★★☆        | ~7-10             | Fast fallback / high concurrency |
| `llama3.1:8b` (Q4_K_M)      | ~5 GB     | ★★★☆☆        | ~6-9              | General chat                     |
| `mistral-nemo:12b` (Q4_K_M) | ~7 GB     | ★★★★☆        | ~4-6              | Long context                     |

**`qwen2.5:14b`** is the standout choice for complex JSON structures. It consistently
produces valid JSON, handles nested schemas, and supports function calling reliably.

```bash
# Pull the recommended model
ollama pull qwen2.5:14b

# Optional: fast model for low-latency endpoints
ollama pull qwen2.5:7b
```

---

## 2. Install & Configure

```bash
# Clone and install
git clone <your-repo> vps-llm
cd vps-llm
bun install

# Create your .env
cp .env.example .env
```

Edit `.env`:

```env
# Generate with:  openssl rand -hex 32
API_KEYS=sk-abc123...,sk-def456...

OLLAMA_BASE_URL=http://127.0.0.1:11434
DEFAULT_MODEL=qwen2.5:14b

# ── CPU THREAD CONTROL (critical for multi-user) ──────────────────────────────
# On an 8-core machine: set to 4 threads/request
# This allows 2 simultaneous requests before contention.
# Formula: floor(total_cores / expected_concurrent_requests)
NUM_THREADS=4

# Context window — larger uses more RAM per parallel instance
NUM_CTX=4096
```

---

## 3. Configure Ollama for Concurrency

Ollama has its own concurrency knobs that must be set **before** you start Ollama.
Add these to Ollama's systemd override:

```bash
sudo systemctl edit ollama
```

```ini
[Service]
# Allow Ollama to serve multiple requests simultaneously
Environment="OLLAMA_NUM_PARALLEL=2"

# Keep 1 model loaded (avoids reload cost between requests)
Environment="OLLAMA_MAX_LOADED_MODELS=1"

# Cap total CPU threads Ollama can use across ALL requests
# On 8-core: leave 1-2 for OS = 6 total → 3 per request if PARALLEL=2
Environment="OLLAMA_NUM_THREAD=6"

# Flash attention speeds up Q4 models slightly, no GPU needed
Environment="OLLAMA_FLASH_ATTENTION=1"
```

```bash
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

### Thread Math for 8-core / 24 GB

```
8 cores total
- 1-2 reserved for OS + Bun proxy
= 6 cores for Ollama

OLLAMA_NUM_PARALLEL=2  →  2 concurrent requests
OLLAMA_NUM_THREAD=6    →  Ollama total thread cap
NUM_THREADS=4          →  per-request cap injected by this proxy
```

Each request uses at most 4 threads; two can safely overlap.
Expected: ~3-5 tok/s per stream with 2 simultaneous conversations.

---

## 4. Run the Proxy

```bash
# Development (hot reload)
bun dev

# Production
bun start
```

---

## 5. Deploy as a systemd Service

```bash
# Edit WorkingDirectory and User in vps-llm.service, then:
sudo cp vps-llm.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vps-llm
sudo journalctl -u vps-llm -f
```

---

## 6. Nginx Reverse Proxy (recommended)

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_buffering    off;        # Critical for SSE streaming
        proxy_cache        off;
        proxy_read_timeout 300s;
    }
}
```

---

## 7. Use with OpenAI SDK

**TypeScript / JavaScript**

```ts
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: "sk-abc123...",
    baseURL: "https://api.yourdomain.com/v1",
});

// "gpt-4" is aliased to qwen2.5:14b on the proxy
const res = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Return JSON with name and age." }],
    response_format: { type: "json_object" },
});
```

**Python**

```python
from openai import OpenAI

client = OpenAI(api_key="sk-abc123...", base_url="https://api.yourdomain.com/v1")

stream = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Explain async/await in Python"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

## API Reference

| Endpoint               | Method | Auth   | Description                      |
| ---------------------- | ------ | ------ | -------------------------------- |
| `/health`              | GET    | none   | Health + config check            |
| `/v1/chat/completions` | POST   | Bearer | Chat, streaming & non-streaming  |
| `/v1/models`           | GET    | Bearer | List all Ollama models + aliases |
| `/v1/models/:id`       | GET    | Bearer | Get a single model               |
| `/v1/embeddings`       | POST   | Bearer | Text embeddings                  |

---

## Environment Variables

| Variable          | Default                  | Description                      |
| ----------------- | ------------------------ | -------------------------------- |
| `API_KEYS`        | **required**             | Comma-separated Bearer keys      |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama address                   |
| `DEFAULT_MODEL`   | `qwen2.5:14b`            | Fallback model                   |
| `NUM_THREADS`     | `4`                      | CPU threads injected per request |
| `NUM_CTX`         | `4096`                   | Context window (tokens)          |
| `MODEL_ALIASES`   | see `.env.example`       | `alias:target` pairs             |
| `HOST`            | `127.0.0.1`              | Bind address                     |
| `PORT`            | `3000`                   | Port                             |
| `CORS_ORIGIN`     | `*`                      | CORS allowed origin              |
| `LOG_REQUESTS`    | `true`                   | Log each request to stdout       |
