import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { execSync } from 'child_process'; // ✅ to convert PDF

// Helper function to read checked templates
function readCheckedTemplates() {
  try {
    const checkedFile = join(process.cwd(), 'data', '__resume_templates', 'checked_templates.json');
    if (fs.existsSync(checkedFile)) {
      const data = fs.readFileSync(checkedFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading checked templates:', error);
  }
  return [];
}

// Helper function to write checked templates
function writeCheckedTemplates(checkedTemplates) {
  try {
    const checkedFile = join(process.cwd(), 'data', '__resume_templates', 'checked_templates.json');
    fs.writeFileSync(checkedFile, JSON.stringify(checkedTemplates, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing checked templates:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    const htmlContent = formData.get('htmlContent');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Sanitize filename and split extension
    const originalName = file.name;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const lastDotIndex = sanitizedName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? sanitizedName.substring(0, lastDotIndex) : sanitizedName;
    const extension = lastDotIndex > 0 ? sanitizedName.substring(lastDotIndex).toLowerCase() : '';

    // Ensure directories exist
    const resumeDir = join(process.cwd(), 'data', '__resume_templates');
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(resumeDir, { recursive: true });
    await mkdir(uploadDir, { recursive: true });

    // Determine final HTML filename
    let filename = `${nameWithoutExt}.html`;
    let counter = 1;
    while (true) {
      const filePath = join(resumeDir, filename);
      try {
        await access(filePath);
        filename = `${nameWithoutExt}_${counter}.html`;
        counter++;
      } catch {
        break;
      }
    }
    const htmlPath = join(resumeDir, filename);

    if (extension === '.pdf') {
      // ✅ Handle PDF conversion using pdftohtml
      const tempPdfPath = join(uploadDir, sanitizedName);
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(tempPdfPath, Buffer.from(arrayBuffer));
      try {
        execSync(`pdftohtml -q -noframes -s "${tempPdfPath}" "${htmlPath}"`);
      } catch (conversionErr) {
        console.error('PDF to HTML conversion failed:', conversionErr);
        return NextResponse.json({ error: 'PDF conversion failed.' }, { status: 500 });
      }
    } else {
      // Validate non-PDF uploads: images only
      const allowedTypes = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
      }
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'File too large.' }, { status: 400 });
      }
      // Save HTML content from frontend if provided
      await writeFile(htmlPath, htmlContent || '', 'utf8');
    }

    // Mark new template as checked
    const checkedTemplates = readCheckedTemplates();
    if (!checkedTemplates.includes(filename)) {
      checkedTemplates.push(filename);
      writeCheckedTemplates(checkedTemplates);
    }

    return NextResponse.json({ message: 'Template uploaded', filename, originalName });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
