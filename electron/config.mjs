import path from 'path';
import { app } from 'electron';
import dotenv from 'dotenv'; // Use a standard, static import
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isPackaged = app.isPackaged;

if (isPackaged) {
  // In production, load from the packaged resources
  const prodPath = path.join(process.resourcesPath, '.env.production');
  dotenv.config({ path: prodPath });
} else {
  // In development, find the root .env file
  const devPath = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: devPath });
}