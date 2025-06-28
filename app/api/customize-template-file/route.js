import { promises as fs } from 'fs';
import path from 'path';

const templatesDir = path.join(process.cwd(), 'data', '__resume_templates');
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

// Read template HTML content
async function readTemplateHtml(filename) {
  try {
    const filePath = path.join(templatesDir, filename);
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read template: ${error.message}`);
  }
}

// Generate unique filename for copy
async function generateUniqueFilename(baseName) {
  const baseDisplayName = baseName.replace('.html', '');
  let counter = 1;
  let newFilename = `${baseDisplayName} copy ${counter}.html`;
  
  while (true) {
    try {
      await fs.access(path.join(templatesDir, newFilename));
      counter++;
      newFilename = `${baseDisplayName} copy ${counter}.html`;
    } catch {
      // File doesn't exist, we can use this name
      break;
    }
  }
  
  return newFilename;
}

// Clean AI response by removing markdown formatting
function cleanAiResponse(response) {
  if (!response) return '';
  
  let cleaned = response.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```html\s*/i, ''); // Remove opening ```html
  cleaned = cleaned.replace(/^```\s*/i, ''); // Remove opening ``` (fallback)
  cleaned = cleaned.replace(/\s*```$/i, ''); // Remove closing ```
  
  // Remove any remaining markdown formatting
  cleaned = cleaned.replace(/^`/g, ''); // Remove opening backticks
  cleaned = cleaned.replace(/`$/g, ''); // Remove closing backticks
  
  return cleaned.trim();
}

// Export the POST function
export async function POST(request) {
  try {
    const { templateFilename, prompt, previewOnly = false, saveExistingHtml = null } = await request.json();
    
    // If saveExistingHtml is provided, just save it without calling AI
    if (saveExistingHtml) {
      if (!templateFilename) {
        return Response.json({ error: 'Template filename is required' }, { status: 400 });
      }
      
      // Clean the HTML content
      const cleanedHtml = cleanAiResponse(saveExistingHtml);
      
      // Generate unique filename for the new template
      const newFilename = await generateUniqueFilename(templateFilename);
      const newFilePath = path.join(templatesDir, newFilename);
      
      // Save the customized template
      await fs.writeFile(newFilePath, cleanedHtml, 'utf8');
      
      // Get file stats for metadata
      const stats = await fs.stat(newFilePath);
      const displayName = newFilename.replace('.html', '');
      
      return Response.json({
        success: true,
        filename: newFilename,
        displayName: displayName,
        html: cleanedHtml,
        created: stats.birthtime,
        modified: stats.mtime
      });
    }
    
    if (!templateFilename || !prompt) {
      return Response.json({ error: 'Template filename and prompt are required' }, { status: 400 });
    }
    
    // Read API token from settings
    const settings = await readSettings();
    const apiToken = settings.openaiApiToken;
    const gptModel = settings.gptModel || 'gpt-4o'; // Default to gpt-4o if not set
    
    if (!apiToken) {
      return Response.json({ error: 'OpenAI API token not configured. Please set it in the settings.' }, { status: 400 });
    }
    
    // Read the original template
    const originalHtml = await readTemplateHtml(templateFilename);
    
    // Use faster Chat Completions API instead of Assistants API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: gptModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert HTML/CSS developer. Customize the provided HTML template according to user requests. Return ONLY valid HTML code, no explanations or markdown formatting. Preserve the complete HTML structure and ensure all tags are properly closed.'
          },
          {
            role: 'user',
            content: `Customize this HTML resume template: ${prompt}\n\nHTML:\n${originalHtml}`
          }
        ],
        max_tokens: 8000, // Increased to handle larger responses
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText} - ${errorText}`);
    }

    const aiData = await openaiResponse.json();
    const customizedHtml = aiData.choices?.[0]?.message?.content?.trim();
    
    if (!customizedHtml) {
      return Response.json({ error: 'No response from AI service' }, { status: 500 });
    }
    
    // Clean the AI response to remove markdown formatting
    const cleanedHtml = cleanAiResponse(customizedHtml);
    
    // Validate that we have complete HTML
    if (!cleanedHtml.includes('COMPLETE_EOF') && !cleanedHtml.includes('html')) {
      console.warn('AI response may be incomplete. Please try again.', cleanedHtml);
      return Response.json({ error: 'AI response is not valid HTML. Please try again.' }, { status: 500 });
    }
    
    // If previewOnly is true, just return the HTML without saving
    if (previewOnly) {
      return Response.json({
        success: true,
        html: cleanedHtml
      });
    }
    
    // Generate unique filename for the new template
    const newFilename = await generateUniqueFilename(templateFilename);
    const newFilePath = path.join(templatesDir, newFilename);
    // Save the customized template
    await fs.writeFile(newFilePath, cleanedHtml, 'utf8');
    // Get file stats for metadata
    const stats = await fs.stat(newFilePath);
    const displayName = newFilename.replace('.html', '');
    return Response.json({
      success: true,
      filename: newFilename,
      displayName: displayName,
      html: cleanedHtml,
      created: stats.birthtime,
      modified: stats.mtime
    });
  } catch (error) {
    console.error('Error customizing template:', error);
    return Response.json({ 
      error: `Failed to customize template: ${error.message}` 
    }, { status: 500 });
  }
} 