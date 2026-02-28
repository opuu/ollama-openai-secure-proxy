import Elysia from "elysia";
import { ollamaListModels, OllamaError } from "../proxy/ollama";
import { config } from "../config";

export const modelsRoute = new Elysia()
    // List all available models
    .get("/v1/models", async () => {
        try {
            const upstream = await ollamaListModels();
            const data = (await upstream.json()) as {
                data?: Array<{ id: string }>;
            };

            // Inject alias virtual models so SDKs can discover them
            const aliasModels = Object.keys(config.modelAliases).map(
                (alias) => ({
                    id: alias,
                    object: "model",
                    created: Math.floor(Date.now() / 1000),
                    owned_by: "proxy",
                }),
            );

            // Deduplicate by id
            const existingIds = new Set((data?.data ?? []).map((m) => m.id));
            const extra = aliasModels.filter((m) => !existingIds.has(m.id));

            return {
                object: "list",
                data: [...(data?.data ?? []), ...extra],
            };
        } catch (err) {
            if (err instanceof OllamaError) {
                return new Response(
                    JSON.stringify({
                        error: { message: err.body, type: "server_error" },
                    }),
                    {
                        status: err.status,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw err;
        }
    })
    // Retrieve a single model
    .get("/v1/models/:model", async ({ params }) => {
        const modelId = params.model;
        try {
            const upstream = await ollamaListModels();
            const data2 = (await upstream.json()) as {
                data?: Array<{ id: string }>;
            };
            const match = (data2?.data ?? []).find((m) => m.id === modelId);
            if (match) return match;

            // Check aliases
            if (config.modelAliases[modelId]) {
                return {
                    id: modelId,
                    object: "model",
                    created: Math.floor(Date.now() / 1000),
                    owned_by: "proxy",
                };
            }

            return new Response(
                JSON.stringify({
                    error: {
                        message: `Model '${modelId}' not found.`,
                        type: "invalid_request_error",
                    },
                }),
                {
                    status: 404,
                    headers: { "content-type": "application/json" },
                },
            );
        } catch (err) {
            if (err instanceof OllamaError) {
                return new Response(
                    JSON.stringify({
                        error: { message: err.body, type: "server_error" },
                    }),
                    {
                        status: err.status,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw err;
        }
    });
