import { promises as fs } from 'fs';
import path from 'path';

const settingsFile = path.join(process.cwd(), 'data', 'settings.json');

// Read settings to get API token
async function readSettings() {
  try {
    const data = await fs.readFile(settingsFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    // Read API token from settings
    const settings = await readSettings();
    const apiToken = settings.openaiApiToken;
    const gptModel = settings.gptModel || 'gpt-4o'; // Default to gpt-4o if not set
    
    if (!apiToken) {
      return Response.json({ 
        error: 'OpenAI API token not configured. Please set it in the settings.' 
      }, { status: 400 });
    }

    // Test the API with a simple request
    const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: gptModel,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, OpenAI API is working!"'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('OpenAI API test failed:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        response: errorText
      });
      
      return Response.json({ 
        error: `API test failed: ${testResponse.status} ${testResponse.statusText}`,
        details: errorText.substring(0, 200) // First 200 chars for debugging
      }, { status: 500 });
    }

    const testData = await testResponse.json();
    const response = testData.choices?.[0]?.message?.content;

    return Response.json({
      success: true,
      message: 'OpenAI API token is working correctly',
      response: response
    });

  } catch (error) {
    console.error('Error testing OpenAI API:', error);
    return Response.json({ 
      error: `Test failed: ${error.message}` 
    }, { status: 500 });
  }
} 