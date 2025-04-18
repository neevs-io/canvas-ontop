// Use a top-level variable (which persists while the service worker is alive)
let sidePanelIsOpen = false;

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-sidepanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const currentTabId = tabs[0].id;
      
      if (!sidePanelIsOpen) {
        openSidePanel(currentTabId);
      } else {
        closeSidePanel(currentTabId);
      }
    });
  }
});

function openSidePanel(tabId) {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    chrome.sidePanel.open({ tabId }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error opening side panel:', chrome.runtime.lastError);
        return;
      }
      sidePanelIsOpen = true;
    });
  } else {
    sidePanelIsOpen = true;
  }
}

function closeSidePanel(tabId) {
  if (chrome.sidePanel && chrome.sidePanel.close) {
    chrome.sidePanel.close({ tabId }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error closing side panel:', chrome.runtime.lastError);
        return;
      }
      sidePanelIsOpen = false;
      try {
        chrome.tabs.sendMessage(tabId, { action: 'sidePanelClosed' });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });
  } else {
    sidePanelIsOpen = false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleSidePanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        sendResponse({ status: 'no-action' });
        return;
      }
      const currentTabId = tabs[0].id;

      if (!sidePanelIsOpen) {
        openSidePanel(currentTabId);
        sendResponse({ status: 'opened' });
      } else {
        closeSidePanel(currentTabId);
        sendResponse({ status: 'closed' });
      }
    });
    return true;
  } else if (message.action === 'openLink') {
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

// Keep side panel state synchronized
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.error('Error setting panel behavior:', error));