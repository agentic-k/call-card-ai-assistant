class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.sampleRate = options.processorOptions.sampleRate;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputData = input[0];
      const int16Array = new Int16Array(inputData.length);
      
      // Convert Float32 to Int16
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Send the processed audio data to the main thread
      this.port.postMessage(int16Array.buffer, [int16Array.buffer]);
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 