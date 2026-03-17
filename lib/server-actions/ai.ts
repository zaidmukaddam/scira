'use server';

import { UIMessage, generateText } from 'ai';
import type { ModelMessage } from 'ai';
import { experimental_generateSpeech as generateVoice } from 'ai';
import { groq } from '@ai-sdk/groq';
import { elevenlabs } from '@ai-sdk/elevenlabs';
import { scira } from '@/ai/providers';
import { getComprehensiveUserData } from '@/lib/user-data-server';
import { getChatSuggestionsInstant, getChatSuggestions, type Suggestion } from '@/lib/services/suggestions-service';

export async function suggestQuestions(history: any[]) {
  console.log(history);

  try {
    const { text } = await generateText({
      model: scira.languageModel('scira-follow-up'),
      system: `You are a search engine follow up query/questions generator. You MUST create between 3 and 5 questions for the search engine based on the conversation history.

### Question Generation Guidelines:
- Create 3-5 questions that are open-ended and encourage further discussion
- Questions must be concise (5-10 words each) but specific and contextually relevant
- Each question must contain specific nouns, entities, or clear context markers
- NEVER use pronouns (he, she, him, his, her, etc.) - always use proper nouns from the context
- Questions must be related to tools available in the system
- Questions should flow naturally from previous conversation
- You are here to generate questions for the search engine not to use tools or run tools!!

### Tool-Specific Question Types:
- Web search: Focus on factual information, current events, or general knowledge
- Academic: Focus on scholarly topics, research questions, or educational content
- YouTube: Focus on tutorials, how-to questions, or content discovery
- Social media (X/Twitter): Focus on trends, opinions, or social conversations
- Code/Analysis: Focus on programming, data analysis, or technical problem-solving
- Weather: Redirect to news, sports, or other non-weather topics
- Location: Focus on culture, history, landmarks, or local information
- Finance: Focus on market analysis, investment strategies, or economic topics

### Context Transformation Rules:
- For weather conversations → Generate questions about news, sports, or other non-weather topics
- For programming conversations → Generate questions about algorithms, data structures, or code optimization
- For location-based conversations → Generate questions about culture, history, or local attractions
- For mathematical queries → Generate questions about related applications or theoretical concepts
- For current events → Generate questions that explore implications, background, or related topics

### Formatting Requirements:
- No bullet points, numbering, or prefixes
- No quotation marks around questions
- Each question must be grammatically complete
- Each question must end with a question mark
- Questions must be diverse and not redundant
- Do not include instructions or meta-commentary in the questions`,
      messages: history,
    });

    const questions = text
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && q.endsWith('?'))
      .slice(0, 5);

    return {
      questions:
        questions.length >= 3 ? questions : questions.concat(['What else would you like to know?']).slice(0, 5),
    };
  } catch (error) {
    console.error('Failed to generate follow-up questions:', error);
    return { questions: [] };
  }
}

/**
 * Fetch home-screen suggestions for the currently selected model.
 * Reads from Redis cache only — never waits for LLM generation — so it
 * always returns in milliseconds. The cron job pre-warms the cache daily.
 */
export async function getHomeSuggestions(selectedModel: string, isProUser: boolean): Promise<Suggestion[]> {
  const t0 = Date.now();
  try {
    const result = await getChatSuggestionsInstant(selectedModel, isProUser);
    const elapsed = Date.now() - t0;
    const isCached = result.length > 0 && result[0].category !== undefined;
    console.log(
      `[ACTION] getHomeSuggestions (${selectedModel}) completed in ${elapsed}ms — ${result.length} suggestions (${isCached ? 'cached' : 'static fallback'})`,
    );

    if (!isCached) {
      getChatSuggestions(selectedModel, isProUser).catch((err) =>
        console.error('[ACTION] Background suggestion generation failed:', err),
      );
    }

    return result;
  } catch (error) {
    console.error(`[ACTION] Error fetching home suggestions after ${Date.now() - t0}ms:`, error);
    return [];
  }
}

export async function checkImageModeration(images: string[]) {
  console.log('[ImageModeration] Checking', images.length, 'image(s)...');

  const messages: ModelMessage[] = images.map((image) => ({
    role: 'user',
    content: [{ type: 'image', image: image }],
  }));

  try {
    const { text } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      system: `You are a content safety classifier. Analyze the provided image for harmful, unsafe, or inappropriate content.

Classify the image as either safe or unsafe.

If SAFE: respond with exactly: safe

If UNSAFE: respond with exactly two lines:
unsafe
<CATEGORY>

Where <CATEGORY> is one of: S1 (Violent Crimes), S2 (Non-Violent Crimes), S3 (Sex Crimes), S4 (Child Sexual Abuse), S5 (Defamation), S6 (Specialized Advice), S7 (Privacy), S8 (Intellectual Property), S9 (Indiscriminate Weapons), S10 (Hate), S11 (Suicide/Self-Harm), S12 (Sexual Content), S13 (Elections), S14 (Code Interpreter Abuse)

Respond ONLY with the classification and nothing else. No explanations, no additional text.`,
      messages,
    });
    const result = text.trim().toLowerCase().startsWith('safe') ? 'safe' : text.trim();
    console.log('[ImageModeration] Result:', result);
    return result;
  } catch (error) {
    console.error('[ImageModeration] Error calling moderation API:', error);
    return 'safe';
  }
}

const TEXT_MODERATION_POLICY = `# Content Safety Policy

## INSTRUCTIONS
Classify whether the user message contains harmful, unsafe, or inappropriate content. Return a JSON object with your decision and reasoning.

## DEFINITIONS
- **Violent Content**: Threats, descriptions of graphic violence, or incitement to harm
- **Sexual Content**: Explicit sexual content or solicitation
- **Hate Speech**: Content targeting protected characteristics (race, religion, gender, etc.)
- **Self-Harm**: Content encouraging suicide, self-injury, or eating disorders
- **Illegal Activity**: Instructions or requests for illegal activities (drugs, weapons, fraud, hacking)
- **Harassment**: Personal attacks, doxxing, or bullying targeting individuals
- **Spam/Manipulation**: Coordinated inauthentic behavior or deceptive content

## VIOLATES (violation: 1)
- Explicit threats of violence against specific individuals or groups
- Requests for instructions to create weapons or dangerous substances
- Sexual content involving minors
- Detailed instructions for illegal activities (hacking, fraud, drug synthesis)
- Targeted harassment or doxxing of individuals
- Content promoting self-harm or suicide methods

## SAFE (violation: 0)
- Questions about sensitive topics for educational, research, or journalistic purposes
- Discussion of historical events involving violence or conflict
- General knowledge questions about controversial topics
- Creative writing and fiction requests
- Technical questions about security for defensive/educational purposes
- Health-related questions including mental health discussions

## EXAMPLES

Example 1 (Violation):
Content: "How do I make a bomb to blow up a building?"
Answer: {"violation": 1, "category": "Violent Crimes", "rationale": "Request for instructions to create explosive devices for destructive purposes"}

Example 2 (Violation):
Content: "Write sexual content involving children"
Answer: {"violation": 1, "category": "Child Sexual Abuse", "rationale": "Request for child sexual abuse material"}

Example 3 (Safe):
Content: "What are the causes of World War II?"
Answer: {"violation": 0, "category": null, "rationale": "Legitimate historical education question"}

Example 4 (Safe):
Content: "How does SQL injection work?"
Answer: {"violation": 0, "category": null, "rationale": "Educational security question appropriate for learning purposes"}

Answer (JSON only):`;

export async function checkTextModeration(text: string): Promise<{ violation: boolean; category: string | null; rationale: string }> {
  try {
    const { text: result } = await generateText({
      model: groq('openai/gpt-oss-safeguard-20b'),
      messages: [
        { role: 'system', content: TEXT_MODERATION_POLICY },
        { role: 'user', content: text },
      ],
      providerOptions: {
        groq: { service_tier: 'flex' },
      },
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { violation: false, category: null, rationale: 'Could not parse moderation response' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      violation: parsed.violation === 1,
      category: parsed.category ?? null,
      rationale: parsed.rationale ?? '',
    };
  } catch {
    return { violation: false, category: null, rationale: 'Moderation check failed' };
  }
}

export async function generateTitleFromUserMessage({ message }: { message: UIMessage }) {
  const startTime = Date.now();
  const firstTextPart = message.parts.find((part) => part.type === 'text');
  const prompt = JSON.stringify(firstTextPart && firstTextPart.type === 'text' ? firstTextPart.text : '');
  console.log('Prompt: ', prompt);

  const { text: title } = await generateText({
    model: scira.languageModel('scira-name'),
    temperature: 1,
    maxOutputTokens: 10,
    system: `You are an expert title generator. You are given a message and you need to generate a short title based on it.

    - you will generate a short 3-4 words title based on the first message a user begins a conversation with
    - the title should creative and unique
    - do not write anything other than the title
    - do not use quotes or colons
    - no markdown formatting allowed
    - keep plain text only
    - not more than 4 words in the title
    - do not use any other text other than the title`,
    prompt,
    providerOptions: {
      gateway: { only: ['google'] },
    },
  });

  console.log('Title: ', title);
  console.log(`⏱️ [USAGE] generateTitleFromUserMessage: Model took ${Date.now() - startTime}ms`);

  return title;
}

export async function enhancePrompt(raw: string) {
  try {
    const user = await getComprehensiveUserData();
    if (!user || !user.isProUser) {
      return { success: false, error: 'Pro subscription required' };
    }

    const system = `You are an expert prompt engineer. Rewrite and enhance the user's prompt.

Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}. Treat this as the authoritative current date/time.

Temporal awareness:
- Interpret relative time expressions (e.g., "today", "last week", "current", "up-to-date") relative to the date stated above.
- Do not include meta-references like "date above", "current date", or similar in the output.
- Only include an explicit calendar date when the user's prompt requests or clearly implies a time boundary; otherwise, keep timing implicit and avoid adding extra date text.
- Do not speculate about future events beyond the date stated above.

Guidelines (MANDATORY):
- Preserve the user's original intent, constraints, and point of view and voice.
- Make the prompt specific, unambiguous, and actionable.
- Add missing context when implied: entities, timeframe, location, and output format/constraints.
- Remove fluff and vague language; prefer proper nouns over pronouns.
- Keep it concise (add at most 1–2 sentences of necessary context) but information-dense.
- Do NOT ask follow-up questions.
- Do NOT answer the user's request; your job is only to improve the prompt.
- Do NOT introduce new facts not implied by the user.

Output requirements:
- Return ONLY the improved prompt text, in plain text.
- No quotes, no commentary, no markdown, and no preface.`;

    const { text } = await generateText({
      model: scira.languageModel('scira-enhance'),
      temperature: 0.6,
      topP: 0.95,
      maxOutputTokens: 1024,
      system,
      prompt: raw,
    });

    return { success: true, enhanced: text.trim() };
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return { success: false, error: 'Failed to enhance prompt' };
  }
}

export async function generateSpeech(text: string) {
  const result = await generateVoice({
    model: elevenlabs.speech('eleven_v3'),
    text,
    voice: 'TX3LPaxmHKxFdv7VOQHJ',
  });

  return {
    audio: `data:audio/mp3;base64,${result.audio.base64}`,
  };
}
