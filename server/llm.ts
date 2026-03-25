import axios from "axios";
// Triggering reload to pick up .env changes

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

export async function invokeLLM(messages: Message[]): Promise<string> {
  try {
    const response = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      messages: messages,
      stream: false,
    });

    return response.data.message.content;
  } catch (error: any) {
    console.error("[Ollama Error]", error.message);
    throw new Error(`Failed to connect to Ollama: ${error.message}. Make sure Ollama is running locally with '${OLLAMA_MODEL}' model installed.`);
  }
}
