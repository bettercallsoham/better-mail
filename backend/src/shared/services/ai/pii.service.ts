import {
  TextAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-language-text";
import "dotenv/config";

const { AZURE_LANGUAGE_ENDPOINT, AZURE_LANGUAGE_KEY } = process.env;

if (!AZURE_LANGUAGE_KEY || !AZURE_LANGUAGE_ENDPOINT) {
  throw new Error("Missing AZURE_LANGUAGE_ENDPOINT or AZURE_LANGUAGE_KEY");
}

class PIIService {
  private static instance: PIIService;
  private client: TextAnalysisClient;

  private constructor() {
    this.client = new TextAnalysisClient(
      AZURE_LANGUAGE_ENDPOINT!,
      new AzureKeyCredential(AZURE_LANGUAGE_KEY!),
    );
  }

  static getInstance(): PIIService {
    if (!PIIService.instance) PIIService.instance = new PIIService();
    return PIIService.instance;
  }

  async sanitize(text: string): Promise<string> {
    if (!text?.trim()) return "";
    try {
      const [result] = await this.client.analyze(
        "PiiEntityRecognition", // ← new API: single method, action as string
        [text.slice(0, 5120)],
        "en",
      );
      if (result.error) return this.fallback(text);
      return this.applyMask(text.slice(0, 5120), result.entities);
    } catch {
      return this.fallback(text);
    }
  }

  async sanitizeBatch(texts: string[]): Promise<string[]> {
    if (!texts.length) return [];
    try {
      const results = await this.client.analyze(
        "PiiEntityRecognition",
        texts.map((t) => t.slice(0, 5120)),
        "en",
      );
      return results.map((r, i) =>
        r.error
          ? this.fallback(texts[i])
          : this.applyMask(texts[i].slice(0, 5120), r.entities),
      );
    } catch {
      return texts.map((t) => this.fallback(t));
    }
  }

  private applyMask(text: string, entities: any[]): string {
    const sorted = [...entities].sort((a, b) => b.offset - a.offset);
    let result = text;
    for (const entity of sorted) {
      result =
        result.slice(0, entity.offset) +
        `[${entity.category.toUpperCase()}]` +
        result.slice(entity.offset + entity.length);
    }
    return result;
  }

  private fallback(text: string): string {
    return text
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL]")
      .replace(/\b\d{10,}\b/g, "[NUMBER]")
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[NAME]")
      .slice(0, 2000);
  }
}

export const piiService = PIIService.getInstance();

