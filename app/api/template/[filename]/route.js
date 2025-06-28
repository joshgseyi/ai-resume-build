import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    console.log('filename:', atob(filename));

    const templatePath = path.join(process.cwd(), 'data', '__resume_templates', atob(filename));
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    return new NextResponse(templateContent, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  } catch (error) {
    console.error('Error serving template:', error);
    return NextResponse.json(
      { error: 'Failed to serve template' },
      { status: 500 }
    );
  }
} 