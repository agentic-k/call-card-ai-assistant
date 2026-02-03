// Set up for macOS speech recognition
let isTranscribing = false;
let transcriptionInterval = null;

// Simple simulation of transcription for macOS
// In a real-world app, you'd use native macOS APIs through a node module
const simulateMacOSTranscription = (sender) => {
  // Simulate transcription by sending updates periodically
  // This is just for demonstration - in a real app you'd use actual speech recognition
  const sampleTexts = [
    "Hello, this is a test of macOS speech recognition.",
    "The quick brown fox jumps over the lazy dog.",
    "Welcome to the electron desktop application.",
    "Speech recognition on macOS works differently than in web browsers.",
    "In a real app, you would integrate with native macOS APIs."
  ];
  
  let index = 0;
  
  return setInterval(() => {
    if (sender && !sender.isDestroyed()) {
      sender.send('transcript-update', sampleTexts[index % sampleTexts.length]);
      index++;
    }
  }, 5000); // Send a new transcription every 5 seconds
};

const startTranscription = (sender) => {
  isTranscribing = true;
  if (transcriptionInterval) {
    clearInterval(transcriptionInterval);
  }
  transcriptionInterval = simulateMacOSTranscription(sender);
  return true;
};

const stopTranscription = () => {
  isTranscribing = false;
  if (transcriptionInterval) {
    clearInterval(transcriptionInterval);
    transcriptionInterval = null;
  }
  return true;
};

const isTranscriptionActive = () => {
  return isTranscribing;
};

export default {
  startTranscription,
  stopTranscription,
  isTranscriptionActive
}; 