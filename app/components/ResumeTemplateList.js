'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ResumeTemplateList.module.css';

export default function ResumeTemplateList({
  templates: propTemplates,
  checkedTemplates: propCheckedTemplates,
  onSelectionChange,
  selectedTemplate,
  onTemplateSelect,
  localSelectionOnly = false
}) {
  const [templates, setTemplates] = useState(propTemplates || []);
  const [checkedTemplates, setCheckedTemplates] = useState(propCheckedTemplates || []);
  const [loading, setLoading] = useState(!propTemplates);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [editingName, setEditingName] = useState(null); // filename being edited
  const [editValue, setEditValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTemplate, setModalTemplate] = useState(null);
  const [modalContent, setModalContent] = useState('');
  const editInputRef = useRef(null);

  // Fetch templates on component mount if not provided
  useEffect(() => {
    if (!propTemplates) fetchTemplates();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (propTemplates) setTemplates(propTemplates);
  }, [propTemplates]);

  useEffect(() => {
    if (propCheckedTemplates) setCheckedTemplates(propCheckedTemplates);
  }, [propCheckedTemplates]);

  useEffect(() => {
    if (editingName && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingName]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/resume-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
        setCheckedTemplates(data.checkedTemplates);
        
        // Call the callback to notify parent component if provided
        if (onSelectionChange) {
          onSelectionChange();
        }
      } else {
        setError('Failed to fetch templates');
      }
    } catch (err) {
      setError('Error loading templates');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // For local selection, use selectedTemplate prop
  const isSelected = (template) => {
    if (localSelectionOnly && selectedTemplate) {
      return selectedTemplate.filename === template.filename;
    }
    return checkedTemplates.includes(template.filename);
  };

  const handleRadioChange = async (template) => {
    if (localSelectionOnly && onTemplateSelect) {
      onTemplateSelect(template);
      return;
    }
    // Otherwise, update checkedTemplates on server
    try {
      setCheckedTemplates([template.filename]);
      const response = await fetch('/api/resume-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedTemplates: [template.filename] }),
      });
      if (!response.ok) {
        setCheckedTemplates(checkedTemplates);
        throw new Error('Failed to update template status');
      }
      
      // Call the callback to notify parent component
      if (onSelectionChange) {
        onSelectionChange();
      }
    } catch (err) {
      console.error('Error updating template status:', err);
    }
  };

  const handleDeleteTemplate = async (filename) => {
    if (filename === 'default.html') {
      alert('Cannot delete the default template');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/resume-templates?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setTemplates(templates.filter(t => t.filename !== filename));
        setCheckedTemplates(checkedTemplates.filter(name => name !== filename));
        
        // Call the callback to notify parent component
        if (onSelectionChange) {
          onSelectionChange();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      alert(err.message);
    }
  };

  // --- Editable Name Logic ---
  const handleNameEdit = (template) => {
    setEditingName(template.filename);
    setEditValue(template.displayName);
  };

  const handleNameEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleNameEditBlur = async (template) => {
    await saveNameEdit(template);
  };

  const handleNameEditKeyDown = async (e, template) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveNameEdit(template);
    } else if (e.key === 'Escape') {
      setEditingName(null);
    }
  };

  const saveNameEdit = async (template) => {
    const newName = editValue.trim();
    if (!newName || newName === template.displayName) {
      setEditingName(null);
      return;
    }
    try {
      const response = await fetch('/api/resume-templates/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldFilename: template.filename, newDisplayName: newName }),
      });
      if (response.ok) {
        // Update local state
        const updatedTemplates = templates.map(t =>
          t.filename === template.filename
            ? { ...t, displayName: newName, filename: newName + '.html' }
            : t
        );
        setTemplates(updatedTemplates);
        setEditingName(null);
        // If using checkedTemplates, update them as well
        setCheckedTemplates(checkedTemplates.map(fn =>
          fn === template.filename ? newName + '.html' : fn
        ));
        
        // Call the callback to notify parent component
        if (onSelectionChange) {
          onSelectionChange();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to rename template');
      }
    } catch (err) {
      alert('Failed to rename template');
    }
  };

  // --- Search Logic ---
  const handleSearchChange = (e) => setSearch(e.target.value);
  const filteredTemplates = templates.filter(t =>
    t.displayName.toLowerCase().includes(search.toLowerCase())
  );

  // --- Modal Logic ---
  const handleTemplateDoubleClick = async (template) => {
    try {
      setModalTemplate(template);
      setModalOpen(true);
      
      // Fetch the template content
      const response = await fetch(`/api/template/${encodeURIComponent(btoa(template.filename))}`);
      if (response.ok) {
        const content = await response.text();
        setModalContent(content);
      } else {
        setModalContent('<p>Error loading template content</p>');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      setModalContent('<p>Error loading template content</p>');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalTemplate(null);
    setModalContent('');
  };

  const handleModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleDownload = async (template) => {
    try {
      // Fetch the template content
      const response = await fetch(`/api/template/${encodeURIComponent(btoa(template.filename))}`);
      if (response.ok) {
        const content = await response.text();
        
        // Create a new window with the template content
        const newWindow = window.open('', '_blank');
        newWindow.document.write(content);
        newWindow.document.close();
        
        // Wait for the content to load, then trigger print
        newWindow.onload = () => {
          setTimeout(() => {
            newWindow.print();
          }, 500); // Small delay to ensure content is fully rendered
        };
      } else {
        alert('Error loading template for download');
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Resume</h2>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading resumes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Resume Templates</h2>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchTemplates} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Resumes</h2>
      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search..."
          value={search}
          onChange={handleSearchChange}
        />
        <button className={styles.searchButton} tabIndex={-1} aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      {filteredTemplates.length === 0 ? (
        <div className={styles.empty}>
          <p>No resumes found.</p>
        </div>
      ) : (
        <div className={styles.templateList}>
          {filteredTemplates.map((template) => (
            <div
              key={template.filename}
              className={`${styles.templateItem} ${template.isDefault ? styles.defaultTemplate : ''}`}
              onClick={() => handleRadioChange(template)}
              onDoubleClick={() => handleTemplateDoubleClick(template)}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected(template)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRadioChange(template);
                }
              }}
            >
              <div className={styles.templateInfo}>
                <label className={styles.radioContainer} onClick={e => e.stopPropagation()}>
                  <input
                    type="radio"
                    name="templateSelection"
                    checked={isSelected(template)}
                    onChange={() => handleRadioChange(template)}
                    className={styles.radio}
                  />
                  <span className={styles.radioMark}></span>
                </label>
                <div className={styles.templateDetails}>
                  {editingName === template.filename ? (
                    <input
                      ref={editInputRef}
                      className={styles.editNameInput}
                      value={editValue}
                      onChange={handleNameEditChange}
                      onBlur={() => handleNameEditBlur(template)}
                      onKeyDown={e => handleNameEditKeyDown(e, template)}
                      maxLength={64}
                    />
                  ) : (
                    <h3
                      className={styles.templateName}
                      onDoubleClick={e => { e.stopPropagation(); handleNameEdit(template); }}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNameEdit(template);
                        }
                      }}
                    >
                      {template.displayName}
                      {template.isDefault && <span className={styles.defaultBadge}>Default</span>}
                    </h3>
                  )}
                  <div className={styles.templateMeta}>
                    <span className={styles.fileDate}>{formatDate(template.created)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.templateActions}>
                <button
                  onClick={e => { e.stopPropagation(); handleDownload(template); }}
                  className={styles.downloadButton}
                  title="Download as PDF"
                  aria-label={`Download ${template.displayName} as PDF`}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {!template.isDefault && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteTemplate(template.filename); }}
                    className={styles.deleteButton}
                    title="Delete template"
                    aria-label={`Delete ${template.displayName}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={handleModalBackdropClick}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{modalTemplate?.displayName}</h3>
              <button 
                className={styles.modalCloseButton}
                onClick={closeModal}
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className={styles.modalContent}>
              <iframe
                srcDoc={modalContent}
                title={modalTemplate?.displayName}
                className={styles.modalIframe}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 