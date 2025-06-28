'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Usage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div>
          <h3>Welcome to the Resume Builder App!</h3>
          <p>This app helps you create and customize professional resumes by analyzing job postings and optimizing your resume templates with AI.</p>
          
          <h4>Prerequisites:</h4>
          <ul>
            <li>An OpenAI API key (get one from <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API Keys</a>)</li>
            <li>A modern web browser</li>
          </ul>
        </div>
      )
    },
    {
      id: 'setup',
      title: 'Initial Setup',
      content: (
        <div>
          <h3>Setting Up Your API Key</h3>
          <ol>
            <li>Click on the <strong>Settings</strong> section at the bottom of the main page</li>
            <li>Enter your OpenAI API token in the "OpenAI API Token" field</li>
            <li>Optionally, change the GPT model (defaults to gpt-4o)</li>
            <li>Click "Save Settings"</li>
            <li>Test your API connection by clicking "Test API Token"</li>
          </ol>
          
          <div className={styles.note}>
            <strong>Note:</strong> Your API key is stored locally and never shared with third parties.
          </div>
        </div>
      )
    },
    {
      id: 'templates',
      title: 'Managing Templates',
      content: (
        <div>
          <h3>Working with Resume Templates</h3>
          
          <h4>Viewing Templates:</h4>
          <ul>
            <li>All available templates are listed on the right side of the main page</li>
            <li>Use the search bar to find specific templates</li>
            <li>Click on a template to select it for URL processing</li>
            <li><strong>Double-click</strong> a template to preview it in a modal</li>
          </ul>
          
          <h4>Creating New Templates:</h4>
          <ul>
            <li>Click the "New Template" button to create a custom template</li>
            <li>Use the template editor to customize your resume</li>
            <li>Save your template to add it to your collection</li>
          </ul>
          
          <h4>Managing Existing Templates:</h4>
          <ul>
            <li><strong>Double-click</strong> the template name to rename it</li>
            <li>Click the <strong>download button</strong> (green icon) to save as PDF</li>
            <li>Click the <strong>delete button</strong> (red icon) to remove templates (except default)</li>
          </ul>
        </div>
      )
    },
    {
      id: 'url-processing',
      title: 'URL Processing & AI Optimization',
      content: (
        <div>
          <h3>Processing Job Postings with AI</h3>
          
          <h4>Step-by-Step Process:</h4>
          <ol>
            <li><strong>Select a Template:</strong> Choose a resume template from the list on the right</li>
            <li><strong>Enter Job URL:</strong> Paste a job posting URL in the input field</li>
            <li><strong>Process:</strong> Click the arrow button to start processing</li>
            <li><strong>AI Analysis:</strong> The app will:
              <ul>
                <li>Crawl the job posting page</li>
                <li>Extract key requirements and keywords</li>
                <li>Analyze the job description</li>
                <li>Optimize your resume template</li>
              </ul>
            </li>
            <li><strong>New Template:</strong> A new optimized template is automatically created and added to your list</li>
          </ol>
          
          <h4>What the AI Does:</h4>
          <ul>
            <li>Identifies key skills and requirements from the job posting</li>
            <li>Incorporates relevant keywords into your resume</li>
            <li>Adjusts content to match job requirements</li>
            <li>Maintains professional formatting</li>
            <li>Avoids typos and ensures consistency</li>
          </ul>
          
          <div className={styles.note}>
            <strong>Tip:</strong> The AI creates a new template rather than modifying your original, so you always keep your base templates intact.
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Key Features',
      content: (
        <div>
          <h3>App Features Overview</h3>
          
          <h4>AI-Powered Resume Optimization:</h4>
          <ul>
            <li>Automatic job posting analysis</li>
            <li>Keyword extraction and integration</li>
            <li>Content optimization for specific roles</li>
            <li>Professional formatting maintenance</li>
          </ul>
          
          <h4>Template Management:</h4>
          <ul>
            <li>Create custom resume templates</li>
            <li>Preview templates in modal view</li>
            <li>Rename and organize templates</li>
            <li>Export to PDF with one click</li>
          </ul>
          
          <h4>Smart Processing:</h4>
          <ul>
            <li>Duplicate URL detection</li>
            <li>Automatic template list updates</li>
            <li>Error handling and user feedback</li>
            <li>Responsive design for all devices</li>
          </ul>
          
          <h4>User Experience:</h4>
          <ul>
            <li>Intuitive interface design</li>
            <li>Real-time notifications</li>
            <li>Keyboard accessibility</li>
            <li>Dark theme for reduced eye strain</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tips & Best Practices',
      content: (
        <div>
          <h3>Tips for Best Results</h3>
          
          <h4>For URL Processing:</h4>
          <ul>
            <li>Use job postings from reputable sites (LinkedIn, Indeed, company careers pages)</li>
            <li>Ensure the URL is publicly accessible</li>
            <li>Process multiple similar job postings to create comprehensive templates</li>
            <li>Review and customize AI-generated content before finalizing</li>
          </ul>
          
          <h4>For Template Management:</h4>
          <ul>
            <li>Keep your default template as a backup</li>
            <li>Use descriptive names for your templates</li>
            <li>Organize templates by industry or role type</li>
            <li>Regularly export important templates as PDFs</li>
          </ul>
          
          <h4>For AI Optimization:</h4>
          <ul>
            <li>Start with a well-structured base template</li>
            <li>Process job postings that closely match your target role</li>
            <li>Review the AI-generated content for accuracy</li>
            <li>Combine insights from multiple job postings for comprehensive coverage</li>
          </ul>
          
          <h4>General Tips:</h4>
          <ul>
            <li>Keep your API key secure and don't share it</li>
            <li>Test your API connection regularly</li>
            <li>Use the search function to quickly find templates</li>
            <li>Take advantage of the preview feature before downloading</li>
          </ul>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div>
          <h3>Common Issues and Solutions</h3>
          
          <h4>API Connection Issues:</h4>
          <ul>
            <li><strong>Problem:</strong> "OpenAI API token not configured"</li>
            <li><strong>Solution:</strong> Add your API key in Settings and test the connection</li>
            <li><strong>Problem:</strong> "API test failed"</li>
            <li><strong>Solution:</strong> Check your API key validity and internet connection</li>
          </ul>
          
          <h4>URL Processing Issues:</h4>
          <ul>
            <li><strong>Problem:</strong> "Failed to load page"</li>
            <li><strong>Solution:</strong> Ensure the URL is accessible and try again</li>
            <li><strong>Problem:</strong> "Timeout loading page"</li>
            <li><strong>Solution:</strong> Try a different job posting URL or check your internet connection</li>
          </ul>
          
          <h4>Template Issues:</h4>
          <ul>
            <li><strong>Problem:</strong> Can't edit template name</li>
            <li><strong>Solution:</strong> Double-click the template name to enter edit mode</li>
            <li><strong>Problem:</strong> Download not working</li>
            <li><strong>Solution:</strong> Check if pop-ups are blocked in your browser</li>
          </ul>
          
          <h4>General Issues:</h4>
          <ul>
            <li><strong>Problem:</strong> Page not loading properly</li>
            <li><strong>Solution:</strong> Refresh the page or clear browser cache</li>
            <li><strong>Problem:</strong> Slow performance</li>
            <li><strong>Solution:</strong> Check your internet connection and try again</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>How to Use the Resume Builder</h1>
        <p>Complete guide to using the AI-powered resume optimization app</p>
      </div>
      
      <div className={styles.content}>
        <div className={styles.sidebar}>
          <nav className={styles.navigation}>
            {sections.map((section) => (
              <button
                key={section.id}
                className={`${styles.navButton} ${activeSection === section.id ? styles.active : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
        
        <div className={styles.mainContent}>
          {sections.find(section => section.id === activeSection)?.content}
        </div>
      </div>
    </div>
  );
} 