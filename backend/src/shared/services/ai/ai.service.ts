import { z } from "zod";
import {
  azureClient4o_mini,
  azureClient41,
  GPT_4O_MINI_MODEL,
  GPT_41_MODEL,
} from "../../config/llm";
import { logger } from "../../utils/logger";
import { RAGService } from "./rag.service";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth for structured LLM output shapes
// ---------------------------------------------------------------------------

export const ThreadSummarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.string()),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  priority: z.enum(["low", "medium", "high"]),
});
export type ParsedThreadSummary = z.infer<typeof ThreadSummarySchema>;

export const ReplySuggestionItemSchema = z.object({
  tone: z.string(),
  subject: z.string(),
  body: z.string(),
});
export const ReplySuggestionsSchema = z.object({
  suggestions: z.array(ReplySuggestionItemSchema).min(1),
});
export type ParsedReplySuggestions = z.infer<typeof ReplySuggestionsSchema>;

// ---------------------------------------------------------------------------
// Summary service (stateless LLM call, no agent needed)
// ---------------------------------------------------------------------------

interface SummaryInput {
  emailsText: string;
  previousSummary?: string;
}

export class AISummaryService {
  constructor(private ragService?: RAGService) {}

  async summarizeThread(input: SummaryInput): Promise<ParsedThreadSummary> {
    const { emailsText, previousSummary } = input;

    const systemPrompt = `You're an assistant that summarizes email threads.
Provide a comprehensive summary in pure JSON format (no markdown, no code blocks) with these fields:
- summary: A concise overview of the thread [keep it complete, short and correct]
- keyPoints: Array of main discussion points
- actionItems: Array of tasks or follow-ups needed [include coupon codes given or any important info]
- sentiment: "positive", "neutral", or "negative"
- priority: "low", "medium", or "high"

DON'T MISS OUT ON ANY IMPORTANT INFORMATION.

Return ONLY the JSON object, nothing else.`;

    const userPrompt = previousSummary
      ? `Previous Summary:
${previousSummary}

New Emails:
${emailsText}

Update the summary. For action items, distinguish between resolved, ongoing, and new ones.`
      : `Emails:\n${emailsText}\n\nSummarize this email thread.`;

    const response = await azureClient4o_mini.chat.completions.create({
      model: GPT_4O_MINI_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = ThreadSummarySchema.parse(JSON.parse(content));
    logger.info("Summary generated and validated successfully");
    return parsed;
  }
}

// ---------------------------------------------------------------------------
// Reply service — direct RAG fetch + stateless LLM + Zod validation
// No agent involved: eliminates non-deterministic tool-call behaviour
// ---------------------------------------------------------------------------

interface ReplyInput {
  emailsText: string;
  subject: string;
  lastEmailFrom: string;
  lastEmailTo: string;
  userEmailAddress: string;
  userId: string;
  threadId: string;
}

export class AIReplyService {
  constructor(private ragService: RAGService) {}

  async suggestReplies(input: ReplyInput): Promise<ParsedReplySuggestions> {
    const {
      emailsText,
      subject,
      lastEmailFrom,
      lastEmailTo,
      userEmailAddress,
      userId,
      threadId,
    } = input;

    // 1. Fetch RAG context directly — same data the unified tool would provide
    let ragContext = "";
    try {
      const { context } = await this.ragService.getUnifiedContext(
        subject,
        userId,
        threadId,
      );
      ragContext = context;
    } catch (ragError) {
      logger.warn("RAG context fetch failed, proceeding without context:", {
        error: (ragError as Error).message,
      });
    }

    // 2. Build prompt
    const systemPrompt = `You are an expert email reply assistant for BetterMail.
You are composing replies ON BEHALF OF: ${userEmailAddress}
Using the provided thread emails and relevant context, generate exactly 3 reply suggestions in different tones.
Output ONLY a pure JSON object (no markdown, no code blocks):
{
  "suggestions": [
    { "tone": "formal",   "subject": "Re: <subject>", "body": "<reply body>" },
    { "tone": "friendly", "subject": "Re: <subject>", "body": "<reply body>" },
    { "tone": "brief",    "subject": "Re: <subject>", "body": "<reply body>" }
  ]
}
Rules:
- You are replying as ${userEmailAddress} — never impersonate or address yourself.
- Address the LAST email in the thread specifically (from: ${lastEmailFrom}, to: ${lastEmailTo}).
- Keep replies relevant and contextually accurate.
- Copy user's writing style `;

    const userPrompt = `Subject: ${subject}
Replying as: ${userEmailAddress}
Last email from: ${lastEmailFrom} → to: ${lastEmailTo}

--- RELEVANT CONTEXT ---
${ragContext || "No additional context available."}

--- THREAD ---
${emailsText}`;

    // 3. Stateless LLM call with forced JSON output
    const response = await azureClient4o_mini.chat.completions.create({
      model: GPT_4O_MINI_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";

    // 4. Parse + Zod validate — throws ZodError if shape is wrong
    const validated = ReplySuggestionsSchema.parse(JSON.parse(content));
    logger.info("Reply suggestions generated and validated successfully");
    return validated;
  }
}

// ---------------------------------------------------------------------------
// Email composer / rewriter — pure stateless LLM, no agent, no RAG
// ---------------------------------------------------------------------------

export const SUGGEST_EMAIL_TONES = [
  "formal",
  "friendly",
  "concise",
  "professional",
  "empathetic",
] as const;
export type SuggestEmailTone = (typeof SUGGEST_EMAIL_TONES)[number];

export const SuggestEmailOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type SuggestEmailOutput = z.infer<typeof SuggestEmailOutputSchema>;

interface SuggestEmailInput {
  mode: "compose" | "rewrite" | "refine";
  /** compose mode: what the email should be about */
  topic?: string;
  /** rewrite / refine mode: the existing draft HTML to improve */
  draft?: string;
  /** refine mode: specific instruction to apply to the draft */
  refineInstruction?: string;
  tone?: SuggestEmailTone;
  /** optional hints for richer output */
  recipientName?: string;
  subjectHint?: string;
}

const HTML_BODY_RULES = `
- Return the body as semantic HTML using only: <p>, <strong>, <em>, <u>, <h2>, <h3>, <ul>, <li>, <ol>, <blockquote>
- Use <p> for paragraphs — every line of text must be wrapped in a tag
- Use <strong> for key terms or emphasis
- Use <ul><li> for bullet lists, <ol><li> for numbered lists
- Do NOT use <html>, <head>, <body>, <div>, <span>, <br>, <style>, inline styles, or markdown
- Do NOT include a greeting or sign-off as plain strings outside tags — wrap them in <p> tags`;

export class AISuggestEmailService {
  async suggestEmail(input: SuggestEmailInput): Promise<SuggestEmailOutput> {
    const {
      mode,
      topic,
      draft,
      refineInstruction,
      tone = "professional",
      recipientName,
      subjectHint,
    } = input;

    const toneInstruction = `Tone: ${tone}.`;
    const recipientLine = recipientName ? `Recipient: ${recipientName}.` : "";
    const subjectLine = subjectHint ? `Subject hint: ${subjectHint}.` : "";

    const systemPrompt = `You are an expert email writing assistant for BetterMail.
Output ONLY a pure JSON object (no markdown, no code blocks):
{ "subject": "<email subject>", "body": "<full email HTML body>" }
Rules:
- ${toneInstruction}
- ${recipientLine}
- ${subjectLine}
- Body must be a complete, ready-to-send email (proper greeting, content, sign-off).
- Do NOT include any text outside the JSON object.
${HTML_BODY_RULES}`;

    let userPrompt: string;
    if (mode === "compose") {
      userPrompt = `Compose a new email about the following topic:\n${topic}`;
    } else if (mode === "rewrite") {
      userPrompt = `Rewrite the following email draft to be more ${tone}. Preserve the intent but improve clarity, structure, and ${tone === "concise" ? "brevity" : "tone"}.\nReturn the improved version as semantic HTML body.\n\nDraft:\n${draft}`;
    } else {
      // refine
      userPrompt = `Apply the following instruction to the email draft below. Preserve everything not affected by the instruction. Return the updated email as semantic HTML body.\n\nInstruction: ${refineInstruction}\n\nCurrent draft (HTML):\n${draft}`;
    }

    const response = await azureClient41.chat.completions.create({
      model: GPT_41_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const validated = SuggestEmailOutputSchema.parse(JSON.parse(content));
    logger.info(`Email ${mode} generated and validated successfully`);
    return validated;
  }
}
