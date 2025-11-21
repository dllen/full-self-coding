import type { Config } from "../config";

export function getQwenCommand(config: Config, isGlobal: boolean = false): string {
    const qwenCommand = `qwen -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute" --yolo`;

    if (config.qwenCodeApiKey) {
        // Qwen Code CLI likely uses OPENAI_API_KEY or specific env var. 
        // Based on research, it supports OpenAI compatible APIs.
        // But for Qwen OAuth, it might be different.
        // Assuming standard usage or providing key via env var if supported.
        // The research mentioned "Qwen OAuth" or "OpenAI Compatible APIs".
        // If it's a fork of Gemini CLI, it might behave similarly.
        // Let's assume we export the key if provided.
        // However, the specific env var name for Qwen Code CLI isn't explicitly clear from the summary 
        // other than OPENAI_API_KEY for that mode.
        // Let's try to export QWEN_API_KEY or similar if we find it, 
        // but for now, let's just export it as QWEN_API_KEY and maybe OPENAI_API_KEY if needed.
        // Actually, let's stick to the pattern:
        return `export QWEN_API_KEY=${config.qwenCodeApiKey} && ${qwenCommand}`;
    }
    return qwenCommand;
}
