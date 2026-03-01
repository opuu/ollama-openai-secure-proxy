import OpenAI from "openai";

// Make sure you have set OPENAI_API_KEY to one of the keys listed in your
// proxy's API_KEYS. The proxy URL should also be available via PROXY_URL.

const proxyUrl = process.env.PROXY_URL || "http://127.0.0.1:3000/v1";
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error(
        "🚨 Please set OPENAI_API_KEY to your proxy key before running",
    );
    process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL: proxyUrl });

async function main() {
    const resp = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: "What is the capital of France?" }],
    });

    console.log(JSON.stringify(resp, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
