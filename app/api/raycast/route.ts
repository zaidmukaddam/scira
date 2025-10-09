export async function GET() {
  return new Response(JSON.stringify({ disabled: true }), {
    status: 501,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST() {
  return new Response(JSON.stringify({ disabled: true }), {
    status: 501,
    headers: { 'content-type': 'application/json' },
  });
}
