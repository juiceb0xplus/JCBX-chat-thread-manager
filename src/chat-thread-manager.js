/**
 * TypingMind Chat Thread Manager Extension
 * Version: 1.0.0
 *
 * Features:
 * - View all threads in current chat
 * - Delete individual threads
 * - Flatten chat (remove all threads, keep active conversation)
 * - Automatic backup before destructive operations
 * - Thread statistics and analytics
 *
 * Installation:
 * 1. Host this file on a public URL (GitHub Pages, etc.)
 * 2. In TypingMind: Menu > Preferences > Extensions
 * 3. Add the URL to your extension
 * 4. Reload the page
 */

(function() {
  'use strict';

  // ============================================
  // Configuration
  // ============================================

  const CONFIG = {
    EXTENSION_NAME: 'ChatThreadManager',
    VERSION: '1.0.0',
    DB_NAME: 'keyval-store',
    OBJECT_STORE: 'keyval',
    STORAGE_KEY: 'chatThreadManagerConfig',
    BACKUP_PREFIX: 'CTM_BACKUP_',
    MAX_BACKUPS: 5
  };

  // ============================================
  // State Management
  // ============================================

  const state = {
    currentChatID: null,
    currentChat: null,
    uiElements: {},
    isInitialized: false
  };

  // ============================================
  // Initialization
  // ============================================

  function init() {
    console.log(`[${CONFIG.EXTENSION_NAME}] v${CONFIG.VERSION} initializing...`);

    // Setup UI
    initializeUI();

    // Setup observers
    observeUIChanges();
    observeChatChanges();

    // Setup event listeners
    setupEventListeners();

    state.isInitialized = true;
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

    state.uiElements.button = button;

    console.log(`[${CONFIG.EXTENSION_NAME}] UI initialized`);
  }

  function createThreadManagerButton() {
    const settingsButton = document.querySelector('[data-element-id="workspace-tab-settings"]');
    const button = settingsButton.cloneNode(true);

    button.setAttribute('data-element-id', 'workspace-tab-thread-manager');
    button.title = 'Chat Thread Manager';
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
  // Data Access Layer
  // ============================================

  async function getCurrentChatID() {
    // Try to extract from URL hash
    const hash = window.location.hash;
    const match = hash.match(/chat=([^&]+)/);
    if (match) {
      return 'CHAT_' + match[1];
    }

    // Fallback: try to find from DOM or localStorage
    // This might need adjustment based on TypingMind's actual implementation
    return null;
  }

  async function getChat(chatID) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME);

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([CONFIG.OBJECT_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.OBJECT_STORE);
        const getRequest = objectStore.get(chatID);

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result);
          } else {
            reject(new Error(`Chat ${chatID} not found`));
          }
        };
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
  // Thread Analysis
  // ============================================

  function analyzeChat(chat) {
    if (!chat || !chat.messages) {
      return {
        totalMessages: 0,
        messagesWithThreads: 0,
        totalThreads: 0,
        threadsByMessage: []
      };
    }

    const messagesWithThreads = chat.messages.map((msg, index) => {
      const threadCount = msg.threads?.length || 0;
      return {
        index,
        role: msg.role,
        uuid: msg.uuid,
        hasThreads: threadCount > 0,
        threadCount,
        threads: msg.threads || [],
        content: getMessagePreview(msg.content)
      };
    }).filter(m => m.hasThreads);

    const totalThreads = chat.messages.reduce((sum, msg) =>
      sum + (msg.threads?.length || 0), 0
    );

    return {
      totalMessages: chat.messages.length,
      messagesWithThreads: messagesWithThreads.length,
      totalThreads,
      threadsByMessage: messagesWithThreads
    };
  }

  function getMessagePreview(content) {
    if (typeof content === 'string') {
      return content.substring(0, 100);
    }
    if (Array.isArray(content)) {
      const textContent = content.find(c => c.type === 'text');
      if (textContent) {
        return textContent.text.substring(0, 100);
      }
    }
    return '[No preview available]';
  }

  function getThreadPreview(thread) {
    if (!thread.messages || thread.messages.length === 0) {
      return '[Empty thread]';
    }

    const firstMsg = thread.messages[0];
    return getMessagePreview(firstMsg.content);
  }

  // ============================================
  // Backup System
  // ============================================

  async function createBackup(chatID, chat) {
    const backup = {
      chatID,
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(chat)) // Deep clone
    };

    const backupKey = `${CONFIG.BACKUP_PREFIX}${chatID}_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));

    // Clean old backups
    cleanOldBackups(chatID);

    console.log(`[${CONFIG.EXTENSION_NAME}] Backup created: ${backupKey}`);
    return backupKey;
  }

  function cleanOldBackups(chatID) {
    const backups = Object.keys(localStorage)
      .filter(key => key.startsWith(`${CONFIG.BACKUP_PREFIX}${chatID}_`))
      .sort()
      .reverse();

    // Keep only MAX_BACKUPS
    backups.slice(CONFIG.MAX_BACKUPS).forEach(key => {
      localStorage.removeItem(key);
      console.log(`[${CONFIG.EXTENSION_NAME}] Removed old backup: ${key}`);
    });
  }

  function listBackups(chatID) {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(`${CONFIG.BACKUP_PREFIX}${chatID}_`))
      .map(key => {
        try {
          const backup = JSON.parse(localStorage.getItem(key));
          return {
            key,
            timestamp: backup.timestamp,
            chatID: backup.chatID
          };
        } catch (e) {
          return null;
        }
      })
      .filter(b => b !== null)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async function restoreBackup(backupKey) {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      throw new Error('Backup not found');
    }

    const backup = JSON.parse(backupData);
    await updateChat(backup.chatID, backup.data);

    showNotification('Backup restored successfully', 'success');
    console.log(`[${CONFIG.EXTENSION_NAME}] Restored backup: ${backupKey}`);
  }

  // ============================================
  // Thread Operations
  // ============================================

  async function deleteThread(chatID, messageIndex, threadIndex) {
    try {
      // Get current chat
      const chat = await getChat(chatID);

      // Validate indices
      if (!chat.messages[messageIndex] || !chat.messages[messageIndex].threads) {
        throw new Error('Invalid message or thread index');
      }

      // Create backup
      await createBackup(chatID, chat);

      // Remove thread
      const updatedChat = { ...chat };
      updatedChat.messages = [...chat.messages];
      updatedChat.messages[messageIndex] = { ...chat.messages[messageIndex] };
      updatedChat.messages[messageIndex].threads = [...chat.messages[messageIndex].threads];
      updatedChat.messages[messageIndex].threads.splice(threadIndex, 1);

      // If no threads remain, remove the threads array
      if (updatedChat.messages[messageIndex].threads.length === 0) {
        delete updatedChat.messages[messageIndex].threads;
      }

      // Update timestamp
      updatedChat.updatedAt = new Date().toISOString();

      // Save
      await updateChat(chatID, updatedChat);

      showNotification('Thread deleted successfully', 'success');
      console.log(`[${CONFIG.EXTENSION_NAME}] Deleted thread ${threadIndex} from message ${messageIndex}`);

      return true;
    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Error deleting thread:`, error);
      showNotification(`Error: ${error.message}`, 'error');
      return false;
    }
  }

  async function flattenChat(chatID) {
    try {
      // Get current chat
      const chat = await getChat(chatID);

      // Count threads to be removed
      const analysis = analyzeChat(chat);
      if (analysis.totalThreads === 0) {
        showNotification('No threads to remove', 'info');
        return false;
      }

      // Confirm with user
      const confirmed = confirm(
        `This will permanently remove ALL ${analysis.totalThreads} thread(s) from this chat.\n\n` +
        `Only the currently active conversation will remain.\n\n` +
        `A backup will be created automatically.\n\n` +
        `Continue?`
      );

      if (!confirmed) {
        return false;
      }

      // Create backup
      const backupKey = await createBackup(chatID, chat);

      // Remove all threads
      const flattenedChat = { ...chat };
      flattenedChat.messages = chat.messages.map(msg => {
        const { threads, ...messageWithoutThreads } = msg;
        return messageWithoutThreads;
      });

      // Update timestamp
      flattenedChat.updatedAt = new Date().toISOString();

      // Save
      await updateChat(chatID, flattenedChat);

      showNotification(
        `Chat flattened successfully! Removed ${analysis.totalThreads} thread(s). Backup: ${backupKey.split('_').pop()}`,
        'success',
        5000
      );

      console.log(`[${CONFIG.EXTENSION_NAME}] Flattened chat ${chatID}, removed ${analysis.totalThreads} threads`);

      return true;
    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Error flattening chat:`, error);
      showNotification(`Error: ${error.message}`, 'error');
      return false;
    }
  }

  // ============================================
  // UI: Thread Manager Modal
  // ============================================

  async function showThreadManagerModal() {
    try {
      // Get current chat ID
      const chatID = await getCurrentChatID();
      if (!chatID) {
        showNotification('No active chat detected', 'error');
        return;
      }

      state.currentChatID = chatID;

      // Get chat data
      const chat = await getChat(chatID);
      state.currentChat = chat;

      // Analyze threads
      const analysis = analyzeChat(chat);

      // Create modal
      const modal = createModal(chat, analysis);
      document.body.appendChild(modal);

      // Add modal to state
      state.uiElements.modal = modal;
    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Error showing modal:`, error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  }

  function createModal(chat, analysis) {
    const modal = document.createElement('div');
    modal.id = 'chat-thread-manager-modal';
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
      backdrop-filter: blur(4px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 800px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    `;

    content.innerHTML = `
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Chat Thread Manager</h2>
        <button id="close-thread-modal" style="
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
        ">&times;</button>
      </div>

      <div style="margin-bottom: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Chat Statistics</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Messages</div>
            <div style="font-size: 20px; font-weight: 600;">${analysis.totalMessages}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Messages with Threads</div>
            <div style="font-size: 20px; font-weight: 600;">${analysis.messagesWithThreads}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Threads</div>
            <div style="font-size: 20px; font-weight: 600; color: #3b82f6;">${analysis.totalThreads}</div>
          </div>
        </div>
      </div>

      ${analysis.totalThreads > 0 ? `
        <div style="margin-bottom: 20px;">
          <button id="flatten-chat-button" style="
            width: 100%;
            padding: 12px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          ">
            🗜️ Flatten Chat (Remove All ${analysis.totalThreads} Threads)
          </button>
        </div>
      ` : ''}

      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Threads by Message</h3>
      </div>

      ${analysis.totalThreads === 0 ? `
        <div style="padding: 40px; text-align: center; color: #6b7280;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin: 0 auto 16px; opacity: 0.3;">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
          <p style="margin: 0; font-size: 16px;">No threads found in this chat</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.7;">
            Threads are created when you edit or regenerate messages
          </p>
        </div>
      ` : `
        <div id="threads-list" style="display: flex; flex-direction: column; gap: 16px;">
          ${analysis.threadsByMessage.map((msgInfo, idx) => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
              <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                  Message ${msgInfo.index} • ${msgInfo.role}
                </div>
                <div style="font-size: 14px; color: #374151; font-style: italic;">
                  "${msgInfo.content}${msgInfo.content.length >= 100 ? '...' : ''}"
                </div>
              </div>
              <div style="font-weight: 600; margin-bottom: 12px; color: #3b82f6;">
                ${msgInfo.threadCount} Thread${msgInfo.threadCount !== 1 ? 's' : ''}
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${msgInfo.threads.map((thread, threadIdx) => `
                  <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 6px;
                  ">
                    <div style="flex: 1; margin-right: 12px;">
                      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                        Created: ${new Date(thread.createdAt).toLocaleString()}
                      </div>
                      <div style="font-size: 13px; color: #374151;">
                        ${getThreadPreview(thread)}${getThreadPreview(thread).length >= 100 ? '...' : ''}
                      </div>
                      <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                        ${thread.messages?.length || 0} message(s) in this branch
                      </div>
                    </div>
                    <button
                      class="delete-thread-btn"
                      data-message-index="${msgInfo.index}"
                      data-thread-index="${threadIdx}"
                      style="
                        padding: 8px 16px;
                        background: #ef4444;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 13px;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: background 0.2s;
                      "
                      onmouseover="this.style.background='#dc2626'"
                      onmouseout="this.style.background='#ef4444'"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Backups</h3>
        <div id="backups-list" style="font-size: 13px; color: #6b7280;">
          Loading backups...
        </div>
      </div>
    `;

    modal.appendChild(content);

    // Setup event listeners
    setupModalEventListeners(modal, chat);

    // Load backups
    loadBackupsList(modal);

    return modal;
  }

  function setupModalEventListeners(modal, chat) {
    // Close button
    modal.querySelector('#close-thread-modal').addEventListener('click', () => {
      closeModal();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Flatten chat button
    const flattenButton = modal.querySelector('#flatten-chat-button');
    if (flattenButton) {
      flattenButton.addEventListener('click', async () => {
        const success = await flattenChat(state.currentChatID);
        if (success) {
          closeModal();
          // Optionally reload the page to reflect changes
          setTimeout(() => {
            if (confirm('Chat flattened! Reload page to see changes?')) {
              window.location.reload();
            }
          }, 500);
        }
      });
    }

    // Delete thread buttons
    modal.querySelectorAll('.delete-thread-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const messageIndex = parseInt(e.target.dataset.messageIndex);
        const threadIndex = parseInt(e.target.dataset.threadIndex);

        const confirmed = confirm(
          `Delete this thread?\n\n` +
          `This will permanently remove 1 thread variant.\n` +
          `A backup will be created automatically.\n\n` +
          `Continue?`
        );

        if (!confirmed) return;

        const success = await deleteThread(state.currentChatID, messageIndex, threadIndex);
        if (success) {
          // Refresh modal
          closeModal();
          setTimeout(() => showThreadManagerModal(), 100);
        }
      });
    });
  }

  function loadBackupsList(modal) {
    const backupsList = modal.querySelector('#backups-list');
    const backups = listBackups(state.currentChatID);

    if (backups.length === 0) {
      backupsList.innerHTML = 'No backups found';
    } else {
      backupsList.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${backups.slice(0, 5).map(backup => `
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px;
              background: #f9fafb;
              border-radius: 4px;
            ">
              <span>${new Date(backup.timestamp).toLocaleString()}</span>
              <button
                class="restore-backup-btn"
                data-backup-key="${backup.key}"
                style="
                  padding: 4px 12px;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                "
              >
                Restore
              </button>
            </div>
          `).join('')}
        </div>
      `;

      // Add restore listeners
      modal.querySelectorAll('.restore-backup-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const backupKey = e.target.dataset.backupKey;
          const confirmed = confirm('Restore this backup? Current chat will be replaced.');

          if (!confirmed) return;

          try {
            await restoreBackup(backupKey);
            closeModal();
            setTimeout(() => {
              if (confirm('Backup restored! Reload page to see changes?')) {
                window.location.reload();
              }
            }, 500);
          } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
          }
        });
      });
    }
  }

  function closeModal() {
    const modal = document.getElementById('chat-thread-manager-modal');
    if (modal) {
      modal.remove();
    }
    state.uiElements.modal = null;
  }

  // ============================================
  // Event Handlers
  // ============================================

  function setupEventListeners() {
    // Button click
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-element-id="workspace-tab-thread-manager"]')) {
        e.preventDefault();
        e.stopPropagation();
        showThreadManagerModal();
      }
    });

    // Keyboard shortcut (Ctrl+Shift+T)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        showThreadManagerModal();
      }
    });
  }

  // ============================================
  // UI Observers
  // ============================================

  function observeUIChanges() {
    const observer = new MutationObserver(() => {
      // Re-initialize UI if button is removed
      if (!document.querySelector('[data-element-id="workspace-tab-thread-manager"]')) {
        initializeUI();
      }
    });

    const workspaceBar = document.querySelector('[data-element-id="workspace-bar"]');
    if (workspaceBar) {
      observer.observe(workspaceBar, { childList: true, subtree: false });
    }
  }

  function observeChatChanges() {
    // Watch for URL hash changes (chat navigation)
    let lastHash = window.location.hash;

    setInterval(() => {
      if (window.location.hash !== lastHash) {
        lastHash = window.location.hash;
        state.currentChatID = null;
        state.currentChat = null;
      }
    }, 500);
  }

  // ============================================
  // Utilities
  // ============================================

  function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b'
    };

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${colors[type] || colors.info};
      color: white;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10001;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
      font-size: 14px;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // ============================================
  // Entry Point
  // ============================================

  if (document.readyState === 'complete') {
    setTimeout(init, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1000));
  }

  // Expose for debugging
  window.ChatThreadManager = {
    version: CONFIG.VERSION,
    getState: () => state,
    showModal: showThreadManagerModal,
    deleteThread,
    flattenChat,
    createBackup,
    restoreBackup,
    listBackups
  };

  console.log(`[${CONFIG.EXTENSION_NAME}] Loaded. Press Ctrl+Shift+T to open.`);

})();
