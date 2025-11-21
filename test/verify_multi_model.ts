import { describe, expect, test } from 'bun:test';
import { Config, SWEAgentType } from '../src/config';
import { getLLMAgentCommand } from '../src/SWEAgent/llmAgentCommands';
import { getQwenCommand } from '../src/SWEAgent/qwenCodeCommands';
import { taskSolverCommands } from '../src/SWEAgent/SWEAgentTaskSolverCommands';

const mockConfig: Config = {
    agentType: SWEAgentType.DEEPSEEK,
    deepSeekApiKey: 'test-api-key',
    deepSeekModel: 'test-model',
    maxDockerContainers: 1,
    maxParallelDockerContainers: 1,
    dockerTimeoutSeconds: 60,
    dockerMemoryMB: 512,
    dockerCpuCores: 1,
    workStyle: 'default',
    codingStyleLevel: 0,
    anthropicAPIKeyExportNeeded: false,
    googleGeminiAPIKeyExportNeeded: false,
    openAICodexAPIKeyExportNeeded: false
};

describe('Multi-Model Support Verification', () => {
    test('getLLMAgentCommand for DEEPSEEK', () => {
        const cmd = getLLMAgentCommand(mockConfig, SWEAgentType.DEEPSEEK);
        expect(cmd).toContain('export API_KEY=test-api-key');
        expect(cmd).toContain('export BASE_URL=https://api.deepseek.com');
        expect(cmd).toContain('export MODEL=test-model');
        expect(cmd).toContain('node /app/llmAgent.js');
    });

    test('getLLMAgentCommand for ZHIPU', () => {
        const zhipuConfig = { ...mockConfig, agentType: SWEAgentType.ZHIPU, zhipuApiKey: 'zhipu-key', zhipuModel: 'glm-4' };
        const cmd = getLLMAgentCommand(zhipuConfig, SWEAgentType.ZHIPU);
        expect(cmd).toContain('export API_KEY=zhipu-key');
        expect(cmd).toContain('export BASE_URL=https://open.bigmodel.cn/api/paas/v4');
        expect(cmd).toContain('export MODEL=glm-4');
    });

    test('getLLMAgentCommand for DOUBAO', () => {
        const doubaoConfig = { ...mockConfig, agentType: SWEAgentType.DOUBAO, doubaoApiKey: 'doubao-key', doubaoModel: 'doubao-pro', doubaoBaseUrl: 'https://custom.url' };
        const cmd = getLLMAgentCommand(doubaoConfig, SWEAgentType.DOUBAO);
        expect(cmd).toContain('export API_KEY=doubao-key');
        expect(cmd).toContain('export BASE_URL=https://custom.url');
        expect(cmd).toContain('export MODEL=doubao-pro');
    });

    test('getLLMAgentCommand for SEED_CODER', () => {
        const seedCoderConfig = { ...mockConfig, agentType: SWEAgentType.SEED_CODER, seedCoderApiKey: 'seed-key', seedCoderModel: 'seed-model', seedCoderBaseUrl: 'https://custom.seed.url' };
        const cmd = getLLMAgentCommand(seedCoderConfig, SWEAgentType.SEED_CODER);
        expect(cmd).toContain('export API_KEY=seed-key');
        expect(cmd).toContain('export BASE_URL=https://custom.seed.url');
        expect(cmd).toContain('export MODEL=seed-model');
    });

    test('getQwenCommand for QWEN_CLI', () => {
        const qwenConfig = { ...mockConfig, agentType: SWEAgentType.QWEN_CLI, qwenCodeApiKey: 'qwen-key' };
        const cmd = getQwenCommand(qwenConfig);
        expect(cmd).toContain('export QWEN_API_KEY=qwen-key');
        expect(cmd).toContain('qwen -p');
    });

    test('taskSolverCommands includes setup and execution', () => {
        const commands = taskSolverCommands(SWEAgentType.DEEPSEEK, mockConfig, { ID: '1', description: 'test' } as any, 'http://git.url');

        // Check for setup command (echo llmAgent.js)
        const setupCmd = commands.find(c => c.startsWith('echo') && c.includes('/app/llmAgent.js'));
        expect(setupCmd).toBeDefined();

        // Check for execution command
        const execCmd = commands.find(c => c.includes('node /app/llmAgent.js'));
        expect(execCmd).toBeDefined();
        expect(execCmd).toContain('export API_KEY=test-api-key');
    });
});
