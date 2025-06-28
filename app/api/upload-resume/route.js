import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { NextRequest } from 'next/server';
import fs from 'fs';

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
    const htmlContent = formData.get('htmlContent'); // Frontend will send converted HTML

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type - only images allowed
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return Response.json({ 
        error: 'File type not supported. Please upload image files only (JPG, PNG, GIF, WEBP).' 
      }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return Response.json({ 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Sanitize the original filename
    const originalName = file.name;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Split filename and extension
    const lastDotIndex = sanitizedName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? sanitizedName.substring(0, lastDotIndex) : sanitizedName;
    const extension = lastDotIndex > 0 ? sanitizedName.substring(lastDotIndex) : '';

    // Ensure the resume templates directory exists
    const resumeDir = join(process.cwd(), 'data', '__resume_templates');
    await mkdir(resumeDir, { recursive: true });

    // Generate unique filename by checking if file exists
    let filename = `${nameWithoutExt}.html`;
    let counter = 1;
    
    while (true) {
      const filePath = join(resumeDir, filename);
      try {
        await access(filePath);
        // File exists, create new name with counter
        filename = `${nameWithoutExt}_${counter}.html`;
        counter++;
      } catch {
        // File doesn't exist, we can use this filename
        break;
      }
    }

    // Save the HTML file (converted by frontend)
    const filePath = join(resumeDir, filename);
    await writeFile(filePath, htmlContent || '', 'utf8');

    // Add the new file to checked templates by default
    const checkedTemplates = readCheckedTemplates();
    if (!checkedTemplates.includes(filename)) {
      checkedTemplates.push(filename);
      writeCheckedTemplates(checkedTemplates);
    }

    return Response.json({
      message: 'Resume template uploaded successfully',
      filename: filename,
      originalName: originalName,
      size: htmlContent ? htmlContent.length : 0,
      type: 'text/html',
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload resume template API error:', error);
    return Response.json({ 
      error: 'Failed to upload resume template. Please try again.' 
    }, { status: 500 });
  }
} 