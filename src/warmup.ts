import { config } from "./config";

/**
 * Pre-load a list of Ollama models into memory by sending a no-op generate
 * request. Uses keep_alive: -1 so each model stays resident indefinitely.
 *
 * Runs in parallel — all models load simultaneously rather than sequentially.
 */
export async function warmupModels(models: string[]): Promise<void> {
    if (models.length === 0) return;

    console.log(
        `🔥  Warming up ${models.length} model(s): ${models.join(", ")}`,
    );

    const results = await Promise.allSettled(
        models.map((model) => warmupOne(model)),
    );

    for (const [i, result] of results.entries()) {
        const model = models[i];
        if (result.status === "fulfilled") {
            console.log(`   ✅  ${model} loaded`);
        } else {
            console.warn(`   ⚠️  ${model} warmup failed: ${result.reason}`);
        }
    }
}

async function warmupOne(model: string): Promise<void> {
    // POST /api/generate with an empty prompt — Ollama loads the model and
    // returns immediately. keep_alive: -1 pins it in memory permanently.
    const url = `${config.ollamaBaseUrl}/api/generate`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            prompt: "",
            keep_alive: -1,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }

    // Drain the response body
    await res.body?.cancel();
}
