import { config } from "../config";
import type { ChatCompletionRequest, EmbeddingRequest } from "../types";

/**
 * Resolve a model name through aliases.
 * e.g. "gpt-4" → "qwen2.5:14b"
 */
export function resolveModel(model: string): string {
    return config.modelAliases[model] ?? model ?? config.defaultModel;
}

/**
 * Inject CPU-limiting options so Ollama won't saturate all cores
 * for a single request, allowing multiple concurrent conversations.
 */
function injectOllamaOptions(
    body: Record<string, unknown>,
): Record<string, unknown> {
    const existing = (body.options as Record<string, unknown>) ?? {};
    // Map OpenAI max_tokens → Ollama num_predict (-1 = unlimited)
    const maxTokens = body.max_tokens as number | undefined;
    const { max_tokens: _dropped, ...rest } = body;
    return {
        ...rest,
        options: {
            num_thread: config.numThreads, // max CPU threads per request
            num_ctx: config.numCtx, // context window — also caps RAM
            num_predict: maxTokens ?? -1, // -1 = unlimited
            // Allow caller to override anything
            ...existing,
        },
    };
}

/**
 * Forward a chat completion request to Ollama's OpenAI-compatible endpoint.
 * Returns the raw Response so callers can handle streaming or JSON.
 */
export async function ollamaChat(
    req: ChatCompletionRequest,
): Promise<Response> {
    const model = resolveModel(req.model);
    const body = injectOllamaOptions({ ...req, model });

    const url = `${config.ollamaBaseUrl}/v1/chat/completions`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new OllamaError(response.status, text);
    }

    return response;
}

/**
 * Forward an embeddings request to Ollama.
 */
export async function ollamaEmbeddings(
    req: EmbeddingRequest,
): Promise<Response> {
    const model = resolveModel(req.model);
    const url = `${config.ollamaBaseUrl}/v1/embeddings`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, model }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new OllamaError(response.status, text);
    }

    return response;
}

/**
 * List available models from Ollama and format them as OpenAI objects.
 */
export async function ollamaListModels(): Promise<Response> {
    const url = `${config.ollamaBaseUrl}/v1/models`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
        const text = await response.text();
        throw new OllamaError(response.status, text);
    }

    return response;
}

export class OllamaError extends Error {
    constructor(
        public readonly status: number,
        public readonly body: string,
    ) {
        super(`Ollama responded with status ${status}: ${body}`);
        this.name = "OllamaError";
    }
}
