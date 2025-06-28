import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return Response.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Create MD5 hash of the URL for consistent filename (same as crawl endpoint)
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const filename = `${urlHash}.json`;
    
    // Check if the file exists
    const pagesDir = path.join(process.cwd(), 'data', 'crawls');
    const filePath = path.join(pagesDir, filename);

    try {
      await fs.access(filePath);
      
      // File exists, read the existing data
      const fileContent = await fs.readFile(filePath, 'utf8');
      const pageData = JSON.parse(fileContent);
      
      return Response.json({ 
        exists: true,
        filename: filename,
        title: pageData.title || 'Untitled',
        url: pageData.url || url,
        datetime: pageData.datetime || new Date().toISOString(),
        urlHash: urlHash
      });
    } catch (error) {
      // File doesn't exist
      return Response.json({ 
        exists: false,
        url: url,
        urlHash: urlHash
      });
    }
  } catch (err) {
    console.error('Check URL API error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
} 