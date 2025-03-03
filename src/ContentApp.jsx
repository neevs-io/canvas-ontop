import './tailwind.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { createRoot } from 'react-dom/client';

const FloatingButton = () => {
  const [toggled, setToggled] = useState(false);
  const [position, setPosition] = useState(() => {
    const initialX = (window.innerWidth - 164) / 2;
    return { x: initialX, y: 20 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef(null);
  const buttonRef = useRef(null);
  const dragThreshold = 8;

  // Auto-fill Canvas API URL if on a Canvas page
  useEffect(() => {
    chrome.storage.sync.get(['canvasApiUrl'], (result) => {
      if (
        !result.canvasApiUrl &&
        window.location.protocol === 'https:' &&
        window.location.hostname.endsWith('instructure.com')
      ) {
        chrome.storage.sync.set({ canvasApiUrl: window.location.origin });
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['floatingButtonPosition'], (result) => {
      if (result.floatingButtonPosition) {
        setPosition(result.floatingButtonPosition);
      }
    });
  }, []);

  const savePosition = useCallback((newPosition) => {
    chrome.storage.local.set({ floatingButtonPosition: newPosition });
  }, []);

  const toggleSidePanel = useCallback(() => {
    setToggled(prev => !prev);
    chrome.runtime.sendMessage({ action: 'toggleSidePanel' }, (response) => {
      if (response?.status === 'opened' !== toggled) {
        setToggled(response?.status === 'opened');
      }
    });
  }, [toggled]);

  const handlePointerDown = useCallback((e) => {
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    
    startPosRef.current = { x: clientX, y: clientY };
    dragOffsetRef.current = {
      x: clientX - position.x,
      y: clientY - position.y
    };
    setIsDragging(true);
  }, [position.x, position.y]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
  
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    
    let newX = clientX - dragOffsetRef.current.x;
    let newY = clientY - dragOffsetRef.current.y;
    
    const buttonWidth = 164; // Approximation for clamping
    const buttonHeight = 48;
    newX = Math.max(10, Math.min(window.innerWidth - buttonWidth - 10, newX));
    newY = Math.max(10, Math.min(window.innerHeight - buttonHeight - 10, newY));
  
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e) => {
    if (!isDragging) return;
  
    setIsDragging(false);
    savePosition(position);
  
    const endX = e.clientX || e.changedTouches?.[0]?.clientX;
    const endY = e.clientY || e.changedTouches?.[0]?.clientY;
    
    if (startPosRef.current && 
        Math.abs(endX - startPosRef.current.x) < dragThreshold &&
        Math.abs(endY - startPosRef.current.y) < dragThreshold) {
      toggleSidePanel();
    }
  }, [isDragging, position, savePosition, toggleSidePanel]);

  useEffect(() => {
    const handleMessage = (message) => {
      if (message.action === 'sidePanelClosed') {
        setToggled(false);
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
  
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);
  
  return (
    <button 
      ref={buttonRef}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      className={`fixed z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg w-fit ${
        isDragging 
          ? 'shadow-xl cursor-grabbing bg-neu-red transition-none'
          : 'cursor-pointer bg-neu-red hover:bg-red-700 transition-all duration-200'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
        whiteSpace: 'nowrap'
      }}
      aria-label="Toggle side panel"
      role="button"
    >
      <Sparkles size={18} className="text-white" />
      <span className="text-white font-medium">Canvas On Top</span>
    </button>
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
createRoot(container).render(<FloatingButton />);