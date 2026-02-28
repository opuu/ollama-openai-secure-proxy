import Elysia from "elysia";
import { config } from "../config";

export const authMiddleware = new Elysia({ name: "auth" }).derive(
    { as: "global" },
    ({ request, set }) => {
        // Skip auth for health check
        const url = new URL(request.url);
        if (url.pathname === "/health") return {};

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : authHeader.trim();

        if (!config.apiKeys.has(token)) {
            set.status = 401;
            set.headers["content-type"] = "application/json";
            throw new Error(
                JSON.stringify({
                    error: {
                        message: "Invalid or missing API key.",
                        type: "invalid_request_error",
                        code: "invalid_api_key",
                    },
                }),
            );
        }

        return {};
    },
);
