import OpenAI from "openai";

const proxyUrl = process.env.PROXY_URL || "http://127.0.0.1:3000/v1";
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error("🚨 Please set OPENAI_API_KEY before running");
    process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL: proxyUrl });

// All installed models on the server
const MODELS = [
    "qwen2.5:1.5b-instruct",
    "qwen2.5:3b",
    "qwen2.5:7b",
    "qwen2.5:14b",
    "mistral:7b-instruct",
    "phi3:mini",
];

// Same prompt for every model — representative real-world task
const MESSAGES: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
        role: "system",
        content:
            "You are a restaurant waiter. Reply ONLY with valid JSON (no markdown): " +
            '{"productId": <number>, "response": "<one sentence recommendation>"}',
    },
    {
        role: "system",
        content:
            "Menu: " +
            JSON.stringify([
                { id: 544, name: "Butter Chicken" },
                { id: 546, name: "Poulet Tikka Masala" },
                { id: 598, name: "Poulet Biryani Classique" },
                { id: 587, name: "Dal Saag" },
                { id: 589, name: "Saag Paneer" },
                { id: 608, name: "Naand'wich Poulet Tikka" },
            ]),
    },
    { role: "user", content: "Suggest me a good dish for dinner." },
];
const MAX_TOKENS = 80;

type Result = {
    model: string;
    ms: number;
    outputTokens: number;
    totalTokens: number;
    tokensPerSec: number;
    finish: string;
    ok: boolean;
    reply: string;
};

async function runModel(model: string): Promise<Result> {
    const start = performance.now();
    try {
        const resp = await client.chat.completions.create({
            model,
            max_tokens: MAX_TOKENS,
            messages: MESSAGES,
        });
        const ms = Math.round(performance.now() - start);
        const choice = resp.choices[0];
        const outputTokens = resp.usage?.completion_tokens ?? 0;
        const totalTokens = resp.usage?.total_tokens ?? 0;
        const tokensPerSec =
            outputTokens > 0 ? Math.round((outputTokens / ms) * 1000) : 0;
        const reply = choice.message.content?.trim() ?? "";

        console.log(
            `  ${model.padEnd(24)} ✅  ${String(ms).padStart(6)} ms | ` +
                `out=${String(outputTokens).padStart(3)} tok | ` +
                `${String(tokensPerSec).padStart(3)} tok/s | ` +
                `${reply.slice(0, 60)}`,
        );
        return {
            model,
            ms,
            outputTokens,
            totalTokens,
            tokensPerSec,
            finish: choice.finish_reason ?? "",
            ok: true,
            reply,
        };
    } catch (err: any) {
        const ms = Math.round(performance.now() - start);
        const msg = err?.message ?? String(err);
        console.log(
            `  ${model.padEnd(24)} ❌  ${String(ms).padStart(6)} ms | ${msg.slice(0, 60)}`,
        );
        return {
            model,
            ms,
            outputTokens: 0,
            totalTokens: 0,
            tokensPerSec: 0,
            finish: "error",
            ok: false,
            reply: msg,
        };
    }
}

// Run sequentially so models don't compete for the same CPU/GPU
console.log(
    `🔬  Model speed benchmark — same prompt, all models (sequential)\n`,
);
console.log(`  Prompt: "${MESSAGES.at(-1)!.content as string}"`);
console.log(`  Max output tokens: ${MAX_TOKENS}\n`);
console.log(
    `  ${"Model".padEnd(24)} ${"Time".padStart(9)}   ${"Out tok".padStart(7)}   ${"tok/s".padStart(6)}   Reply`,
);
console.log("  " + "─".repeat(90));

const results: Result[] = [];
for (const model of MODELS) {
    results.push(await runModel(model));
}

// ── Summary ───────────────────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok);
const sorted = [...passed].sort((a, b) => a.ms - b.ms);
const fastestTime = sorted[0];
const fastestToks = [...passed].sort(
    (a, b) => b.tokensPerSec - a.tokensPerSec,
)[0];

console.log("\n── Results (sorted by latency) " + "─".repeat(60));
console.log(
    `  ${"Rank".padEnd(5)} ${"Model".padEnd(24)} ${"Time (ms)".padStart(10)} ${"Out tok".padStart(8)} ${"tok/s".padStart(7)}`,
);
console.log("  " + "─".repeat(60));
sorted.forEach((r, i) => {
    const tag = i === 0 ? " ⚡" : "";
    console.log(
        `  ${String(i + 1).padEnd(5)} ${r.model.padEnd(24)} ${String(r.ms).padStart(10)} ${String(r.outputTokens).padStart(8)} ${String(r.tokensPerSec).padStart(7)}${tag}`,
    );
});
console.log("  " + "─".repeat(60));
console.log(
    `\n⚡  Fastest response : ${fastestTime?.model} (${fastestTime?.ms} ms)`,
);
console.log(
    `🚀  Highest tok/s    : ${fastestToks?.model} (${fastestToks?.tokensPerSec} tok/s)`,
);
