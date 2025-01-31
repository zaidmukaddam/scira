import { fetchGoogleTrends, fetchRedditQuestions, fetchFromMultipleSources, GET } from './route';
import { NextResponse } from 'next/server';

describe('fetchGoogleTrends', () => {
  it('should fetch Google Trends and return an array of TrendingQuery', async () => {
    const trends = await fetchGoogleTrends();
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]).toHaveProperty('icon');
    expect(trends[0]).toHaveProperty('text');
    expect(trends[0]).toHaveProperty('category');
  });
});

describe('fetchRedditQuestions', () => {
  it('should fetch Reddit questions and return an array of TrendingQuery', async () => {
    const questions = await fetchRedditQuestions();
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toHaveProperty('icon');
    expect(questions[0]).toHaveProperty('text');
    expect(questions[0]).toHaveProperty('category');
  });
});

describe('fetchFromMultipleSources', () => {
  it('should fetch trends from multiple sources and return a shuffled array of TrendingQuery', async () => {
    const trends = await fetchFromMultipleSources();
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]).toHaveProperty('icon');
    expect(trends[0]).toHaveProperty('text');
    expect(trends[0]).toHaveProperty('category');
  });
});

describe('GET', () => {
  it('should return a JSON response with trends', async () => {
    const req = new Request('http://localhost/api/trending');
    const res = await GET(req);
    const json = await res.json();
    expect(res).toBeInstanceOf(NextResponse);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty('icon');
    expect(json[0]).toHaveProperty('text');
    expect(json[0]).toHaveProperty('category');
  });
});
