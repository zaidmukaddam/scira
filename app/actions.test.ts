import { suggestQuestions, generateSpeech, fetchMetadata, getGroupConfig } from './actions';

describe('suggestQuestions', () => {
  it('should generate questions based on message history', async () => {
    const history = [{ role: 'user', content: 'What is the weather like today?' }];
    const result = await suggestQuestions(history);
    expect(result).toHaveProperty('questions');
    expect(result.questions.length).toBe(3);
  });
});

describe('generateSpeech', () => {
  it('should generate speech audio from text', async () => {
    const text = 'Hello, how are you?';
    const result = await generateSpeech(text);
    expect(result).toHaveProperty('audio');
    expect(result.audio).toContain('data:audio/mp3;base64,');
  });
});

describe('fetchMetadata', () => {
  it('should fetch metadata from a URL', async () => {
    const url = 'https://example.com';
    const result = await fetchMetadata(url);
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('description');
  });

  it('should return null if an error occurs', async () => {
    const url = 'https://invalid-url.com';
    const result = await fetchMetadata(url);
    expect(result).toBeNull();
  });
});

describe('getGroupConfig', () => {
  it('should return tools and systemPrompt for a given groupId', async () => {
    const groupId = 'web';
    const result = await getGroupConfig(groupId);
    expect(result).toHaveProperty('tools');
    expect(result).toHaveProperty('systemPrompt');
  });

  it('should return default group config if no groupId is provided', async () => {
    const result = await getGroupConfig();
    expect(result).toHaveProperty('tools');
    expect(result).toHaveProperty('systemPrompt');
  });
});
