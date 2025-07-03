'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import NotificationManager from './components/NotificationManager';
import ResumeTemplateList from './components/ResumeTemplateList';
import Settings from './components/Settings';
import UploadResumeSection from './components/UploadResumeSection'; // ✅ added for PDF upload

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkedTemplates, setCheckedTemplates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showHelpTooltip, setShowHelpTooltip] = useState(true);
  const iframeRef = useRef(null);
  const router = useRouter();

  // Fetch checked templates on component mount
  useEffect(() => {
    fetchCheckedTemplates();
  }, []);

  const fetchCheckedTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch('/api/resume-templates');
      if (response.ok) {
        const data = await response.json();
        setCheckedTemplates(data.checkedTemplates || []);
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching checked templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Callback function to refresh templates when selection changes
  const handleTemplateSelectionChange = () => {
    fetchCheckedTemplates();
  };

  const handleUrlChange = (e) => setUrl(e.target.value);
  
  const sanitizeTitle = (title) => {
    return title.replace(/[^a-z0-9\-_ ]/gi, '').replace(/\s+/g, '_');
  };

  const showNotification = (message, type = 'info') => {
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification(message, type);
    }
  };

  const handleViewResumesClick = () => {
    router.push('/new-template');
  };

  const handleCreateTemplateClick = () => {
    router.push('/new-template');
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url || checkedTemplates.length === 0) return;

    setIsLoading(true);
    let checkData = null;
    
    try {
      // First, check if URL has been crawled before
      const checkResponse = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!checkResponse.ok) {
        throw new Error('Failed to check URL status');
      }
      
      checkData = await checkResponse.json();
      
      if (checkData.exists) {
        // URL has been crawled before, notify user but proceed
        showNotification(
          `This URL was previously crawled on ${new Date(checkData.datetime).toLocaleString()}. Updating...`, 
          'info'
        );
      }

      // Try iframe approach first
      let title, htmlContent;
      
      try {
        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);

        // Wait for iframe to load
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout loading page'));
          }, 10000); // 10 second timeout for iframe

          iframe.onload = () => {
            clearTimeout(timeout);
            resolve();
          };

          iframe.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load page in iframe'));
          };
        });

        // Try to get iframe content
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        title = iframeDoc.title || 'untitled';
        htmlContent = iframeDoc.documentElement.outerHTML;
        
        // Clean up iframe
        document.body.removeChild(iframe);
        
      } catch (iframeError) {
        console.log('Iframe approach failed, trying server-side fetch:', iframeError.message);
        
        // Fallback to server-side fetching
        const response = await fetch('/api/fetch-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        
        if (!response.ok) {
          throw new Error(`Server fetch failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        title = data.title || 'untitled';
        htmlContent = data.content;
      }

      // Convert HTML to base64
      const base64Content = btoa(unescape(encodeURIComponent(htmlContent)));
      
      // Send to crawl API with selected template
      const crawlResponse = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          title, 
          content: base64Content,
          selectedTemplate: checkedTemplates[0] // Send the selected template
        }),
      });
      
      const crawlData = await crawlResponse.json();
      if (!crawlResponse.ok) {
        throw new Error(crawlData.error || 'Failed to save page');
      }

      // Now process with AI to create a new template
      showNotification('Processing with AI to create optimized template...', 'info');
      
      const aiResponse = await fetch('/api/process-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title,
          content: base64Content,
          selectedTemplate: checkedTemplates[0],
          urlHash: crawlData.urlHash
        }),
      });

      const aiData = await aiResponse.json();
      if (aiResponse.ok) {
        showNotification(`New template created: ${aiData.templateName}`, 'success');
        // Reload the template list to show the new template
        await fetchCheckedTemplates();
      } else {
        showNotification(`AI processing failed: ${aiData.error}`, 'error');
      }

    } catch (err) {
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const hasCheckedTemplates = checkedTemplates.length > 0;
  const isUrlDisabled = !hasCheckedTemplates || isLoading || templatesLoading;

  // Get the selected template's display name
  const getSelectedTemplateName = () => {
    if (checkedTemplates.length === 0 || templates.length === 0) return null;
    const selectedTemplate = templates.find(t => t.filename === checkedTemplates[0]);
    return selectedTemplate ? selectedTemplate.displayName : checkedTemplates[0]?.replace('.html', '');
  };

  return (
    <div className={styles.app}>
      <NotificationManager />
      <div className={styles.mainContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>AI Resume Optimizer</h1>
          <div className={styles.headerActions}>
            <div className={styles.helpContainer}>
              <button 
                className={styles.helpButton}
                onClick={() => router.push('/usage')}
                onMouseEnter={() => setShowHelpTooltip(true)}
                onMouseLeave={() => setShowHelpTooltip(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Help
              </button>
              {showHelpTooltip && (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipArrow}></div>
                  <div className={styles.tooltipContent}>
                    <strong>Need help?</strong> Learn how to use the app effectively!
                    <button 
                      className={styles.tooltipClose}
                      onClick={() => setShowHelpTooltip(false)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button 
              className={styles.settingsButton}
              onClick={() => router.push('/new-template')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              View Resumes
            </button>
          </div>
        </header>
        {/* ✅ PDF Resume Upload Feature */}
<UploadResumeSection />

        <div className={styles.contentGrid}>
          {/* Left Section */}
          <div className={styles.leftSection}>
            <div className={styles.gridContainer}>
              <div 
                className={styles.gridItem} 
                tabIndex={0} 
                role="button"
                onClick={handleCreateTemplateClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCreateTemplateClick();
                  }
                }}
              >
                <div className={styles.gridIcon}>
                  {/* Create/Add SVG */}
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>New Template</h3>
              </div>
              <div 
                className={styles.gridItem} 
                tabIndex={0} 
                role="button"
                onClick={handleViewResumesClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleViewResumesClick();
                  }
                }}
              >
                <div className={styles.gridIcon}>
                  {/* View Resumes SVG */}
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3>View Resumes</h3>
              </div>
            </div>
            <div className={styles.urlSection}>
              <form className={styles.urlForm} onSubmit={handleUrlSubmit} autoComplete="off">
                <div className={styles.urlInputContainer}>
                  <input
                    className={styles.urlInput}
                    type="text"
                    placeholder="Enter URL here..."
                    value={url}
                    onChange={handleUrlChange}
                    disabled={isUrlDisabled}
                  />
                  <button 
                    className={styles.urlSubmit} 
                    type="submit" 
                    aria-label="Submit URL"
                    disabled={isUrlDisabled}
                  >
                    {isLoading ? (
                      /* Loading Spinner SVG */
                      <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                          <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                          <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                    ) : (
                      /* Arrow SVG */
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              </form>
              <div className={styles.urlCaption}>
                {templatesLoading ? (
                  <p>Loading templates...</p>
                ) : !hasCheckedTemplates ? (
                  <p>Please select a resume template to enable URL processing</p>
                ) : (
                  <p>Ready to process URLs with selected template: {getSelectedTemplateName()}</p>
                )}
              </div>
            </div>
            <Settings />
          </div>

          {/* Right Section */}
          <div className={styles.rightSection}>
            <ResumeTemplateList 
              checkedTemplates={checkedTemplates}
              templates={templates}
              onSelectionChange={handleTemplateSelectionChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 
