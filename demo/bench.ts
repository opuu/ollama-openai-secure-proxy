import OpenAI from "openai";

const proxyUrl = process.env.PROXY_URL || "http://127.0.0.1:3000/v1";
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error("🚨 Please set OPENAI_API_KEY before running");
    process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL: proxyUrl });

// ── Request scenarios ─────────────────────────────────────────────────────────

type Scenario = {
    label: string;
    max_tokens?: number;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
};

const menuItems = [
    { id: 536, name: "Nan Fromage" },
    { id: 544, name: "Butter Chicken / Poulet au beurre" },
    { id: 546, name: "Poulet Tikka Masala" },
    { id: 545, name: "Poulet Shahi Korma" },
    { id: 513, name: "Poulet Tikka 6P" },
    { id: 547, name: "Poulet Madras" },
    { id: 598, name: "Poulet Biryani Classique" },
    { id: 587, name: "Dal Saag / Épinards + Lentilles" },
    { id: 589, name: "Saag Paneer / Épinard + Fromage" },
    { id: 608, name: "Naand'wich Poulet Tikka" },
];

const scenarios: Scenario[] = [
    // 1. Short factual — very fast, minimal tokens
    {
        label: "short-fact",
        max_tokens: 30,
        messages: [
            {
                role: "user",
                content: "What is the capital of France? Reply in one word.",
            },
        ],
    },

    // 2. Simple maths
    {
        label: "math",
        max_tokens: 50,
        messages: [
            {
                role: "user",
                content:
                    "What is 1337 * 42? Show only the result, no explanation.",
            },
        ],
    },

    // 3. JSON extraction from unstructured text
    {
        label: "json-extract",
        max_tokens: 120,
        messages: [
            {
                role: "system",
                content:
                    "Extract structured data and reply ONLY with valid JSON, no markdown.",
            },
            {
                role: "user",
                content:
                    "Order: 'Hi, I'd like 2 Butter Chickens and 1 Nan Garlic, deliver to 12 Rue de Rivoli at 7pm, name is Sophie.'",
            },
        ],
    },

    // 4. Restaurant waiter — small JSON response
    {
        label: "waiter-json",
        max_tokens: 80,
        messages: [
            {
                role: "system",
                content:
                    `You are a restaurant waiter. Menu: ${JSON.stringify(menuItems)}. ` +
                    `Reply ONLY with valid JSON: {"productId":<number>,"response":"<one sentence>"}`,
            },
            {
                role: "user",
                content: "I'm very hungry, suggest your best dish.",
            },
        ],
    },

    // 5. Sentiment classification
    {
        label: "sentiment",
        max_tokens: 20,
        messages: [
            {
                role: "system",
                content:
                    "Classify the sentiment of the review. Reply with exactly one word: positive, negative, or neutral.",
            },
            {
                role: "user",
                content:
                    "The Tikka Masala was incredible, best I've had in years!",
            },
        ],
    },

    // 6. Translation (French → English)
    {
        label: "translate",
        max_tokens: 80,
        messages: [
            {
                role: "system",
                content: "Translate the following French text to English.",
            },
            {
                role: "user",
                content:
                    "Bonjour, je voudrais commander un Poulet Biryani Classique et deux Nan Fromage s'il vous plaît.",
            },
        ],
    },

    // 7. Multi-turn conversation
    {
        label: "multi-turn",
        max_tokens: 100,
        messages: [
            {
                role: "system",
                content: "You are a friendly restaurant assistant.",
            },
            { role: "user", content: "Do you have anything vegetarian?" },
            {
                role: "assistant",
                content:
                    "Yes! We have Dal Saag, Saag Paneer, and various Nan breads.",
            },
            {
                role: "user",
                content: "Which one do you recommend for a first timer?",
            },
        ],
    },

    // 8. Code generation (short)
    {
        label: "codegen",
        max_tokens: 150,
        messages: [
            {
                role: "system",
                content:
                    "You are a coding assistant. Reply with code only, no explanation.",
            },
            {
                role: "user",
                content:
                    "Write a TypeScript function that takes an array of {id: number, name: string} and returns the one whose name matches a search string (case-insensitive).",
            },
        ],
    },

    // 9. Summarisation of a longer input
    {
        label: "summarise",
        max_tokens: 80,
        messages: [
            {
                role: "system",
                content: "Summarise the following in one sentence.",
            },
            {
                role: "user",
                content:
                    "Our restaurant specialises in authentic North Indian cuisine. " +
                    "We have been serving the local community for over 15 years, " +
                    "offering a wide range of dishes from creamy Butter Chicken and " +
                    "fragrant Biryani to crispy Samousas and freshly baked Nan breads. " +
                    "All dishes are prepared fresh daily using traditional spices imported " +
                    "directly from India. We also cater for vegetarians and offer a children's menu.",
            },
        ],
    },

    // 10. Boolean yes/no decision
    {
        label: "yes-no",
        max_tokens: 10,
        messages: [
            {
                role: "system",
                content: "Answer only with 'yes' or 'no', nothing else.",
            },
            { role: "user", content: "Is Poulet Tikka Masala a vegan dish?" },
        ],
    },
];

// ── Runner ────────────────────────────────────────────────────────────────────

type Result = {
    id: number;
    label: string;
    ms: number;
    tokens: number;
    finish: string;
    ok: boolean;
    reply: string;
};

async function runScenario(id: number, scenario: Scenario): Promise<Result> {
    const start = performance.now();
    try {
        const resp = await client.chat.completions.create({
            model: "qwen2.5:3b",
            max_tokens: scenario.max_tokens,
            messages: scenario.messages,
        });
        const ms = Math.round(performance.now() - start);
        const choice = resp.choices[0];
        const reply = choice.message.content?.trim() ?? "";
        console.log(
            `[#${String(id).padStart(2, "0")} ${scenario.label.padEnd(12)}] ✅  ${String(ms).padStart(6)} ms | tokens=${String(resp.usage?.total_tokens ?? "?").padStart(4)} | finish=${choice.finish_reason} | ${reply.slice(0, 70)}`,
        );
        return {
            id,
            label: scenario.label,
            ms,
            tokens: resp.usage?.total_tokens ?? 0,
            finish: choice.finish_reason ?? "",
            ok: true,
            reply,
        };
    } catch (err: any) {
        const ms = Math.round(performance.now() - start);
        const msg = err?.message ?? String(err);
        console.log(
            `[#${String(id).padStart(2, "0")} ${scenario.label.padEnd(12)}] ❌  ${String(ms).padStart(6)} ms | ${msg.slice(0, 80)}`,
        );
        return {
            id,
            label: scenario.label,
            ms,
            tokens: 0,
            finish: "error",
            ok: false,
            reply: msg,
        };
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(
    `🚀  Firing ${scenarios.length} parallel requests (one per scenario) to ${proxyUrl}\n`,
);
const wallStart = performance.now();

const results = await Promise.all(
    scenarios.map((scenario, i) => runScenario(i + 1, scenario)),
);

const wallMs = Math.round(performance.now() - wallStart);

// Summary table
const sorted = [...results].sort((a, b) => a.ms - b.ms);
const avgMs = Math.round(
    results.reduce((s, r) => s + r.ms, 0) / results.length,
);
const passed = results.filter((r) => r.ok).length;

console.log("\n── Summary (sorted by latency) " + "─".repeat(50));
console.log(
    `${"Rank".padEnd(5)} ${"#".padEnd(4)} ${"Scenario".padEnd(14)} ${"Time (ms)".padStart(10)} ${"Tokens".padStart(7)} ${"Finish".padStart(10)}`,
);
console.log("─".repeat(55));
sorted.forEach((r, rank) => {
    console.log(
        `${String(rank + 1).padEnd(5)} ${String(r.id).padEnd(4)} ${r.label.padEnd(14)} ${String(r.ms).padStart(10)} ${String(r.tokens).padStart(7)} ${r.finish.padStart(10)}`,
    );
});
console.log("─".repeat(55));
console.log(`\n✅  Passed: ${passed}/${results.length}`);
console.log(`⏱   Wall time : ${wallMs} ms`);
console.log(`📊  Avg latency: ${avgMs} ms`);
console.log(
    `🐢  Slowest    : ${sorted[sorted.length - 1]?.label} (${sorted[sorted.length - 1]?.ms} ms)`,
);
console.log(`⚡  Fastest    : ${sorted[0]?.label} (${sorted[0]?.ms} ms)`);
