// PCM Audio Worklet — converts float input to 16-bit PCM and emits chunks.
// Required for xAI Realtime; runs on the audio rendering thread.
// See: https://docs.x.ai/developers/model-capabilities/audio/voice-agent

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioBuffer = [];
    this.totalSamples = 0;
    this.chunkSizeSamples = null;
    this.isMuted = false;

    this.port.onmessage = (event) => {
      if (event.data.type === "config") {
        this.chunkSizeSamples = event.data.chunkSizeSamples;
      } else if (event.data.type === "mute") {
        this.isMuted = event.data.muted;
      }
    };
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) {
      return true;
    }

    // RMS for volume visualization
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    this.port.postMessage({
      type: "volume",
      volume: Math.sqrt(sum / input.length),
    });

    if (this.chunkSizeSamples == null || this.isMuted) {
      return true;
    }

    this.audioBuffer.push(new Float32Array(input));
    this.totalSamples += input.length;

    while (this.totalSamples >= this.chunkSizeSamples) {
      const chunk = new Float32Array(this.chunkSizeSamples);
      let offset = 0;

      while (offset < this.chunkSizeSamples && this.audioBuffer.length > 0) {
        const buffer = this.audioBuffer[0];
        const needed = this.chunkSizeSamples - offset;
        const available = buffer.length;

        if (available <= needed) {
          chunk.set(buffer, offset);
          offset += available;
          this.totalSamples -= available;
          this.audioBuffer.shift();
        } else {
          chunk.set(buffer.subarray(0, needed), offset);
          this.audioBuffer[0] = buffer.subarray(needed);
          offset += needed;
          this.totalSamples -= needed;
        }
      }

      const int16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(int16, [int16.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
