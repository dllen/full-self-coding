import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Config } from "../config";
import { SWEAgentType } from "../config";

export function getLLMAgentSetupCommands(config: Config): string[] {
    const commands: string[] = [];
    // For generic LLM agents, we need to copy the llmAgent.js to /app/llmAgent.js
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const llmAgentPath = path.join(__dirname, 'llmAgent.js');
        const llmAgentContent = fs.readFileSync(llmAgentPath, 'utf8');
        // Escape single quotes for echo
        const escapedContent = llmAgentContent.replace(/'/g, "'\\''");
        commands.push(`echo '${escapedContent}' > /app/llmAgent.js`);
    } catch (e) {
        console.error("Failed to read llmAgent.js", e);
        throw new Error("Failed to read llmAgent.js");
    }
    return commands;
}

export function getLLMAgentCommand(config: Config, agentType: SWEAgentType, promptFile: string = "/app/taskSolverPrompt.txt"): string {
    let apiKey = "";
    let baseUrl = "";
    let model = "";

    switch (agentType) {
        case SWEAgentType.DEEPSEEK:
            apiKey = config.deepSeekApiKey || "";
            baseUrl = "https://api.deepseek.com";
            model = config.deepSeekModel || "deepseek-coder";
            break;
        case SWEAgentType.ZHIPU:
            apiKey = config.zhipuApiKey || "";
            baseUrl = "https://open.bigmodel.cn/api/paas/v4";
            model = config.zhipuModel || "glm-4";
            break;
        case SWEAgentType.DOUBAO:
            apiKey = config.doubaoApiKey || "";
            baseUrl = config.doubaoBaseUrl || "https://ark.cn-beijing.volces.com/api/v3";
            model = config.doubaoModel || "doubao-pro-4k";
            break;
        case SWEAgentType.SEED_CODER:
            apiKey = config.seedCoderApiKey || "";
            baseUrl = config.seedCoderBaseUrl || "https://api.seed-coder.com/v1"; // Example default URL
            model = config.seedCoderModel || "seed-coder-v1";
            break;
        default:
            throw new Error(`Unsupported agent type for LLM Agent: ${agentType}`);
    }

    return `export API_KEY=${apiKey} && export BASE_URL=${baseUrl} && export MODEL=${model} && export PROMPT_FILE=${promptFile} && node /app/llmAgent.js`;
}
