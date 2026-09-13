import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.join(process.cwd(), 'public', 'audio_cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') || 'en';

    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    const textHash = crypto.createHash('sha256').update(`${lang}:${text.trim()}`).digest('hex');
    const cacheFile = path.join(CACHE_DIR, `${textHash}.mp3`);

    // 1. Check if cached audio file exists
    if (fs.existsSync(cacheFile)) {
      const audioBuffer = fs.readFileSync(cacheFile);
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. If OpenAI API Key is present, synthesize with OpenAI TTS
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text.slice(0, 1000), // Max length safety
          voice: 'alloy',
        }),
      });

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(cacheFile, buffer);

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // 3. Fallback: Instruct client to use browser Web Speech API (0 cost, 0 latency)
    return NextResponse.json({
      useWebSpeech: true,
      text,
      lang,
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to synthesize audio', useWebSpeech: true }, { status: 500 });
  }
}
