import { describe, it, expect } from 'vitest';
import {
  PROVIDERS,
  models,
  getModelConfig,
  getModelProvider,
  getModelProviderInfo,
  getActiveProviders,
  getModelsByProvider,
  type ModelProvider,
} from '../models';

describe('LiteLLM provider registration', () => {
  it('should include litellm in ModelProvider type via PROVIDERS record', () => {
    expect(PROVIDERS).toHaveProperty('litellm');
  });

  it('should have correct provider metadata', () => {
    const provider = PROVIDERS['litellm'];
    expect(provider.id).toBe('litellm');
    expect(provider.name).toBe('LiteLLM');
    expect(provider.icon).toBe('litellm');
    expect(provider.hasNew).toBe(true);
  });
});

describe('LiteLLM model entry', () => {
  it('should have scira-litellm in the models array', () => {
    const litellmModel = models.find((m) => m.value === 'scira-litellm');
    expect(litellmModel).toBeDefined();
  });

  it('should have correct model metadata', () => {
    const litellmModel = getModelConfig('scira-litellm');
    expect(litellmModel).toBeDefined();
    expect(litellmModel!.label).toBe('LiteLLM');
    expect(litellmModel!.provider).toBe('litellm');
    expect(litellmModel!.experimental).toBe(true);
    expect(litellmModel!.requiresAuth).toBe(true);
    expect(litellmModel!.maxOutputTokens).toBeGreaterThan(0);
  });

  it('should have a description mentioning AI gateway', () => {
    const litellmModel = getModelConfig('scira-litellm');
    expect(litellmModel!.description.toLowerCase()).toContain('gateway');
  });
});

describe('getModelProvider for LiteLLM', () => {
  it('should return litellm for scira-litellm model value', () => {
    expect(getModelProvider('scira-litellm')).toBe('litellm');
  });

  it('should return litellm for any value containing litellm', () => {
    expect(getModelProvider('scira-litellm-custom')).toBe('litellm');
  });

  it('should not return litellm for unrelated model values', () => {
    expect(getModelProvider('scira-gpt-5.4')).not.toBe('litellm');
    expect(getModelProvider('scira-anthropic')).not.toBe('litellm');
  });
});

describe('getModelProviderInfo for LiteLLM', () => {
  it('should return LiteLLM provider info for scira-litellm', () => {
    const info = getModelProviderInfo('scira-litellm');
    expect(info.id).toBe('litellm');
    expect(info.name).toBe('LiteLLM');
  });
});

describe('getActiveProviders includes LiteLLM', () => {
  it('should include litellm in active providers', () => {
    const active = getActiveProviders();
    const litellm = active.find((p) => p.id === 'litellm');
    expect(litellm).toBeDefined();
  });
});

describe('getModelsByProvider for LiteLLM', () => {
  it('should return at least one model for litellm provider', () => {
    const litellmModels = getModelsByProvider('litellm');
    expect(litellmModels.length).toBeGreaterThanOrEqual(1);
    expect(litellmModels[0].value).toBe('scira-litellm');
  });
});
