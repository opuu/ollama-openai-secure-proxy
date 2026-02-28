import Elysia, { t } from "elysia";
import { ollamaEmbeddings, OllamaError } from "../proxy/ollama";
import type { EmbeddingRequest } from "../types";
import { config } from "../config";

export const embeddingsRoute = new Elysia().post(
    "/v1/embeddings",
    async ({ body }) => {
        const req = body as EmbeddingRequest;
        if (config.logRequests) {
            console.log(
                `[${new Date().toISOString()}] embed model=${req.model}`,
            );
        }
        try {
            const upstream = await ollamaEmbeddings(req);
            const data = await upstream.json();
            return new Response(JSON.stringify(data), {
                headers: { "content-type": "application/json" },
            });
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
    },
    {
        body: t.Object(
            {
                model: t.String(),
                input: t.Union([t.String(), t.Array(t.String())]),
                encoding_format: t.Optional(t.String()),
                user: t.Optional(t.String()),
            },
            { additionalProperties: true },
        ),
    },
);
