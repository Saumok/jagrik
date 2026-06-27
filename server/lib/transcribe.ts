import { env, flags } from "../env.js";

// Best-in-class speech-to-text via ElevenLabs Scribe. Used for the voice path
// (multilingual: Bengali/Hindi/English). Falls back to Gemini's own audio
// transcription if this is off or fails.
export async function transcribeAudio(buf: Buffer, mime: string): Promise<string | undefined> {
  if (!flags.elevenLabsEnabled) return undefined;
  try {
    const fd = new FormData();
    fd.set("model_id", "scribe_v1");
    fd.set("file", new Blob([new Uint8Array(buf)], { type: mime || "audio/webm" }), "audio.webm");
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": env.elevenLabsApiKey },
      body: fd,
    });
    if (!res.ok) {
      console.error("[11labs] http", res.status, (await res.text()).slice(0, 160));
      return undefined;
    }
    const j = (await res.json()) as { text?: string };
    return j.text?.trim() || undefined;
  } catch (err) {
    console.error("[11labs] transcribe failed:", (err as Error).message);
    return undefined;
  }
}
