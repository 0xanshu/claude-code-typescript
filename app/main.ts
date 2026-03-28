import OpenAI from "openai";
import fs from "fs/promises";
import type { ChatCompletionMessageParam } from "openai/resources";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  let allMessage: ChatCompletionMessageParam[] = [
    { role: "user", content: prompt },
  ];

  let response_finished = false;

  while (!response_finished) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: allMessage,
      tools: [
        {
          type: "function",
          function: {
            name: "Read",
            description: "Read and return the contents of a file",
            parameters: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "The path to the file to read",
                },
              },
              required: ["file_path"],
            },
          },
        },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const tool_call = response.choices[0].message.tool_calls;

    if (tool_call) {
      if (tool_call[0].type === "function") {
        let functionName = tool_call[0].function.name;
        let functionArgs = tool_call[0].function.arguments;

        if (functionName === "Read") {
          const filePath = JSON.parse(functionArgs).file_path;
          const fileContents = await fs.readFile(filePath, "utf-8");
          console.log(fileContents);
        } else {
          console.log(`Unknown function: ${functionName}`);
        }
      }

      const assistantResponse = {
        role: response.choices[0].message.role,
        content: response.choices[0].message.content,
      };

      allMessage.push(assistantResponse);
    } else {
      console.log(response.choices[0].message.content);
      response_finished = true;
    }
  }
}

main();
