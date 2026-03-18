export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 1 || query.length > 200) {
    return Response.json(
      { suggestions: [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  }

  try {
    const encoded = encodeURIComponent(query);
    const url = `https://duckduckgo.com/ac/?q=${encoded}&type=list`;

    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(1500),
    });

    if (!upstream.ok) {
      return Response.json(
        { suggestions: [] },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        },
      );
    }

    // DuckDuckGo returns [query, [suggestions]]
    const data = await upstream.json();
    const raw: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    const suggestions = raw.slice(0, 5);

    return Response.json(
      { suggestions },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch {
    return Response.json(
      { suggestions: [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  }
}
