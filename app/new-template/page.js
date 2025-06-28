'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import ResumeTemplateList from '../components/ResumeTemplateList';

export default function NewTemplate() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateHtml, setTemplateHtml] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [templateChangeKey, setTemplateChangeKey] = useState(0);
  const router = useRouter();

  // Load templates and set default preview on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Force iframe update when template changes
  useEffect(() => {
    if (templateHtml && selectedTemplate) {
      // The key change will force React to recreate the iframe
    }
  }, [selectedTemplate, templateHtml, templateChangeKey]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/resume-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
        // Only set default template if no template is currently selected
        if (data.templates.length > 0 && !selectedTemplate) {
          const defaultTemplate = data.templates[0];
          setSelectedTemplate(defaultTemplate);
          loadTemplateHtml(defaultTemplate.filename);
        } else if (selectedTemplate) {
          // Verify the selected template still exists in the templates list
          const templateExists = data.templates.some(t => t.filename === selectedTemplate.filename);
          if (!templateExists) {
            setSelectedTemplate(data.templates[0]);
            loadTemplateHtml(data.templates[0].filename);
          }
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      showMessage('Failed to load templates', 'error');
    }
  };

  const loadTemplateHtml = async (filename) => {
    try {
      setTemplateHtml(''); // Clear current content first
      const encodedFilename = btoa(filename);
      const templateResponse = await fetch(`/api/template/${encodedFilename}?t=${Date.now()}`);
      if (templateResponse.ok) {
        const templateContent = await templateResponse.text();
        setTemplateHtml(templateContent);
      } else {
        console.error('Failed to load template:', templateResponse.status);
        setTemplateHtml('');
      }
    } catch (error) {
      console.error('Error loading template HTML:', error);
      setTemplateHtml('');
    }
  };

  // Handler for local template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setTemplateChangeKey(prev => prev + 1); // Force iframe reload
    loadTemplateHtml(template.filename);
    setMessage(''); // Clear any messages
  };

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedTemplate) return;

    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/customize-template-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateFilename: selectedTemplate.filename,
          prompt: prompt.trim(),
          previewOnly: true
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Generate Debug:', {
          receivedHtmlLength: data.html?.length || 0,
          receivedHtml: data.html?.substring(0, 100) + '...' // First 100 chars
        });
        setTemplateHtml(data.html);
        showMessage('Template customized successfully! Click "Save Template" to save it.', 'success');
      } else {
        showMessage(data.error || 'Failed to customize template', 'error');
      }
    } catch (error) {
      console.error('Error generating template:', error);
      showMessage('Error generating template. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    // Get the entire document's innerHTML and extract iframe content using regex
    const documentIframe = document.getElementById('templateIframe').contentDocument 
    || document.getElementById('templateIframe').contentWindow.document;
    const documentHTML = documentIframe.documentElement.innerHTML;
    
    let contentToSave = documentHTML
    
    if (!contentToSave) {
      showMessage('No content to save', 'error');
      return;
    }

    setIsSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/customize-template-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateFilename: selectedTemplate.filename,
          saveExistingHtml: contentToSave
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        showMessage(`Template saved as "${data.displayName}"!`, 'success');
        // Refresh templates list to include the new template
        await loadTemplates();
        
        // Find and select the newly saved template
        const newTemplate = data.templates?.find(t => t.filename === data.filename) || 
                           { filename: data.filename, displayName: data.displayName };
        setSelectedTemplate(newTemplate);
        setTemplateHtml(data.html || '');
        
        // Clear the form
        setPrompt('');
      } else {
        showMessage(data.error || 'Failed to save template', 'error');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showMessage('Error saving template. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackClick = () => {
    router.push('/');
  };

  const canGenerate = prompt.trim() && selectedTemplate && !isLoading;

  return (
    <div className={styles.container}>
      {/* Header should be above the grid and left-aligned */}
      <div className={styles.headerWrapper}>
        <div className={styles.header}>
          <button 
            className={styles.backButton}
            onClick={handleBackClick}
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <h1>Resumes</h1>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Left Section: Resume Template List */}
        <div className={styles.leftSection}>
          <ResumeTemplateList
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            localSelectionOnly
          />
        </div>
        {/* Right Section: Preview and Prompt */}
        <div className={styles.rightSection}>
          <div className={styles.templatePreview}>
            <div className={styles.htmlDiv}>
              {templateHtml ? (
                <iframe
                  id="templateIframe"
                  key={`${selectedTemplate?.filename || 'no-template'}-${templateChangeKey}-${templateHtml.length}`}
                  srcDoc={templateHtml}
                  className={styles.templateIframe}
                  title={selectedTemplate ? `${selectedTemplate.displayName} Preview` : 'Template Preview'}
                />
              ) : (
                <div className={styles.htmlContent}>
                  <h2>Template Preview</h2>
                  <p>Select a template to preview...</p>
                </div>
              )}
              
              {/* Overlay to prevent editing during operations */}
              {(isLoading || isSaving) && (
                <div className={styles.processingOverlay}>
                  <div className={styles.processingContent}>
                    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    <p>{isLoading ? 'Generating template...' : 'Saving template...'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save button moved here, right under the iframe */}
          <div className={styles.saveButtonContainer}>
            <button 
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving}
              aria-label="Save as New Template"
            >
              {isSaving ? (
                <>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Save as Template
                </>
              )}
            </button>
          </div>

          {message && (
            <div className={`${styles.message} ${styles[messageType]}`}>
              {message}
            </div>
          )}

          <form className={styles.promptForm} onSubmit={handleGenerate}>
            <div className={styles.inputContainer}>
              <label htmlFor="prompt" className={styles.label}>
                Customization Prompt
              </label>
              <textarea
                id="prompt"
                className={styles.promptInput}
                placeholder="Describe how you want to customize this resume template (e.g., 'Make it more modern with blue colors', 'Change the layout to be more minimal', 'Add a professional header section')..."
                value={prompt}
                onChange={handlePromptChange}
                disabled={isLoading || isSaving}
                rows={3}
              />
            </div>
            <div className={styles.buttonContainer}>
              <button 
                type="submit" 
                className={`${styles.generateButton} ${!canGenerate ? styles.disabled : ''}`}
                disabled={!canGenerate}
                aria-label="Generate Customized Template"
              >
                {isLoading ? (
                  <>
                    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 20L20 4M15 4h5v5M9 20H4v-5M16.5 9.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"/>
                    </svg>
                    Generate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 