import { desktopCapturer, shell, app } from 'electron';
import fs from 'fs';
import path from 'path';

// Function to get audio sources (microphone only)
export const getAudioSources = async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['audio'],
      fetchWindowIcons: true
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      type: 'microphone'
    }));
  } catch (error) {
    console.error('Error getting audio sources:', error);
    return [];
  }
};

// Function to save audio file
export const saveAudioFile = async (base64Data) => {
  try {
    // console.debug('Saving audio file...');
    
    const recordingsDir = path.join(app.getPath('downloads'), 'call-card-recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
    
    const fileName = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    const filePath = path.join(recordingsDir, fileName);
    
    let buffer;
    if (base64Data.includes('base64,')) {
      buffer = Buffer.from(base64Data.split('base64,')[1], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    fs.writeFileSync(filePath, buffer);
    // console.debug('Audio file saved successfully at:', filePath);
    
    return filePath;
  } catch (error) {
    console.error('Error saving audio file:', error);
    throw error;
  }
};

// Function to open audio file
export const openAudioFile = (filePath) => {
  try {
    shell.openPath(filePath);
    return true;
  } catch (error) {
    console.error('Error opening audio file:', error);
    return false;
  }
};
