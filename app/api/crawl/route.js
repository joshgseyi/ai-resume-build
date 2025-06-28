import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { url, title, content, selectedTemplate } = await request.json();
    
    if (!url) {
      return Response.json({ error: 'No URL provided' }, { status: 400 });
    }

    if (!title) {
      return Response.json({ error: 'No title provided' }, { status: 400 });
    }

    if (!content) {
      return Response.json({ error: 'No content provided' }, { status: 400 });
    }

    if (!selectedTemplate) {
      return Response.json({ error: 'No selected template provided' }, { status: 400 });
    }

    // Create MD5 hash of the URL for consistent filename
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const filename = `${urlHash}.json`;
    
    // Check if the file already exists
    const pagesDir = path.join(process.cwd(), 'data', 'crawls');
    await fs.mkdir(pagesDir, { recursive: true });
    const filePath = path.join(pagesDir, filename);
    
    let existingData = null;
    try {
      const existingContent = await fs.readFile(filePath, 'utf8');
      existingData = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist, which is fine
    }
    
    // Create data object with all required fields
    const pageData = {
      title: title,
      url: url,
      content: content, // base64 encoded HTML content
      datetime: new Date().toISOString(),
      selectedTemplate: selectedTemplate,
      isUpdated: existingData !== null // Flag to indicate if this is an update
    };

    // Write the JSON file (will overwrite if exists)
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');

    return Response.json({ 
      message: existingData ? 'Page updated successfully' : 'Page saved successfully', 
      filename: filename,
      title: title,
      url: url,
      datetime: pageData.datetime,
      urlHash: urlHash,
      isUpdated: pageData.isUpdated
    });
  } catch (err) {
    console.error('Save page API error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
} 