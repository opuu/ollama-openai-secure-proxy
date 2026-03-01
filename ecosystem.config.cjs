module.exports = {
    apps: [
        {
            name: "vps-llm",
            script: "src/index.ts",

            // Use Bun as the interpreter
            interpreter: "bun",
            interpreter_args: "run",

            // Bun does not support cluster mode — use fork
            exec_mode: "fork",
            instances: 1,

            // Working directory
            cwd: "/home/opu/vps-llm",

            // Load .env automatically (Bun does this natively;
            // PM2 also merges it into the environment)
            env_file: ".env",

            // Environment overrides per deploy target
            env: {
                NODE_ENV: "production",
            },
            env_development: {
                NODE_ENV: "development",
            },

            // Restart policy
            autorestart: true,
            watch: false, // set to ["src"] for hot-reload in dev
            max_memory_restart: "512M",

            // Log config
            out_file: "logs/out.log",
            error_file: "logs/error.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs: true,

            // Wait 5 s before considering the app online (Ollama model load)
            wait_ready: false,
            listen_timeout: 10000,
            kill_timeout: 5000,

            // Exponential back-off on crashes (ms)
            restart_delay: 2000,
            exp_backoff_restart_delay: 100,
        },
    ],

    // ── Optional: deployment config ──────────────────────────────────────────
    // Uncomment and fill in if you use `pm2 deploy`
    // deploy: {
    //   production: {
    //     user: "opu",
    //     host: "57.131.31.41",
    //     ref: "origin/master",
    //     repo: "git@github.com:opuu/ollama-openai-secure-proxy.git",
    //     path: "/home/opu/vps-llm",
    //     "post-deploy": "bun install && pm2 reload ecosystem.config.cjs --env production",
    //   },
    // },
};
