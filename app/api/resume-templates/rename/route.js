import { promises as fs } from 'fs';
import path from 'path';

const templatesDir = path.join(process.cwd(), 'data', '__resume_templates');
const metaFile = path.join(templatesDir, 'meta.json');

export async function POST(req) {
  try {
    const { oldFilename, newDisplayName } = await req.json();
    if (!oldFilename || !newDisplayName) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }
    if (oldFilename === 'default.html') {
      return new Response(JSON.stringify({ error: 'Cannot rename the default template' }), { status: 400 });
    }
    const newFilename = newDisplayName + '.html';
    const oldPath = path.join(templatesDir, oldFilename);
    const newPath = path.join(templatesDir, newFilename);

    // Prevent overwriting existing file
    try {
      await fs.access(newPath);
      return new Response(JSON.stringify({ error: 'A template with that name already exists.' }), { status: 409 });
    } catch {}

    // Rename the file
    await fs.rename(oldPath, newPath);

    // Update meta.json if it exists
    let meta = {};
    try {
      const metaRaw = await fs.readFile(metaFile, 'utf8');
      meta = JSON.parse(metaRaw);
    } catch {}
    if (meta[oldFilename]) {
      meta[newFilename] = { ...meta[oldFilename], displayName: newDisplayName };
      delete meta[oldFilename];
      await fs.writeFile(metaFile, JSON.stringify(meta, null, 2), 'utf8');
    }

    return new Response(JSON.stringify({ success: true, newFilename, newDisplayName }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 