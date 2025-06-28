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

// Truncate HTML content to fit within token limits
function truncateHtmlForTokens(html, maxTokens = 6000) {
  // Rough estimation: 1 token ≈ 4 characters for HTML
  const maxChars = maxTokens * 4;
  
  if (html.length <= maxChars) {
    return html;
  }
  
  // Try to truncate at a reasonable point (end of a tag)
  const truncated = html.substring(0, maxChars);
  const lastTagEnd = truncated.lastIndexOf('>');
  
  if (lastTagEnd > maxChars * 0.8) { // If we can find a good break point
    return truncated.substring(0, lastTagEnd + 1) + '\n<!-- ... rest of template truncated for token limits ... -->';
  }
  
  return truncated + '\n<!-- ... rest of template truncated for token limits ... -->';
}

export async function POST(request) {
  try {
    const { templateFilename, prompt } = await request.json();
    
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
    
    // Truncate HTML if it's too long for tokens
    const truncatedHtml = truncateHtmlForTokens(originalHtml);
    
    // Prepare the prompt for OpenAI GPT-4
    const aiPrompt = `You are an expert web developer specializing in HTML and CSS. I have an HTML resume template that needs to be customized.

USER'S CUSTOMIZATION REQUEST: ${prompt}

TASK: Modify the HTML template according to the user's request. You must:
1. Keep the overall structure and functionality intact
2. Only modify styling, layout, or content as specifically requested
3. Ensure the HTML remains valid and complete
4. Return ONLY the complete HTML code - no explanations, no markdown formatting

IMPORTANT RULES:
- Return ONLY the HTML code, nothing else
- Do not add any comments or explanations
- Maintain all existing functionality
- Ensure the HTML is properly formatted and complete
- If the request is unclear, make reasonable assumptions based on common resume design principles
- If you see truncation comments, maintain the structure and apply changes to the visible parts

RESPONSE FORMAT: Return the complete HTML document as-is, ready to be saved as a file.`;

    // Call OpenAI GPT-4 API with truncated content
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
            content: 'You are an expert web developer. Return only valid HTML code without any explanations or markdown formatting.'
          },
          {
            role: 'user',
            content: `Here is the HTML template to customize:\n\n${truncatedHtml}\n\n${aiPrompt}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      // Try to get error details
      let errorMessage = `OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`;
      
      try {
        const errorText = await openaiResponse.text();
        // Check if it's JSON
        if (errorText.trim().startsWith('{')) {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.error || errorMessage;
        } else if (errorText.includes('html')) {
          // It's an HTML error page
          errorMessage = `OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}. Please check your API token and try again.`;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      console.error('OpenAI API error:', errorMessage);
      return Response.json({ error: errorMessage }, { status: 500 });
    }

    // Try to parse the response as JSON
    let aiData;
    try {
      const responseText = await openaiResponse.text();
      aiData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      return Response.json({ 
        error: 'Invalid response from AI service. Please try again.' 
      }, { status: 500 });
    }

    const customizedHtml = aiData.choices?.[0]?.message?.content?.trim();

    if (!customizedHtml) {
      return Response.json({ error: 'No response from AI service' }, { status: 500 });
    }

    // Generate unique filename for the new template
    const newFilename = await generateUniqueFilename(templateFilename);
    const newFilePath = path.join(templatesDir, newFilename);

    // Save the customized template
    await fs.writeFile(newFilePath, customizedHtml, 'utf8');

    // Get file stats for metadata
    const stats = await fs.stat(newFilePath);
    const displayName = newFilename.replace('.html', '');

    return Response.json({
      success: true,
      filename: newFilename,
      displayName: displayName,
      html: customizedHtml,
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