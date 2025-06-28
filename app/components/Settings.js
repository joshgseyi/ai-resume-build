'use client';

import { useState, useEffect } from 'react';
import styles from './Settings.module.css';

export default function Settings() {
  const [openaiApiToken, setOpenaiApiToken] = useState('');
  const [gptModel, setGptModel] = useState('gpt-4o');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setOpenaiApiToken(data.settings?.openaiApiToken || '');
        setGptModel(data.settings?.gptModel || 'gpt-4o');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Failed to load settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setMessage('');
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiToken, gptModel }),
      });

      if (response.ok) {
        showMessage('Settings saved successfully', 'success');
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const handleTokenChange = (e) => {
    setOpenaiApiToken(e.target.value);
  };

  const handleModelChange = (e) => {
    setGptModel(e.target.value);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveSettings();
  };

  const testApiToken = async () => {
    try {
      setIsTesting(true);
      setMessage('');
      
      const response = await fetch('/api/test-openai');
      const data = await response.json();

      if (response.ok) {
        showMessage(`API test successful: ${data.response}`, 'success');
      } else {
        showMessage(data.error || 'API test failed', 'error');
      }
    } catch (error) {
      console.error('Error testing API:', error);
      showMessage('Failed to test API token', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const isTokenValid = openaiApiToken.trim().length > 0;

  if (isLoading) {
    return (
      <div className={styles.settingsContainer}>
        <h3 className={styles.settingsTitle}>AI Settings</h3>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <h3 className={styles.settingsTitle}>AI Settings</h3>
      
      <form onSubmit={handleSave} className={styles.settingsForm}>
        <div className={styles.inputGroup}>
          <label htmlFor="openaiToken" className={styles.label}>
            OpenAI API Token
          </label>
          <input
            id="openaiToken"
            type="password"
            className={styles.input}
            placeholder="Enter your OpenAI API token..."
            value={openaiApiToken}
            onChange={handleTokenChange}
          />
          <p className={styles.helpText}>
            Get your API token from{' '}
            <a 
              href="https://platform.openai.com/account/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              OpenAI API Keys
            </a>
          </p>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="gptModel" className={styles.label}>
            GPT Model
          </label>
          <input
            id="gptModel"
            type="text"
            className={styles.input}
            placeholder="Enter your GPT model..."
            value={gptModel}
            onChange={handleModelChange}
          />
          <p className={styles.helpText}>
            GPT model to use for generating responses.
          </p>
        </div>

        {message && (
          <div className={`${styles.message} ${styles[messageType]}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          className={`${styles.saveButton} ${!isTokenValid ? styles.disabled : ''}`}
          disabled={!isTokenValid || isSaving}
        >
          {isSaving ? (
            <>
              <div className={styles.spinner}></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>

        {isTokenValid && (
          <button
            type="button"
            className={`${styles.testButton} ${isTesting ? styles.disabled : ''}`}
            onClick={testApiToken}
            disabled={isTesting}
          >
            {isTesting ? (
              <>
                <div className={styles.spinner}></div>
                Testing...
              </>
            ) : (
              'Test API Token'
            )}
          </button>
        )}
      </form>
    </div>
  );
} 