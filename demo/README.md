# Demo client

This directory contains a small script demonstrating how to call the proxy using
the official OpenAI SDK from Bun (or Node).

## Setup

```bash
cd demo
bun add openai
# or `npm install openai` if you prefer
```

Create a `.env` file in the `demo` folder or export environment variables directly:

```env
# one of the API_KEYS defined in the proxy's .env
OPENAI_API_KEY=sk-...
# where the proxy is listening (include /v1 prefix)
PROXY_URL=http://127.0.0.1:3000/v1
```

## Run

```bash
bun run demo/chat.ts
```

The script will send a simple chat completion and print the JSON response.
