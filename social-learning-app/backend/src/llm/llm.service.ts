import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export interface PaperSummaryResult {
  tldr: string;
  paradigms: Record<string, number>; // 0-5 scale per paradigm
  meritScore: number; // 0-100
  rationale?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private gemini: GoogleGenerativeAI | null = null;
  private openai: OpenAI | null = null;
  private promptId: string | null = null;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('GOOGLE_GENAI_API_KEY')
      || this.config.get<string>('GEMINI_API_KEY')
      || this.config.get<string>('GOOGLE_API_KEY');
    if (key) {
      this.gemini = new GoogleGenerativeAI(key);
    }
    const openaiKey = this.config.get<string>('OPENAI_API_KEY') || this.config.get<string>('OPEN_AI_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
    this.promptId = this.config.get<string>('OPENAI_PROMPT_ID') || null;
  }

  async summarizePaper(input: {
    title: string;
    abstract?: string;
    url?: string;
  }): Promise<PaperSummaryResult | null> {
    const prompt = [
      `Summarize the research paper below and classify it by paradigms.`,
      `Return strict JSON: {"tldr": string, "paradigms": {"training": 0-5, "agent_creation": 0-5, "safeguards": 0-5, "token_counting": 0-5, "prompting": 0-5}, "meritScore": 0-100, "rationale": string}.`,
      `Rules:`,
      `- TLDR: 2-3 sentences, 80-120 words, factual, no hype.`,
      `- Paradigms: integers 0-5 indicating relevance under each paradigm.`,
      `- MeritScore: judge novelty, rigor, and practical impact (0-100).`,
      `Paper:`,
      `Title: ${input.title}`,
      input.abstract ? `Abstract: ${input.abstract}` : '',
      input.url ? `URL: ${input.url}` : '',
    ].filter(Boolean).join('\n');
    const provider = this.chooseProvider();
    // Try primary, then fallback
    const order = provider === 'gemini' ? ['gemini','openai'] : ['openai','gemini'];
    for (const p of order) {
      try {
        const out = p === 'gemini' ? await this.geminiSummarize(prompt) : await this.openaiSummarize(prompt, input);
        if (out) return this.normalize(out);
      } catch (e) {
        this.logger.warn(`${p} summarization failed`, e as any);
      }
    }
    return null;
  }

  private chooseProvider(): 'gemini' | 'openai' {
    const mode = (this.config.get<string>('LLM_PROVIDER') || 'auto').toLowerCase();
    const split = Math.max(0, Math.min(1, Number(this.config.get<string>('LLM_OPENAI_SPLIT') || '0')));
    const hasGemini = !!this.gemini;
    const hasOpenAI = !!this.openai;
    if (mode === 'gemini') return hasGemini ? 'gemini' : 'openai';
    if (mode === 'openai') return hasOpenAI ? 'openai' : 'gemini';
    // auto: probabilistic split if both available
    if (hasGemini && hasOpenAI) {
      return Math.random() < split ? 'openai' : 'gemini';
    }
    return hasGemini ? 'gemini' : 'openai';
  }

  private async geminiSummarize(prompt: string): Promise<PaperSummaryResult | null> {
    if (!this.gemini) return null;
    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    if (!text) return null;
    return this.tryParseJson(text);
  }

  private async openaiSummarize(prompt: string, input: { title: string; abstract?: string; url?: string; }): Promise<PaperSummaryResult | null> {
    if (!this.openai) return null;
    const model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    const pid = this.promptId;
    // Prefer Responses API with prompt id when available; fallback to chat.completions
    try {
      if (pid && this.openai.responses?.create) {
        // @ts-ignore - responses API exists in openai v4
        const res = await this.openai.responses.create({
          model,
          prompt: { id: pid },
          input: { title: input.title, abstract: input.abstract || '', url: input.url || '', instructions: prompt },
        } as any);
        const text = (res as any).output_text || (res as any).response?.output_text || (res as any).content?.[0]?.text || '';
        if (text) return this.tryParseJson(text);
      }
    } catch (e) {
      this.logger.debug('OpenAI Responses API path failed, falling back to chat.completions');
    }
    // Fallback: chat completions with explicit system+user
    const chat = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an expert research summarizer. Return ONLY strict JSON per instructions.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });
    const text = chat.choices?.[0]?.message?.content || '';
    if (!text) return null;
    return this.tryParseJson(text);
  }

  private tryParseJson(text: string): PaperSummaryResult | null {
    let parsed: PaperSummaryResult | null = null;
    try { parsed = JSON.parse(text) as PaperSummaryResult; } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]) as PaperSummaryResult; } catch {}
      }
    }
    return parsed;
  }

  private normalize(parsed: PaperSummaryResult): PaperSummaryResult {
    const out = { ...parsed } as PaperSummaryResult;
    out.meritScore = Math.max(0, Math.min(100, Math.round(out.meritScore || 0)));
    const norms: Record<string, number> = {};
    const keys = ['training','agent_creation','safeguards','token_counting','prompting'];
    for (const k of keys) {
      const v = (out.paradigms?.[k] ?? 0) as number;
      norms[k] = Math.max(0, Math.min(5, Math.round(v)));
    }
    out.paradigms = norms;
    return out;
  }
}
