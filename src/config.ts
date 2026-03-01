import type { ProxyConfig } from "./types";

function parseKeys(raw: string | undefined): Set<string> {
    if (!raw || raw.trim() === "") return new Set();
    return new Set(
        raw
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
    );
}

function parseAliases(raw: string | undefined): Record<string, string> {
    if (!raw || raw.trim() === "") return {};
    return Object.fromEntries(
        raw
            .split(",")
            .map((pair) => pair.trim())
            .filter(Boolean)
            .map((pair) => {
                const idx = pair.indexOf(":");
                if (idx === -1) return ["", ""];
                const alias = pair.slice(0, idx).trim();
                const target = pair.slice(idx + 1).trim();
                return [alias, target];
            })
            .filter(([a, t]) => a && t),
    );
}

export function loadConfig(): ProxyConfig {
    const apiKeys = parseKeys(process.env.API_KEYS);

    if (apiKeys.size === 0) {
        console.error(
            "❌  API_KEYS is not set. Set at least one key in your .env file.",
        );
        process.exit(1);
    }

    // Aliases are optional convenience shortcuts → real Ollama model names.
    // If MODEL_ALIASES is not set, these defaults are used.
    // Any model name NOT listed here is passed through to Ollama as-is,
    // so clients can always use the real name directly (e.g. "qwen2.5:14b").
    const defaultAliasStr =
        process.env.MODEL_ALIASES ??
        [
            // ── Size-based shorthand ───────────────────────────────────────────
            "qwen-tiny:qwen2.5:1.5b-instruct",
            "qwen-small:qwen2.5:3b",
            "qwen-medium:qwen2.5:7b",
            "qwen-large:qwen2.5:14b",
            // ── Short names for other installed models ─────────────────────────
            "mistral:mistral:7b-instruct",
            "phi3:phi3:mini",
        ].join(",");

    return {
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
        defaultModel: process.env.DEFAULT_MODEL ?? "qwen2.5:14b",
        // Threads per request — keep at ~half your cores to allow concurrent reqs
        numThreads: parseInt(process.env.NUM_THREADS ?? "4", 10),
        // Context window size (tokens) — larger = more RAM
        numCtx: parseInt(process.env.NUM_CTX ?? "4096", 10),
        // How long Ollama keeps the model in memory; -1 = forever, 0 = unload immediately
        keepAlive: process.env.KEEP_ALIVE ?? "-1",
        modelAliases: parseAliases(defaultAliasStr),
        apiKeys,
        logRequests: process.env.LOG_REQUESTS !== "false",
    };
}

export const config = loadConfig();
