import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authMiddleware } from "./middleware/auth";
import { chatRoute } from "./routes/chat";
import { modelsRoute } from "./routes/models";
import { embeddingsRoute } from "./routes/embeddings";
import { config } from "./config";

const app = new Elysia()
    // ── CORS ─────────────────────────────────────────────────────────────────
    .use(
        cors({
            origin: (process.env.CORS_ORIGIN ?? "*") as string,
            methods: ["GET", "POST", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }),
    )

    // ── Health (no auth) ──────────────────────────────────────────────────────
    .get("/health", () => ({
        status: "ok",
        ollama: config.ollamaBaseUrl,
        defaultModel: config.defaultModel,
        numThreadsPerRequest: config.numThreads,
    }))

    // ── Auth (applied globally to everything below) ───────────────────────────
    .use(authMiddleware)

    // ── Proxy routes ──────────────────────────────────────────────────────────
    .use(chatRoute)
    .use(modelsRoute)
    .use(embeddingsRoute)

    // ── Global error handler ─────────────────────────────────────────────────
    .onError(({ error, set, code }) => {
        if (code === "VALIDATION") {
            set.status = 422;
            return {
                error: {
                    message:
                        "Request validation failed. Check your request body.",
                    type: "invalid_request_error",
                    details:
                        "message" in error
                            ? (error as Error).message
                            : String(error),
                },
            };
        }

        const msg =
            "message" in error ? (error as Error).message : String(error);
        let body: unknown;
        try {
            body = JSON.parse(msg);
        } catch {
            body = {
                error: {
                    message: msg ?? "Internal server error",
                    type: "server_error",
                },
            };
        }
        return body;
    })

    // ── Start ─────────────────────────────────────────────────────────────────
    .listen({
        hostname: process.env.HOST ?? "127.0.0.1",
        port: parseInt(process.env.PORT ?? "3000", 10),
    });

console.log(
    `🦙  Ollama proxy running at http://${app.server?.hostname}:${app.server?.port}`,
);
console.log(`   → Ollama backend : ${config.ollamaBaseUrl}`);
console.log(`   → Default model  : ${config.defaultModel}`);
console.log(`   → Threads/request: ${config.numThreads}`);
console.log(`   → Context window : ${config.numCtx} tokens`);
console.log(`   → API keys loaded: ${config.apiKeys.size}`);
console.log(`   → Model aliases  : ${JSON.stringify(config.modelAliases)}`);
