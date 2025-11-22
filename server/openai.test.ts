import { describe, expect, it } from "vitest";
import OpenAI from "openai";

describe("OpenAI API Connection", () => {
  it("should connect to OpenAI and verify API key", async () => {
    expect(process.env.OPENAI_API_KEY).toBeDefined();
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Fazer uma chamada simples para verificar a chave
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Responda apenas: OK"
        }
      ],
      max_tokens: 10,
    });

    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message.content).toBeDefined();
  }, 30000); // Timeout de 30s para chamada de API
});
