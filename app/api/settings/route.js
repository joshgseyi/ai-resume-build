import { promises as fs } from 'fs';
import path from 'path';

const settingsDir = path.join(process.cwd(), 'data');
const settingsFile = path.join(settingsDir, 'settings.json');

// Ensure settings directory exists
async function ensureSettingsDir() {
  try {
    await fs.access(settingsDir);
  } catch {
    await fs.mkdir(settingsDir, { recursive: true });
  }
}

// Read settings from file
async function readSettings() {
  try {
    await ensureSettingsDir();
    const data = await fs.readFile(settingsFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Write settings to file
async function writeSettings(settings) {
  await ensureSettingsDir();
  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
}

// GET - Retrieve settings
export async function GET() {
  try {
    const settings = await readSettings();
    return Response.json({ settings });
  } catch (error) {
    console.error('Error reading settings:', error);
    return Response.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

// POST - Update settings
export async function POST(request) {
  try {
    const { openaiApiToken, gptModel } = await request.json();
    
    const settings = await readSettings();
    
    // Update the OpenAI API token
    if (openaiApiToken !== undefined) {
      settings.openaiApiToken = openaiApiToken;
    }
    
    // Update the GPT model
    if (gptModel !== undefined) {
      settings.gptModel = gptModel;
    }
    
    await writeSettings(settings);
    
    return Response.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
} 