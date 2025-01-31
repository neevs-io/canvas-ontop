// Use a top-level variable (which persists while the service worker is alive)
let sidePanelIsOpen = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleSidePanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        sendResponse({ status: 'no-action' });
        return;
      }
      const currentTabId = tabs[0].id;

      if (!sidePanelIsOpen) {
        if (chrome.sidePanel && chrome.sidePanel.open) {
          chrome.sidePanel.open({ tabId: currentTabId }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error opening side panel:', chrome.runtime.lastError);
              sendResponse({ status: 'no-action' });
              return;
            }
            sidePanelIsOpen = true;
            sendResponse({ status: 'opened' });
          });
        } else {
          sidePanelIsOpen = true;
          sendResponse({ status: 'opened' });
        }
      } else {
        if (chrome.sidePanel && chrome.sidePanel.close) {
          chrome.sidePanel.close({ tabId: currentTabId }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error closing side panel:', chrome.runtime.lastError);
              sendResponse({ status: 'no-action' });
              return;
            }
            sidePanelIsOpen = false;
            // Wrap sendMessage in try/catch to prevent the "Extension context invalidated" error.
            try {
              chrome.tabs.sendMessage(currentTabId, { action: 'sidePanelClosed' });
            } catch (error) {
              console.error('Error sending message:', error);
            }
            sendResponse({ status: 'closed' });
          });
        } else {
          sidePanelIsOpen = false;
          sendResponse({ status: 'closed' });
        }
      }
    });
    return true;
  } else if (message.action === 'openLink') {
    // Instead of creating a new tab, update the current active tab's URL.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { url: message.url }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error updating tab:', chrome.runtime.lastError);
            sendResponse({ status: 'error' });
          } else {
            sendResponse({ status: 'updated' });
          }
        });
      } else {
        sendResponse({ status: 'no-active-tab' });
      }
    });
    return true;
  }
});
