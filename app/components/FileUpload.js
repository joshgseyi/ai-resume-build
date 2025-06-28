'use client';

import { useState, useRef } from 'react';
import styles from './FileUpload.module.css';

const FileUpload = ({ onUpload, onClose }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const acceptedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file) => {
    if (!acceptedTypes.includes(file.type)) {
      throw new Error('File type not supported. Please upload image files only (JPG, PNG, GIF, WEBP).');
    }
    
    if (file.size > maxFileSize) {
      throw new Error('File size too large. Maximum size is 10MB.');
    }
    
    return true;
  };

  // Convert image to HTML
  const convertImageToHtml = async (file) => {
    try {
      // Convert image to base64
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Image = btoa(String.fromCharCode(...uint8Array));
      const dataUrl = `data:${file.type};base64,${base64Image}`;
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resume - ${file.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .resume-container {
            max-width: 100%;
            max-height: 90vh;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .resume-header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .resume-header h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .resume-header .file-info {
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .resume-content {
            padding: 20px;
            text-align: center;
        }
        
        img {
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .image-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            text-align: left;
        }
        
        .image-info h3 {
            color: #10b981;
            margin-bottom: 10px;
        }
        
        .image-info ul {
            list-style: none;
        }
        
        .image-info li {
            margin-bottom: 5px;
            color: #666;
        }
        
        .image-info strong {
            color: #333;
        }
        
        .success-badge {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="resume-container">
        <div class="resume-header">
            <h1>🖼️ Resume Template</h1>
            <div class="file-info">
                ${file.name} • ${(file.size / 1024).toFixed(1)} KB
            </div>
        </div>
        
        <div class="resume-content">
            <img src="${dataUrl}" alt="Resume Template" />
            
            <div class="image-info">
                <h3>📊 Template Information</h3>
                <ul>
                    <li><strong>File Name:</strong> ${file.name}</li>
                    <li><strong>File Size:</strong> ${(file.size / 1024).toFixed(1)} KB</li>
                    <li><strong>File Type:</strong> ${file.type}</li>
                    <li><strong>Processing Method:</strong> <span class="success-badge">Direct Image Conversion</span></li>
                    <li><strong>Status:</strong> <span class="success-badge">Successfully Uploaded</span></li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;
      return html;
    } catch (error) {
      console.error('Error converting image to HTML:', error);
      throw new Error('Failed to convert image to HTML');
    }
  };

  const handleFileSelect = async (files) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    try {
      validateFile(file);
      await uploadFile(file);
    } catch (error) {
      if (onUpload) {
        onUpload({ success: false, error: error.message });
      }
    }
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(50);
      const htmlContent = await convertImageToHtml(file);
      setUploadProgress(75);

      const formData = new FormData();
      formData.append('resume', file);
      formData.append('htmlContent', htmlContent);

      setUploadProgress(90);

      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadProgress(100);
        if (onUpload) {
          onUpload({ 
            success: true, 
            filename: data.filename,
            message: 'Resume template uploaded successfully!' 
          });
        }
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      if (onUpload) {
        onUpload({ success: false, error: error.message });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Upload Resume Template</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={isUploading}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <div 
            className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''} ${isUploading ? styles.uploading : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isUploading ? handleBrowseClick : undefined}
          >
            {isUploading ? (
              <div className={styles.uploadingContent}>
                <div className={styles.spinner}></div>
                <p>Uploading resume template...</p>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className={styles.progressText}>{uploadProgress}%</span>
              </div>
            ) : (
              <div className={styles.dropContent}>
                <div className={styles.uploadIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Drop your resume template here</h3>
                <p>or click to browse files</p>
                <div className={styles.fileTypes}>
                  <span>Supported formats: JPG, PNG, GIF, WEBP</span>
                  <span>Max size: 10MB</span>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileInputChange}
            className={styles.fileInput}
            disabled={isUploading}
          />
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 