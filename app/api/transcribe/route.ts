import { NextRequest, NextResponse } from 'next/server';

import { elevenlabs } from '@ai-sdk/elevenlabs';
import { groq } from '@ai-sdk/groq';
import { experimental_transcribe as transcribe } from 'ai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: 'No audio file found in form data.' }, { status: 400 });
    }

    const result = await transcribe({
      model: elevenlabs.transcription('scribe_v1'),
      audio: await audio.arrayBuffer(),
    });

    console.log(result);

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error('Error processing transcription request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
