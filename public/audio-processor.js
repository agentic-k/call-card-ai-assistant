class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Reduced buffer size for lower latency: ~100ms instead of 200ms 
    // 16000Hz * 0.1s = 1600 samples
    // The worklet process is called with 128 samples.
    // 1600 / 128 = 12.5 (rounded to 12 chunks)
    this.bufferSize = 128 * 12; // 1536 samples (96ms at 16kHz)
    this._buffer = new Float32Array(this.bufferSize);
    this._bufferIndex = 0;
    this._priority = 'normal';
    
    // Listen for commands from the main thread
    this.port.onmessage = (event) => {
      if (event.data.command === 'setPriority') {
        this._priority = event.data.priority;
      }
    };
  }

  process(inputs) {
    const input = inputs[0][0]; // Float32Array

    if (input) {
      // Append data to our buffer
      this._buffer.set(input, this._bufferIndex);
      this._bufferIndex += input.length;

      // When buffer is full, convert to Int16, post, and reset
      if (this._bufferIndex >= this.bufferSize) {
        // Convert the Float32 buffer to an Int16 buffer
        const int16Array = new Int16Array(this._buffer.length);
        for (let i = 0; i < this._buffer.length; i++) {
          const s = Math.max(-1, Math.min(1, this._buffer[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Post the Int16 buffer back to the main thread, transferring ownership
        this.port.postMessage(int16Array.buffer, [int16Array.buffer]);

        // Reset the buffer index
        this._bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 