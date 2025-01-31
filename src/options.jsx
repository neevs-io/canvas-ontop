import React, { useState, useEffect } from 'react';

const Options = () => {
  const [canvasApiUrl, setCanvasApiUrl] = useState('');
  const [canvasApiToken, setCanvasApiToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    chrome.storage.sync.get(
      ['canvasApiUrl', 'canvasApiToken', 'openaiApiKey'],
      (items) => {
        if (items.canvasApiUrl) setCanvasApiUrl(items.canvasApiUrl);
        if (items.canvasApiToken) setCanvasApiToken(items.canvasApiToken);
        if (items.openaiApiKey) setOpenaiApiKey(items.openaiApiKey);
      }
    );
  }, []);

  const handleSave = () => {
    chrome.storage.sync.set(
      { canvasApiUrl, canvasApiToken, openaiApiKey },
      () => {
        setStatus('Settings saved successfully!');
        setTimeout(() => setStatus(''), 2000);
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-base-bg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-dark">
          Extension Settings
        </h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-dark">Canvas API URL</label>
          <input
            type="text"
            value={canvasApiUrl}
            onChange={(e) => setCanvasApiUrl(e.target.value)}
            placeholder="https://your-school.instructure.com"
            className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-canvas-teal focus:border-canvas-teal outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-dark">Canvas API Token</label>
          <input
            type="text"
            value={canvasApiToken}
            onChange={(e) => setCanvasApiToken(e.target.value)}
            placeholder="Paste your Canvas token here"
            className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-canvas-teal focus:border-canvas-teal outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-dark">OpenAI API Key</label>
          <input
            type="text"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="Paste your OpenAI key here"
            className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-canvas-teal focus:border-canvas-teal outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-neu-red hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Save Settings
        </button>
        {status && <span className="text-sm text-canvas-teal">{status}</span>}
      </div>
    </div>
  );
};

export default Options;