import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "No audio file found in form data." }, { status: 400 });
    }

    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const transcription = await client.speechToText.convert({
      model_id: "scribe_v1",
      file: audio
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Error processing transcription request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 