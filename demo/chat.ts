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

const items = [
    {
        id: 536,
        name: "Nan Fromage",
    },
    {
        id: 544,
        name: "Butter Chicken / Poulet au beurre",
    },
    {
        id: 538,
        name: "Nan Garlic Formage",
    },
    {
        id: 546,
        name: "Poulet Tikka Masala",
    },
    {
        id: 535,
        name: "Nan Nature",
    },
    {
        id: 545,
        name: "Poulet Shahi Korma",
    },
    {
        id: 513,
        name: "Poulet Tikka 6P",
    },
    {
        id: 501,
        name: "Samoussa Légumes 1p",
    },
    {
        id: 547,
        name: "Poulet Madras",
    },
    {
        id: 507,
        name: "Pakora de Lentilles 4p",
    },
    {
        id: 598,
        name: "Poulet Biryani Classique",
    },
    {
        id: 608,
        name: "Naand’wich Poulet Tikka",
    },
    {
        id: 587,
        name: "Dal Saag / Épinards + Lentilles",
    },
    {
        id: 589,
        name: "Saag Paneer / Épinard + Fromage",
    },
    {
        id: 537,
        name: "Nan Garlic",
    },
    {
        id: 504,
        name: "Pakora de Oignon 4p",
    },
    {
        id: 506,
        name: "Pakora de légumes 2p",
    },
    {
        id: 542,
        name: "Paratha",
    },
    {
        id: 622,
        name: "Lassi Mangue",
    },
    {
        id: 525,
        name: "Riz Basmati Nature",
    },
];

async function main() {
    const resp = await client.chat.completions.create({
        model: "qwen2.5:3b",
        messages: [
            {
                role: "system",
                content:
                    "You are a restaurant waiter helping customers order food.",
            },
            {
                role: "system",
                content: `Here is the menu (id and name of each dish): ${JSON.stringify(items)}`,
            },
            {
                role: "system",
                content:
                    "Respond to the customer with this format: { productId: number; response: string }",
            },
            {
                role: "user",
                content: "Suggest me a good dish to eat in the evening.",
            },
        ],
    });

    console.log(JSON.stringify(resp, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
