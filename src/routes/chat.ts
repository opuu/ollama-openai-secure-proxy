import Elysia, { t } from "elysia";
import { ollamaChat, OllamaError, resolveModel } from "../proxy/ollama";
import { config } from "../config";
import type { ChatCompletionRequest } from "../types";

function logRequest(model: string, stream: boolean, messageCount: number) {
    if (!config.logRequests) return;
    const ts = new Date().toISOString();
    console.log(
        `[${ts}] chat  model=${model} stream=${stream} messages=${messageCount}`,
    );
}

function openAIError(
    status: number,
    message: string,
    type = "server_error",
    code?: string,
) {
    return new Response(
        JSON.stringify({ error: { message, type, code: code ?? type } }),
        { status, headers: { "content-type": "application/json" } },
    );
}

export const chatRoute = new Elysia().post(
    "/v1/chat/completions",
    async ({ body, set }) => {
        const req = body as ChatCompletionRequest;

        logRequest(resolveModel(req.model), !!req.stream, req.messages.length);

        try {
            const upstream = await ollamaChat(req);

            // ── Streaming ─────────────────────────────────────────────────────────
            if (req.stream) {
                set.headers["content-type"] =
                    "text/event-stream; charset=utf-8";
                set.headers["cache-control"] = "no-cache";
                set.headers["x-accel-buffering"] = "no"; // Disable nginx buffering

                // Pipe Ollama SSE stream directly to client
                return new Response(upstream.body, {
                    headers: {
                        "content-type": "text/event-stream; charset=utf-8",
                        "cache-control": "no-cache",
                        "x-accel-buffering": "no",
                    },
                });
            }

            // ── Non-streaming ─────────────────────────────────────────────────────
            const data = await upstream.json();
            return new Response(JSON.stringify(data), {
                headers: { "content-type": "application/json" },
            });
        } catch (err) {
            if (err instanceof OllamaError) {
                // Try to surface Ollama's own error message
                let detail = err.body;
                try {
                    const parsed = JSON.parse(err.body);
                    detail = parsed?.error ?? detail;
                } catch {}
                return openAIError(
                    err.status >= 400 && err.status < 600 ? err.status : 502,
                    detail,
                );
            }
            console.error("[chat] unexpected error:", err);
            return openAIError(500, "Internal proxy error");
        }
    },
    {
        // Basic schema validation — keeps bad requests from hitting Ollama
        body: t.Object(
            {
                model: t.String(),
                messages: t.Array(
                    t.Object({
                        role: t.String(),
                        content: t.Union([
                            t.String(),
                            t.Array(t.Any()),
                            t.Null(),
                        ]),
                        name: t.Optional(t.String()),
                        tool_calls: t.Optional(t.Array(t.Any())),
                        tool_call_id: t.Optional(t.String()),
                    }),
                ),
                temperature: t.Optional(t.Number()),
                top_p: t.Optional(t.Number()),
                n: t.Optional(t.Number()),
                stream: t.Optional(t.Boolean()),
                stop: t.Optional(t.Union([t.String(), t.Array(t.String())])),
                max_tokens: t.Optional(t.Number()),
                presence_penalty: t.Optional(t.Number()),
                frequency_penalty: t.Optional(t.Number()),
                user: t.Optional(t.String()),
                tools: t.Optional(t.Array(t.Any())),
                tool_choice: t.Optional(t.Any()),
                response_format: t.Optional(t.Any()),
                seed: t.Optional(t.Number()),
                options: t.Optional(t.Any()),
            },
            { additionalProperties: true },
        ),
    },
);
