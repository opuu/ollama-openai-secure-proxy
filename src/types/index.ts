// OpenAI-compatible request/response types

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | ContentPart[] | null;
    name?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ContentPart {
    type: "text" | "image_url";
    text?: string;
    image_url?: { url: string; detail?: string };
}

export interface ToolCall {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
}

export interface Tool {
    type: "function";
    function: {
        name: string;
        description?: string;
        parameters?: object;
    };
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    n?: number;
    stream?: boolean;
    stop?: string | string[];
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, number>;
    user?: string;
    tools?: Tool[];
    tool_choice?: string | { type: string; function?: { name: string } };
    response_format?: {
        type: "text" | "json_object" | "json_schema";
        json_schema?: object;
    };
    seed?: number;
    // Extra: passed through to Ollama options
    options?: Record<string, unknown>;
}

export interface ChatCompletionChunk {
    id: string;
    object: "chat.completion.chunk";
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: Partial<ChatMessage>;
        finish_reason: string | null;
    }>;
}

export interface ChatCompletionResponse {
    id: string;
    object: "chat.completion";
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatMessage;
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface ModelObject {
    id: string;
    object: "model";
    created: number;
    owned_by: string;
}

export interface ModelsListResponse {
    object: "list";
    data: ModelObject[];
}

export interface EmbeddingRequest {
    model: string;
    input: string | string[];
    encoding_format?: "float" | "base64";
    user?: string;
}

export interface EmbeddingResponse {
    object: "list";
    data: Array<{ object: "embedding"; embedding: number[]; index: number }>;
    model: string;
    usage: { prompt_tokens: number; total_tokens: number };
}

export interface ProxyConfig {
    ollamaBaseUrl: string;
    defaultModel: string;
    numThreads: number;
    numCtx: number;
    keepAlive: number | string;
    modelAliases: Record<string, string>;
    apiKeys: Set<string>;
    logRequests: boolean;
}
