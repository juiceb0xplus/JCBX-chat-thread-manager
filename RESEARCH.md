# TypingMind Extensions Research

## Research Summary for Chat Thread Manager Extension

This document contains comprehensive research on TypingMind's extension system, with a focus on building an extension to manage chat threads (trim/delete functionality).

---

## Table of Contents

1. [Extension System Overview](#extension-system-overview)
2. [Plugins vs Extensions](#plugins-vs-extensions)
3. [Extension Architecture](#extension-architecture)
4. [UI Entry Points & DOM Access](#ui-entry-points--dom-access)
5. [Data Access Patterns](#data-access-patterns)
6. [Chat Thread System](#chat-thread-system)
7. [Implementation Patterns](#implementation-patterns)
8. [Recommendations for Chat Thread Manager](#recommendations-for-chat-thread-manager)
9. [Code Examples](#code-examples)
10. [References](#references)

---

## Extension System Overview

### What are TypingMind Extensions?

TypingMind Extensions allow developers to embed custom JavaScript code into TypingMind with **full access** to:
- Application internal data and state
- DOM manipulation capabilities
- Browser storage (localStorage and IndexedDB)
- Complete UI control

### Key Characteristics

- **Platform Support**: Works across desktop and mobile platforms
- **Loading Method**: Extensions load from a publicly accessible JavaScript URL
- **Execution Timing**: Code executes once at app startup
- **Sync Capability**: Extensions sync across devices via preferences
- **Security Model**: Extensions have unrestricted access (similar to browser extensions)

### Installation Requirements

1. **Public JavaScript URL**: Must be publicly hosted (GitHub Pages, CDN, etc.)
2. **MIME Type**: Server must serve as `application/javascript` or `text/javascript`
3. **CORS Compliance**: Must support CORS for web app loading
4. **Safe Mode**: Users can disable via `?safe_mode=1` URL parameter if extension breaks

---

## Plugins vs Extensions

TypingMind has TWO distinct extension mechanisms:

### Plugins
- **Purpose**: Extend AI assistant capabilities with tools
- **Architecture**: Uses OpenAI Function Calling API specification
- **Implementation**: JavaScript (sandboxed), HTTP Actions, or MCP
- **Scope**: Limited to AI tool integration
- **Use Cases**: External API calls, data processing, third-party integrations

### Extensions (Our Focus)
- **Purpose**: Modify UI and access/manipulate application data
- **Architecture**: Pure JavaScript with full DOM/storage access
- **Implementation**: Custom code loaded at startup
- **Scope**: Complete application control
- **Use Cases**: UI enhancements, data management, workflow automation

**For chat thread management, we need an EXTENSION, not a plugin.**

---

## Extension Architecture

### Initialization Pattern

Extensions should use a deferred initialization approach to ensure DOM is ready:

```javascript
// Pattern from ContentShield extension
if (document.readyState === "complete") {
  setTimeout(initializeExtension, 1000);
} else {
  window.addEventListener("load", () => setTimeout(initializeExtension, 1000));
}

function initializeExtension() {
  // Extension code here
  console.log("Extension initialized");
}
```

**Why the 1-second delay?**
- Ensures TypingMind's React app has fully rendered
- Prevents race conditions with dynamic UI elements
- Allows data-element-id attributes to be present

### File Structure

**Single-File Pattern** (Simplest):
```
extension.js (self-contained, hosted on GitHub Pages or CDN)
```

**Multi-File Pattern** (More complex):
```
main.js (loader)
├── ui.js (UI components)
├── data.js (data access)
└── utils.js (helpers)
```

### Dependencies

Extensions can load external libraries:
```javascript
// Load JSZip for file compression (example from export extension)
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
document.head.appendChild(script);
```

---

## UI Entry Points & DOM Access

### data-element-id System

TypingMind uses custom `data-element-id` attributes for semantic element identification. These are more stable than class names or IDs.

### Known data-element-id Values

| Element ID | Location | Purpose |
|-----------|----------|---------|
| `workspace-bar` | Top menu bar | Main application menu container |
| `workspace-tab-settings` | Menu bar | Settings button (common anchor point) |
| `new-chat-button-in-side-bar` | Sidebar | New chat button |
| `chat-input-textbox` | Chat area | Main message input field |
| `workspace-tab-export-chats` | Menu bar | Custom export button (from extension) |
| `workspace-tab-export-current-chat` | Menu bar | Custom export current chat (from extension) |
| `workspace-tab-shield` | Menu bar | ContentShield button (from extension) |

### Finding Elements

```javascript
// Standard pattern
const workspaceBar = document.querySelector('[data-element-id="workspace-bar"]');
const settingsButton = document.querySelector('[data-element-id="workspace-tab-settings"]');
const chatInput = document.querySelector('[data-element-id="chat-input-textbox"]');

// Fallback pattern (ID or data-element-id)
const chatInput = document.querySelector('#chat-input-textbox') ||
                  document.querySelector('[data-element-id="chat-input-textbox"]');
```

### Adding Custom UI Elements

**Pattern: Insert next to existing button**
```javascript
// Clone styling from settings button
const settingsButton = document.querySelector('[data-element-id="workspace-tab-settings"]');
const customButton = settingsButton.cloneNode(true);

// Customize
customButton.setAttribute('data-element-id', 'workspace-tab-custom');
customButton.innerHTML = `
  <svg><!-- custom icon --></svg>
  <span>Custom Action</span>
`;

// Insert
settingsButton.parentNode.insertBefore(customButton, settingsButton.nextSibling);

// Add event listener
customButton.addEventListener('click', handleCustomAction);
```

### Requesting New data-element-id Values

From documentation: "If you need to access certain UI elements that do not have an element ID yet, you can let them know."

**For chat thread manager, we'll likely need:**
- Thread navigation arrows (← →)
- Individual message containers
- Thread indicator/selector
- Message edit/regenerate controls

---

## Data Access Patterns

### IndexedDB Structure

TypingMind stores chat data in IndexedDB:

**Database Name**: `keyval-store`
**Object Store**: `keyval`

### Reading Chat Data

```javascript
function getAllChats() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keyval-store');

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['keyval'], 'readonly');
      const objectStore = transaction.objectStore('keyval');
      const getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = () => {
        const allData = getAllRequest.result;
        const chats = [];

        // Filter for chat objects
        allData.forEach((entry) => {
          // Chats have keys starting with 'CHAT_'
          if (entry.key && entry.key.startsWith('CHAT_')) {
            chats.push(entry.value);
          }
        });

        resolve(chats);
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
}
```

### Chat Object Structure

Based on the export extension analysis:

```javascript
{
  chatID: "CHAT_abc123...",
  chatTitle: "Conversation Title",
  model: "gpt-4",
  createdAt: 1234567890000,
  updatedAt: 1234567890123,
  messages: [
    {
      role: "user",
      content: "Hello" // or structured array for complex messages
    },
    {
      role: "assistant",
      content: "Hi there!"
    }
  ],
  chatParams: { temperature: 0.7, ... },
  tokenUsage: { prompt: 100, completion: 50 },
  tags: ["tag1", "tag2"],
  folderID: "folder_123",
  // ... other metadata
}
```

**Note**: Thread/branch structure is NOT documented. We'll need to:
1. Inspect actual IndexedDB in browser DevTools
2. Reverse-engineer the thread data model
3. Test with regenerated/edited messages

### LocalStorage Access

```javascript
// Get folder structure
const folders = JSON.parse(localStorage.getItem('TM_useFolderList') || '[]');

// Get tags
const tags = JSON.parse(localStorage.getItem('TM_useChatUniqeTags') || '[]');

// Set custom extension config
localStorage.setItem('myExtensionConfig', JSON.stringify(config));
```

### Writing Data (⚠️ CAUTION)

From documentation: "Writing operations carry corruption risks"

```javascript
function updateChat(chatID, updatedChatData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keyval-store');

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['keyval'], 'readwrite');
      const objectStore = transaction.objectStore('keyval');

      // Update the chat
      const putRequest = objectStore.put(updatedChatData, chatID);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
}
```

**IMPORTANT**: Always backup data before modifying!

---

## Chat Thread System

### How Threads Work

From [chat thread documentation](https://docs.typingmind.com/chat-management/chat-thread):

1. **Branching Mechanism**: When you edit or regenerate a message, TypingMind:
   - Preserves the original conversation path
   - Creates a new branch with the modified prompt/response
   - Maintains both as independent threads

2. **Navigation**: Arrow buttons (← →) appear below modified messages

3. **Thread Independence**: "Each thread acts as a mini-conversation"

4. **Continuation**: Users can continue chatting from any thread branch

5. **No Strict Limits**: Very old branches may be archived if inactive

### Thread Data Model (Hypothesis)

Since there's no official documentation, we hypothesize the structure might be:

**Option A: Nested Messages Array**
```javascript
{
  chatID: "...",
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi", threadID: "main" },
    {
      role: "user",
      content: "Hello again",
      branches: [
        { threadID: "branch1", messages: [...] },
        { threadID: "branch2", messages: [...] }
      ]
    }
  ]
}
```

**Option B: Flat Messages with Pointers**
```javascript
{
  messages: [
    { id: "msg1", role: "user", content: "Hello", nextMessageID: "msg2" },
    { id: "msg2", role: "assistant", content: "Hi", nextMessageID: "msg3" },
    { id: "msg3", role: "user", content: "Variant A", nextMessageID: "msg4" },
    { id: "msg3b", role: "user", content: "Variant B", nextMessageID: "msg5", parentID: "msg2" }
  ],
  currentThread: ["msg1", "msg2", "msg3", "msg4"]
}
```

**Option C: Separate Thread Metadata**
```javascript
{
  messages: [...], // Linear array
  threads: {
    "thread1": { path: [0, 1, 2, 3], active: true },
    "thread2": { path: [0, 1, 2, 5], active: false }
  },
  currentThreadID: "thread1"
}
```

**→ We need to inspect actual data to confirm!**

### UI Indicators (Need to find)

We need to locate these UI elements:
- Thread navigation arrows (← →)
- Current thread indicator
- Thread count display
- Message edit button
- Regenerate button

---

## Implementation Patterns

### MutationObserver for Dynamic UI

TypingMind's UI updates dynamically. Use MutationObserver to react:

```javascript
// Watch for UI changes (from ContentShield)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      // UI changed, re-inject buttons if needed
      initializeUI();
    }
  });
});

const workspaceBar = document.querySelector('[data-element-id="workspace-bar"]');
if (workspaceBar) {
  observer.observe(workspaceBar, { childList: true, subtree: true });
}
```

### Event Delegation

Handle dynamic elements efficiently:

```javascript
// Instead of adding listeners to each button
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-action="delete-thread"]')) {
    handleDeleteThread(e.target.dataset.threadId);
  }

  if (e.target.matches('[data-action="trim-thread"]')) {
    handleTrimThread(e.target.dataset.threadId);
  }
});
```

### Configuration Management

```javascript
class ExtensionConfig {
  constructor(storageKey = 'chatThreadManagerConfig') {
    this.storageKey = storageKey;
    this.config = this.load();
  }

  load() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : this.getDefaults();
  }

  getDefaults() {
    return {
      confirmDelete: true,
      showThreadCount: true,
      theme: 'auto'
    };
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.config));
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
  }
}
```

### Error Handling & Safety

```javascript
async function safeDataOperation(operation, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    console.error('[ChatThreadManager] Error:', error);

    // Show user-friendly notification
    showNotification('Operation failed. Please try again.', 'error');

    return fallback;
  }
}

// Usage
const chats = await safeDataOperation(
  () => getAllChats(),
  [] // fallback to empty array
);
```

---

## Recommendations for Chat Thread Manager

### Phase 1: Research & Discovery

**Goal**: Understand the thread data model

1. **Inspect IndexedDB**
   - Open TypingMind in browser
   - Open DevTools → Application → IndexedDB → keyval-store
   - Create a chat with multiple threads (edit/regenerate messages)
   - Examine the chat object structure
   - Document the thread representation

2. **Identify UI Elements**
   - Use DevTools inspector to find thread navigation elements
   - Document selectors and data-element-id values
   - Screenshot current thread UI for reference
   - Request new data-element-id values from TypingMind if needed

3. **Test Thread Operations**
   - Manually test editing messages
   - Manually test regenerating messages
   - Observe how threads are created, navigated, and stored
   - Document edge cases (nested threads, archived threads, etc.)

### Phase 2: Prototype Extension

**Goal**: Build minimal viable extension

1. **Basic UI Integration**
   - Add "Thread Manager" button to workspace bar
   - Create modal/panel for thread management
   - Display current chat's threads in a list

2. **Read-Only Functionality**
   - Display thread tree/list
   - Show thread metadata (creation time, message count)
   - Highlight current active thread
   - Allow thread preview (show first few messages)

3. **Testing & Validation**
   - Test on various chat types
   - Verify data reads correctly
   - Ensure no performance impact
   - Get user feedback on UI/UX

### Phase 3: Destructive Operations

**Goal**: Implement delete/trim safely

1. **Backup System**
   - Auto-backup before any destructive operation
   - Store backups in localStorage or download as file
   - Implement undo/restore functionality

2. **Delete Thread**
   - Identify which thread to delete
   - Remove messages associated with that thread
   - Update thread navigation pointers
   - Preserve other threads

3. **Trim Thread**
   - Identify trim point in conversation
   - Remove messages after trim point in specific thread
   - Maintain data integrity

4. **Confirmation & Safety**
   - Always require user confirmation
   - Show preview of what will be deleted
   - Prevent deleting last/main thread
   - Handle edge cases gracefully

### Phase 4: Polish & Distribution

1. **UI Enhancements**
   - Keyboard shortcuts
   - Drag-and-drop thread reordering
   - Thread search/filter
   - Export individual threads

2. **Configuration Options**
   - Confirmation preferences
   - UI placement options
   - Theme customization

3. **Documentation**
   - User guide
   - Installation instructions
   - Troubleshooting tips
   - API documentation for other developers

4. **Distribution**
   - Host on GitHub Pages
   - Submit to awesome-typingmind repository
   - Share on community forums

### Critical Considerations

⚠️ **Data Safety**
- Always backup before writes
- Test extensively on non-production data
- Provide clear undo mechanisms
- Warn users about risks

⚠️ **Schema Changes**
- TypingMind can change data model anytime
- Build defensive code that handles schema variations
- Version your extension
- Monitor for TypingMind updates

⚠️ **Performance**
- Avoid blocking the main thread
- Use debouncing for frequent operations
- Lazy-load heavy UI components
- Test with large chat histories

⚠️ **User Experience**
- Non-intrusive UI
- Clear visual feedback
- Accessible keyboard navigation
- Mobile-responsive (TypingMind works on mobile)

---

## Code Examples

### Complete Extension Skeleton

```javascript
/**
 * TypingMind Chat Thread Manager Extension
 * Allows users to view, delete, and trim chat threads
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    EXTENSION_NAME: 'ChatThreadManager',
    VERSION: '1.0.0',
    DB_NAME: 'keyval-store',
    OBJECT_STORE: 'keyval',
    STORAGE_KEY: 'chatThreadManagerConfig'
  };

  // State
  let currentChat = null;
  let uiElements = {};

  // ============================================
  // Initialization
  // ============================================

  function init() {
    console.log(`[${CONFIG.EXTENSION_NAME}] v${CONFIG.VERSION} initializing...`);

    // Setup UI
    initializeUI();

    // Setup observers
    observeUIChanges();

    // Setup event listeners
    setupEventListeners();

    console.log(`[${CONFIG.EXTENSION_NAME}] Initialized successfully`);
  }

  // ============================================
  // UI Initialization
  // ============================================

  function initializeUI() {
    const workspaceBar = document.querySelector('[data-element-id="workspace-bar"]');
    const settingsButton = document.querySelector('[data-element-id="workspace-tab-settings"]');

    if (!workspaceBar || !settingsButton) {
      console.warn(`[${CONFIG.EXTENSION_NAME}] UI elements not found, retrying...`);
      setTimeout(initializeUI, 1000);
      return;
    }

    // Check if already added
    if (document.querySelector('[data-element-id="workspace-tab-thread-manager"]')) {
      return;
    }

    // Create thread manager button
    const button = createThreadManagerButton();
    settingsButton.parentNode.insertBefore(button, settingsButton.nextSibling);

    uiElements.button = button;
  }

  function createThreadManagerButton() {
    const settingsButton = document.querySelector('[data-element-id="workspace-tab-settings"]');
    const button = settingsButton.cloneNode(true);

    button.setAttribute('data-element-id', 'workspace-tab-thread-manager');
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
        <circle cx="4" cy="4" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="8" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
      </svg>
      <span style="margin-left: 8px;">Threads</span>
    `;

    return button;
  }

  // ============================================
  // Data Access
  // ============================================

  async function getAllChats() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME);

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([CONFIG.OBJECT_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.OBJECT_STORE);
        const getAllRequest = objectStore.getAllKeys();
        const getValuesRequest = objectStore.getAll();

        Promise.all([
          new Promise(r => { getAllRequest.onsuccess = () => r(getAllRequest.result); }),
          new Promise(r => { getValuesRequest.onsuccess = () => r(getValuesRequest.result); })
        ]).then(([keys, values]) => {
          const chats = [];
          keys.forEach((key, index) => {
            if (key.startsWith('CHAT_')) {
              chats.push({ key, data: values[index] });
            }
          });
          resolve(chats);
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async function getChat(chatID) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME);

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([CONFIG.OBJECT_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.OBJECT_STORE);
        const getRequest = objectStore.get(chatID);

        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async function updateChat(chatID, chatData) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME);

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([CONFIG.OBJECT_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.OBJECT_STORE);
        const putRequest = objectStore.put(chatData, chatID);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // Thread Operations
  // ============================================

  function analyzeThreads(chat) {
    // TODO: Reverse-engineer thread structure
    // This will depend on actual data model
    console.log('Chat data:', chat);
    return {
      threads: [],
      currentThread: null
    };
  }

  async function deleteThread(chatID, threadID) {
    // TODO: Implement after understanding thread structure
    console.log(`Deleting thread ${threadID} from chat ${chatID}`);
  }

  async function trimThread(chatID, threadID, messageIndex) {
    // TODO: Implement after understanding thread structure
    console.log(`Trimming thread ${threadID} at message ${messageIndex}`);
  }

  // ============================================
  // Event Handlers
  // ============================================

  function setupEventListeners() {
    // Button click
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-element-id="workspace-tab-thread-manager"]')) {
        handleThreadManagerClick();
      }
    });
  }

  async function handleThreadManagerClick() {
    console.log('Thread manager clicked');

    // Get current chat
    // TODO: Figure out how to get current active chat ID

    // Show modal with threads
    showThreadManagerModal();
  }

  function showThreadManagerModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; width: 90%;">
        <h2>Thread Manager</h2>
        <p>Thread management functionality coming soon...</p>
        <button id="close-thread-modal" style="margin-top: 20px;">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handler
    modal.querySelector('#close-thread-modal').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // ============================================
  // UI Observers
  // ============================================

  function observeUIChanges() {
    const observer = new MutationObserver(() => {
      // Re-initialize UI if needed
      if (!document.querySelector('[data-element-id="workspace-tab-thread-manager"]')) {
        initializeUI();
      }
    });

    const workspaceBar = document.querySelector('[data-element-id="workspace-bar"]');
    if (workspaceBar) {
      observer.observe(workspaceBar, { childList: true, subtree: false });
    }
  }

  // ============================================
  // Utilities
  // ============================================

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10001;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // ============================================
  // Entry Point
  // ============================================

  if (document.readyState === 'complete') {
    setTimeout(init, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1000));
  }

})();
```

### Data Inspection Script

Run this in browser console to inspect thread structure:

```javascript
// Inspect TypingMind IndexedDB
(function inspectTypingMindData() {
  const request = indexedDB.open('keyval-store');

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['keyval'], 'readonly');
    const objectStore = transaction.objectStore('keyval');
    const getAllKeysRequest = objectStore.getAllKeys();
    const getAllRequest = objectStore.getAll();

    Promise.all([
      new Promise(r => { getAllKeysRequest.onsuccess = () => r(getAllKeysRequest.result); }),
      new Promise(r => { getAllRequest.onsuccess = () => r(getAllRequest.result); })
    ]).then(([keys, values]) => {
      console.log('=== TypingMind Data Inspection ===');

      // Find chats
      const chats = [];
      keys.forEach((key, index) => {
        if (key.startsWith('CHAT_')) {
          chats.push({ key, data: values[index] });
        }
      });

      console.log(`Found ${chats.length} chats`);

      // Inspect first chat with detail
      if (chats.length > 0) {
        console.log('\n=== First Chat Structure ===');
        console.log(chats[0]);

        // Look for thread indicators
        const chat = chats[0].data;
        console.log('\n=== Analyzing for Thread Structure ===');
        console.log('Messages:', chat.messages?.length || 0);
        console.log('Message structure sample:', chat.messages?.[0]);

        // Check for common thread patterns
        const possibleThreadKeys = Object.keys(chat).filter(key =>
          key.toLowerCase().includes('thread') ||
          key.toLowerCase().includes('branch') ||
          key.toLowerCase().includes('version')
        );

        console.log('Possible thread-related keys:', possibleThreadKeys);
        possibleThreadKeys.forEach(key => {
          console.log(`  ${key}:`, chat[key]);
        });
      }

      // List all unique keys across all chats
      const allKeys = new Set();
      chats.forEach(({ data }) => {
        Object.keys(data).forEach(key => allKeys.add(key));
      });

      console.log('\n=== All Chat Object Keys ===');
      console.log(Array.from(allKeys).sort());
    });
  };

  request.onerror = () => {
    console.error('Failed to open IndexedDB:', request.error);
  };
})();
```

---

## References

### Official Documentation
- [TypingMind Extensions](https://docs.typingmind.com/typing-mind-extensions)
- [Chat Threads](https://docs.typingmind.com/chat-management/chat-thread)
- [Build a TypingMind Plugin](https://docs.typingmind.com/plugins/build-a-typingmind-plugin)

### Example Extensions
- [awesome-typingmind](https://github.com/TypingMind/awesome-typingmind) - Collection of extensions
- [ContentShield](https://github.com/itcon-pty-au/typingmind-contentshield) - Input monitoring extension
- [Cloud Backup](https://github.com/itcon-pty-au/typingmind-cloud-backup) - Data sync extension
- [MCP Extension](https://github.com/iamjackg/typingmind-mcp-extension) - MCP integration
- [Export Chat Gist](https://gist.github.com/rod-gurgel/a77034aebe2bcb344e521ac64928b324) - Chat export

### Official Plugins
- [TypingMind GitHub](https://github.com/orgs/TypingMind/repositories) - 52 repositories
- [plugins-server](https://github.com/TypingMind/plugins-server) - Plugin infrastructure

### Key Insights
1. **No Official Schema**: TypingMind doesn't document internal data structures
2. **Frequent Changes**: Schema and UI can change without notice
3. **No Support**: Extensions are unsupported by official team
4. **Community Driven**: Learn from community examples
5. **Reverse Engineering**: Must inspect data structures manually

---

## Next Steps

### Immediate Actions

1. **Run Data Inspection Script**
   - Open TypingMind in browser
   - Create a test chat with multiple threads (edit/regenerate messages)
   - Run the inspection script in console
   - Document the thread data structure

2. **Map UI Elements**
   - Use DevTools to inspect thread navigation UI
   - Document selectors and structure
   - Screenshot for reference
   - Identify injection points for our buttons

3. **Create Proof of Concept**
   - Build minimal extension that shows thread count
   - Test on various chat types
   - Validate data reading works correctly

### Development Roadmap

- [ ] **Phase 1**: Research & Discovery (Current)
  - [ ] Inspect IndexedDB thread structure
  - [ ] Map UI elements
  - [ ] Document data model

- [ ] **Phase 2**: Read-Only Prototype
  - [ ] Add UI button
  - [ ] Display threads in modal
  - [ ] Show thread metadata

- [ ] **Phase 3**: Destructive Operations
  - [ ] Implement backup system
  - [ ] Build delete thread functionality
  - [ ] Build trim thread functionality

- [ ] **Phase 4**: Polish & Release
  - [ ] Add configuration options
  - [ ] Write documentation
  - [ ] Host on GitHub Pages
  - [ ] Submit to awesome-typingmind

---

## Warnings & Disclaimers

⚠️ **Data Corruption Risk**: Modifying IndexedDB directly can corrupt user data. Always backup first.

⚠️ **No Official Support**: TypingMind provides no technical support for extensions.

⚠️ **Schema Changes**: Internal data model may change without notice. Extension may break.

⚠️ **Security**: Extensions have full access to user data. Be responsible.

⚠️ **Testing**: Thoroughly test on non-production data before release.

---

*Research compiled: 2025-11-18*
*Target: Chat Thread Manager Extension for TypingMind*
*Status: Phase 1 - Research & Discovery*
