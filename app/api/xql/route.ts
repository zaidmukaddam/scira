export type XQLMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<
    | { type: 'text'; text: string }
    | {
        type: 'tool-xql';
        state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
        input?: any;
        output?: string[];
        errorText?: string;
      }
  >;
};

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
