const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration from Environment Variables
const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL = process.env.MODEL;
const PROMPT_FILE = process.env.PROMPT_FILE || '/app/taskSolverPrompt.txt';

if (!API_KEY) {
    console.error("Error: API_KEY environment variable is missing.");
    process.exit(1);
}

if (!BASE_URL) {
    console.error("Error: BASE_URL environment variable is missing.");
    process.exit(1);
}

// Tools Definition
const tools = [
    {
        type: "function",
        function: {
            name: "read_file",
            description: "Read the content of a file",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Absolute path to the file" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "write_file",
            description: "Write content to a file",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Absolute path to the file" },
                    content: { type: "string", description: "Content to write" }
                },
                required: ["path", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "run_command",
            description: "Run a shell command",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string", description: "Command to execute" }
                },
                required: ["command"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_dir",
            description: "List files in a directory",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Directory path" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "task_done",
            description: "Mark the task as completed",
            parameters: {
                type: "object",
                properties: {
                    summary: { type: "string", description: "Summary of what was done" }
                },
                required: ["summary"]
            }
        }
    }
];

// Helper to execute tools
function executeTool(name, args) {
    try {
        console.log(`[Tool Execution] ${name} with args:`, JSON.stringify(args).substring(0, 100) + "...");
        switch (name) {
            case 'read_file':
                return fs.readFileSync(args.path, 'utf8');
            case 'write_file':
                const dir = path.dirname(args.path);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(args.path, args.content);
                return `File ${args.path} written successfully.`;
            case 'run_command':
                try {
                    const output = execSync(args.command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); // Capture stdout and stderr
                    return output;
                } catch (e) {
                    return `Command failed: ${e.message}\nStderr: ${e.stderr}`;
                }
            case 'list_dir':
                return fs.readdirSync(args.path).join('\n');
            case 'task_done':
                console.log("Task marked as done.");
                return "DONE";
            default:
                return `Unknown tool: ${name}`;
        }
    } catch (error) {
        return `Error executing tool ${name}: ${error.message}`;
    }
}

// Main Loop
async function main() {
    let prompt = "";
    try {
        prompt = fs.readFileSync(PROMPT_FILE, 'utf8');
    } catch (e) {
        console.error(`Failed to read prompt file at ${PROMPT_FILE}:`, e);
        process.exit(1);
    }

    const messages = [
        { role: "system", content: "You are an expert software engineer. You have access to tools to read files, write files, run commands, and list directories. Your goal is to complete the task described in the prompt. When you are finished, call the 'task_done' tool." },
        { role: "user", content: prompt }
    ];

    let iteration = 0;
    const MAX_ITERATIONS = 30;

    while (iteration < MAX_ITERATIONS) {
        iteration++;
        console.log(`\n--- Iteration ${iteration} ---`);

        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: messages,
                    tools: tools,
                    tool_choice: "auto"
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            const choice = data.choices[0];
            const message = choice.message;

            messages.push(message);

            if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    const functionName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments);

                    if (functionName === 'task_done') {
                        console.log("Task completed successfully.");
                        // Write success report
                        const report = {
                            taskId: "unknown", // Injected context if needed
                            title: "Task Completed",
                            description: prompt.substring(0, 100) + "...",
                            status: "success",
                            report: args.summary
                        };
                        fs.writeFileSync('/app/finalReport.json', JSON.stringify(report, null, 2));
                        return;
                    }

                    const result = executeTool(functionName, args);
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: result
                    });
                }
            } else {
                console.log("Model response:", message.content);
                // If no tool calls and no content, or just content, we might be stuck or done.
                // For now, let's assume if it just talks, we continue.
                if (!message.content && !message.tool_calls) {
                    console.warn("Empty response from model.");
                }
            }

        } catch (error) {
            console.error("Error in loop:", error);
            // Wait a bit before retrying or exit?
            // For now, break to avoid infinite error loops
            break;
        }
    }

    console.error("Max iterations reached without completion.");
    const report = {
        taskId: "unknown",
        title: "Task Failed",
        description: prompt.substring(0, 100) + "...",
        status: "failed",
        report: "Max iterations reached."
    };
    fs.writeFileSync('/app/finalReport.json', JSON.stringify(report, null, 2));
}

main();
