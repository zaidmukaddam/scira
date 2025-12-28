// Audio Worklet Processor for capturing microphone input
// This runs in the AudioWorkletGlobalScope (audio rendering thread)

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioBuffer = [];
    this.totalSamples = 0;
    this.chunkSizeSamples = null;
    this.sampleRate = null;
    this.isMuted = false;

    // Listen for messages from the main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'config') {
        this.chunkSizeSamples = event.data.chunkSizeSamples;
        this.sampleRate = event.data.sampleRate;
      } else if (event.data.type === 'mute') {
        this.isMuted = event.data.muted;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const inputData = input[0];
    if (!inputData || inputData.length === 0) {
      return true;
    }

    // Compute input RMS for volume visualization
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);

    // Send volume to main thread
    this.port.postMessage({
      type: 'volume',
      volume: rms,
    });

    // Write silence to all output channels to keep the audio graph active
    const output = outputs[0];
    if (output) {
      for (let channel = 0; channel < output.length; channel++) {
        output[channel].fill(0);
      }
    }

    // If not configured yet, just return
    if (this.chunkSizeSamples === null || this.sampleRate === null) {
      return true;
    }

    // Buffer audio samples
    this.audioBuffer.push(new Float32Array(inputData));
    this.totalSamples += inputData.length;

    // Emit fixed-size chunks
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

      // Send chunk to main thread if not muted
      if (!this.isMuted) {
        // Transfer the ArrayBuffer for efficient zero-copy transfer
        const chunkCopy = new Float32Array(chunk);
        this.port.postMessage({
          type: 'chunk',
          chunk: chunkCopy.buffer,
        }, [chunkCopy.buffer]);
      }
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);

