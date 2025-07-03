import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const templatesDir = path.join(process.cwd(), 'data', '__resume_templates');
const checkedFile = path.join(templatesDir, 'checked_templates.json');
const defaultTemplatePath = path.join(process.cwd(), 'data', '__resume_templates', 'default.html');
const uploadsDir = path.join(process.cwd(), 'public', 'uploads'); // ✅ added to read uploaded PDFs

// Helper function to read checked templates
function readCheckedTemplates() {
  try {
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
    fs.writeFileSync(checkedFile, JSON.stringify(checkedTemplates, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing checked templates:', error);
    return false;
  }
}

// Helper function to remove file extension
function removeFileExtension(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
}

// Helper function to ensure default template is checked
function ensureDefaultTemplateChecked(checkedTemplates) {
  if (!checkedTemplates.includes('default.html')) {
    checkedTemplates.push('default.html');
    writeCheckedTemplates(checkedTemplates);
  }
  return checkedTemplates;
}

// Helper function to ensure only one template is selected
function ensureSingleSelection(checkedTemplates, availableTemplates = []) {
  if (checkedTemplates.length === 0 || availableTemplates.length === 1) {
    return ['default.html'];
  }
  if (checkedTemplates.length > 1) {
    return [checkedTemplates[0]];
  }
  return checkedTemplates;
}

// GET - Get all resume templates with their checked status
export async function GET() {
  try {
    if (!fs.existsSync(templatesDir)) {
      return NextResponse.json({ templates: [], checkedTemplates: [] });
    }

    const htmlTemplates = fs.readdirSync(templatesDir)
      .filter(file => file !== 'checked_templates.json' && file !== '.gitkeep' && file.endsWith('.html'))
      .map(file => {
        const filePath = path.join(templatesDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          displayName: removeFileExtension(file),
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isDefault: file === 'default.html',
          type: 'html'
        };
      })
      .sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return new Date(b.created) - new Date(a.created);
      });

    let uploadedTemplates = [];
    if (fs.existsSync(uploadsDir)) {
      uploadedTemplates = fs.readdirSync(uploadsDir)
        .filter(file => file.endsWith('.pdf'))
        .map(file => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            displayName: removeFileExtension(file),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isUploaded: true,
            type: 'pdf'
          };
        });
    }

    const allTemplates = [...htmlTemplates, ...uploadedTemplates];

    let checkedTemplates = readCheckedTemplates();
    checkedTemplates = ensureSingleSelection(checkedTemplates, htmlTemplates);

    if (checkedTemplates.length > 0) {
      writeCheckedTemplates(checkedTemplates);
    }

    return NextResponse.json({
      templates: allTemplates,
      checkedTemplates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}

// POST - Update checked status of templates
export async function POST(request) {
  try {
    const { checkedTemplates } = await request.json();

    if (!Array.isArray(checkedTemplates)) {
      return NextResponse.json(
        { error: 'checkedTemplates must be an array' },
        { status: 400 }
      );
    }

    const files = fs.readdirSync(templatesDir)
      .filter(file => file !== 'checked_templates.json' && file !== '.gitkeep' && file.endsWith('.html'))
      .map(file => file);

    const finalCheckedTemplates = ensureSingleSelection(checkedTemplates, files);
    const success = writeCheckedTemplates(finalCheckedTemplates);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to update checked templates' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating checked templates:', error);
    return NextResponse.json(
      { error: 'Failed to update checked templates' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific template
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    if (filename === 'default.html') {
      return NextResponse.json(
        { error: 'Cannot delete the default template' },
        { status: 400 }
      );
    }

    const filePath = path.join(templatesDir, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const checkedTemplates = readCheckedTemplates();
    const updatedCheckedTemplates = checkedTemplates.filter(name => name !== filename);

    const remainingFiles = fs.readdirSync(templatesDir)
      .filter(file => file !== 'checked_templates.json' && file !== '.gitkeep' && file.endsWith('.html'))
      .map(file => file);

    const finalCheckedTemplates = ensureSingleSelection(updatedCheckedTemplates, remainingFiles);
    writeCheckedTemplates(finalCheckedTemplates);

    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
