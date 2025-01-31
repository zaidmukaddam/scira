import {
  executeStockChartTool,
  executeCurrencyConverterTool,
  executeWebSearchTool,
  executeXSearchTool,
  executeTMDBSearchTool,
  executeTrendingMoviesTool,
  executeTrendingTVTool,
  executeAcademicSearchTool,
  executeYouTubeSearchTool,
  executeRetrieveTool,
  executeGetWeatherDataTool,
  executeCodeInterpreterTool,
  executeFindPlaceTool,
  executeTextSearchTool,
  executeNearbySearchTool,
  executeTrackFlightTool,
} from './route';

describe('executeStockChartTool', () => {
  it('should execute stock chart tool and return message and chart', async () => {
    const params = { code: 'some code', title: 'some title', icon: 'stock' };
    const result = await executeStockChartTool(params);
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('chart');
  });
});

describe('executeCurrencyConverterTool', () => {
  it('should execute currency converter tool and return rate', async () => {
    const params = { from: 'USD', to: 'EUR' };
    const result = await executeCurrencyConverterTool(params);
    expect(result).toHaveProperty('rate');
  });
});

describe('executeWebSearchTool', () => {
  it('should execute web search tool and return searches', async () => {
    const params = {
      queries: ['query1', 'query2'],
      maxResults: [10, 10],
      topics: ['general', 'news'],
      searchDepth: ['basic', 'advanced'],
    };
    const result = await executeWebSearchTool(params);
    expect(result).toHaveProperty('searches');
  });
});

describe('executeXSearchTool', () => {
  it('should execute X search tool and return results', async () => {
    const params = { query: 'some query' };
    const result = await executeXSearchTool(params);
    expect(result).toBeInstanceOf(Array);
  });
});

describe('executeTMDBSearchTool', () => {
  it('should execute TMDB search tool and return result', async () => {
    const params = { query: 'some query' };
    const result = await executeTMDBSearchTool(params);
    expect(result).toHaveProperty('result');
  });
});

describe('executeTrendingMoviesTool', () => {
  it('should execute trending movies tool and return results', async () => {
    const result = await executeTrendingMoviesTool();
    expect(result).toHaveProperty('results');
  });
});

describe('executeTrendingTVTool', () => {
  it('should execute trending TV tool and return results', async () => {
    const result = await executeTrendingTVTool();
    expect(result).toHaveProperty('results');
  });
});

describe('executeAcademicSearchTool', () => {
  it('should execute academic search tool and return results', async () => {
    const params = { query: 'some query' };
    const result = await executeAcademicSearchTool(params);
    expect(result).toHaveProperty('results');
  });
});

describe('executeYouTubeSearchTool', () => {
  it('should execute YouTube search tool and return results', async () => {
    const params = { query: 'some query', no_of_results: 5 };
    const result = await executeYouTubeSearchTool(params);
    expect(result).toHaveProperty('results');
  });
});

describe('executeRetrieveTool', () => {
  it('should execute retrieve tool and return results', async () => {
    const params = { url: 'https://example.com' };
    const result = await executeRetrieveTool(params);
    expect(result).toHaveProperty('results');
  });
});

describe('executeGetWeatherDataTool', () => {
  it('should execute get weather data tool and return data', async () => {
    const params = { lat: 40.7128, lon: -74.006 };
    const result = await executeGetWeatherDataTool(params);
    expect(result).toHaveProperty('list');
  });
});

describe('executeCodeInterpreterTool', () => {
  it('should execute code interpreter tool and return message and chart', async () => {
    const params = { code: 'some code', title: 'some title', icon: 'default' };
    const result = await executeCodeInterpreterTool(params);
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('chart');
  });
});

describe('executeFindPlaceTool', () => {
  it('should execute find place tool and return features', async () => {
    const params = { query: 'some query', coordinates: [40.7128, -74.006] };
    const result = await executeFindPlaceTool(params);
    expect(result).toHaveProperty('features');
  });
});

describe('executeTextSearchTool', () => {
  it('should execute text search tool and return results', async () => {
    const params = { query: 'some query', location: '40.7128,-74.006', radius: 5000 };
    const result = await executeTextSearchTool(params);
    expect(result).toHaveProperty('results');
  });
});

describe('executeNearbySearchTool', () => {
  it('should execute nearby search tool and return results and center', async () => {
    const params = { location: 'New York', latitude: 40.7128, longitude: -74.006, type: 'restaurant', radius: 5000 };
    const result = await executeNearbySearchTool(params);
    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('center');
  });
});

describe('executeTrackFlightTool', () => {
  it('should execute track flight tool and return data', async () => {
    const params = { flight_number: 'AA100' };
    const result = await executeTrackFlightTool(params);
    expect(result).toHaveProperty('data');
  });
});
