import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const settingsFile = path.join(process.cwd(), 'data', 'settings.json');
const templatesDir = path.join(process.cwd(), 'data', '__resume_templates');

// Read settings to get API token
async function readSettings() {
  try {
    const data = await fs.readFile(settingsFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Read template content
async function readTemplate(templateName) {
  try {
    const templatePath = path.join(templatesDir, templateName);
    const content = await fs.readFile(templatePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading template:', error);
    throw new Error(`Failed to read template: ${templateName}`);
  }
}

// Save new template
async function saveTemplate(templateName, content) {
  try {
    await fs.mkdir(templatesDir, { recursive: true });
    const templatePath = path.join(templatesDir, templateName);
    await fs.writeFile(templatePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving template:', error);
    throw new Error(`Failed to save template: ${templateName}`);
  }
}

// Extract text content from HTML and get top keywords
function extractKeywordsFromHTML(htmlContent) {
  // Remove script and style tags
  let text = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove all HTML/XML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace and convert to lowercase
  text = text.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Extract words (alphanumeric characters only)
  const words = text.match(/[a-z0-9]+/g) || [];
  
  // Count word frequency
  const wordCount = {};
  words.forEach(word => {
    if (word.length > 2) { // Only count words longer than 2 characters
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  // Convert to array and sort by frequency
  const sortedWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a);
  
  // Get top 10% of words (reduced from 20% to minimize tokens)
  const topCount = Math.max(1, Math.floor(sortedWords.length * 0.1));
  const topKeywords = sortedWords.slice(0, topCount).map(([word]) => word);
  
  return topKeywords.join(' ');
}

export async function POST(request) {
  try {
    const { url, title, content, selectedTemplate, urlHash } = await request.json();
    
    if (!url || !title || !content || !selectedTemplate) {
      return Response.json({ 
        error: 'Missing required parameters: url, title, content, or selectedTemplate' 
      }, { status: 400 });
    }

    // Read API token from settings
    const settings = await readSettings();
    const apiToken = settings.openaiApiToken;
    const gptModel = settings.gptModel || 'gpt-4o'; // Default to gpt-4o if not set
    
    if (!apiToken) {
      return Response.json({ 
        error: 'OpenAI API token not configured. Please set it in the settings.' 
      }, { status: 400 });
    }

    // Read the selected template
    const templateContent = await readTemplate(selectedTemplate);
    
    // Decode the base64 content and extract text
    const decodedContent = Buffer.from(content, 'base64').toString('utf8');
    const pageText = extractTextFromHTML(decodedContent);
    
    // Step 1: Analyze the crawled page to extract job information
    const analysisPrompt = `Analyze this job posting page and extract:

1. Key job requirements and qualifications
2. Required skills and technologies
3. Preferred experience and background
4. Important keywords for the position
5. Job title and level
6. Company/industry context

Job posting content:
${pageText.substring(0, 4000)}

Provide a structured analysis with clear sections. Focus on actionable information for resume optimization.`;
    
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: gptModel,
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const jobAnalysis = analysisData.choices?.[0]?.message?.content || '';
    
    // Step 2: Use the job analysis to optimize the template
    const optimizationPrompt = `Based on this job analysis, optimize the resume template:

JOB ANALYSIS:
${jobAnalysis}

RESUME TEMPLATE:
${templateContent}

CRITICAL INSTRUCTIONS:
- Return ONLY the updated HTML template content
- NO explanations, comments, or markdown formatting
- NO "Certainly!" or similar phrases
- NO code blocks or backticks
- Start directly with <!DOCTYPE html> or <html>
- End with the closing </html> tag
- Do not include any text before or after the HTML

Update the resume template to highlight relevant skills, use keywords from the job posting, and emphasize matching experience while maintaining professional formatting.`;
    
    const optimizationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: gptModel,
        messages: [{ role: 'user', content: optimizationPrompt }],
        max_tokens: 8000,
        temperature: 0.3,
        stream: true // Use streaming for large responses
      })
    });

    if (!optimizationResponse.ok) {
      const errorText = await optimizationResponse.text();
      console.error('Template optimization failed:', {
        status: optimizationResponse.status,
        statusText: optimizationResponse.statusText,
        response: errorText
      });
      throw new Error(`Template optimization failed: ${optimizationResponse.status}`);
    }

    // Process streaming response for optimized template
    let updatedTemplate = '';
    const reader = optimizationResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                updatedTemplate += content;
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    if (!updatedTemplate) {
      return Response.json({ 
        error: 'No content received from AI' 
      }, { status: 500 });
    }

    // Create a new template name based on the page title and timestamp
    const sanitizedTitle = title.replace(/[^a-z0-9\-_ ]/gi, '').replace(/\s+/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + new Date().getSeconds();
    const newTemplateName = `${sanitizedTitle}_${timestamp}.html`;
    
    // Save the new template
    await saveTemplate(newTemplateName, updatedTemplate);
    
    return Response.json({
      success: true,
      message: 'Template processed and saved successfully',
      templateName: newTemplateName,
      originalTemplate: selectedTemplate,
      url: url,
      title: title,
      jobAnalysis: jobAnalysis // Include the analysis for reference
    });

  } catch (error) {
    console.error('Error processing with AI:', error);
    return Response.json({ 
      error: `Processing failed: ${error.message}` 
    }, { status: 500 });
  }
}

// Extract text content from HTML (simplified version for analysis)
function extractTextFromHTML(htmlContent) {
  // Remove script and style tags
  let text = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove all HTML/XML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
} 