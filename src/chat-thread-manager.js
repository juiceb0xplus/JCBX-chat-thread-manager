/**
 * TypingMind Chat Thread Manager Extension
 * Version: 2.0.0
 *
 * Features:
 * - View all active messages in current chat
 * - Expand messages to see their thread variants
 * - Delete individual threads
 * - Flatten individual messages or entire chat
 * - Manual backup export (JSON download)
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
    VERSION: '2.0.0',
    DB_NAME: 'keyval-store',
    OBJECT_STORE: 'keyval'
  };

  // ============================================
  // State Management
  // ============================================

  const state = {
    currentChatID: null,
    currentChat: null,
    uiElements: {},
    isInitialized: false,
    expandedMessages: new Set() // Track which messages are expanded
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

    // Find and replace the SVG icon
    const svg = button.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('fill', 'currentColor');
      svg.innerHTML = `
        <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
        <circle cx="4" cy="4" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="8" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
      `;
    }

    // Find and replace the text label
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'Threads';
    }

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
  // Chat Analysis
  // ============================================

  function analyzeChat(chat) {
    if (!chat || !chat.messages) {
      return {
        totalMessages: 0,
        activeMessages: [],
        totalThreads: 0
      };
    }

    // Get all messages (active path)
    const activeMessages = chat.messages.map((msg, index) => {
      const threadCount = msg.threads?.length || 0;
      return {
        index,
        role: msg.role,
        uuid: msg.uuid,
        hasThreads: threadCount > 0,
        threadCount,
        threads: msg.threads || [],
        content: getMessagePreview(msg.content),
        fullContent: msg.content,
        timestamp: msg.createdAt || msg.timestamp
      };
    });

    const totalThreads = activeMessages.reduce((sum, msg) => sum + msg.threadCount, 0);

    return {
      totalMessages: activeMessages.length,
      activeMessages,
      totalThreads
    };
  }

  function getMessagePreview(content) {
    if (typeof content === 'string') {
      return content.substring(0, 150);
    }
    if (Array.isArray(content)) {
      const textContent = content.find(c => c.type === 'text');
      if (textContent) {
        return textContent.text.substring(0, 150);
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
  // Export/Import Operations
  // ============================================

  function exportChatAsJSON(chat, chatID) {
    try {
      const exportData = {
        version: CONFIG.VERSION,
        exportedAt: new Date().toISOString(),
        chatID: chatID,
        chatData: chat
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-backup-${chatID.replace('CHAT_', '')}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL
      setTimeout(() => URL.revokeObjectURL(url), 100);

      showNotification('Chat exported successfully!', 'success');
      console.log(`[${CONFIG.EXTENSION_NAME}] Chat exported`);
    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Error exporting chat:`, error);
      showNotification(`Export failed: ${error.message}`, 'error');
    }
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

  async function flattenMessage(chatID, messageIndex) {
    try {
      const chat = await getChat(chatID);

      if (!chat.messages[messageIndex] || !chat.messages[messageIndex].threads) {
        showNotification('No threads to remove from this message', 'info');
        return false;
      }

      const threadCount = chat.messages[messageIndex].threads.length;

      const confirmed = confirm(
        `Remove ${threadCount} thread(s) from this message?\n\n` +
        `This will keep only the active variant.\n\n` +
        `Continue?`
      );

      if (!confirmed) {
        return false;
      }

      // Remove threads from this message
      const updatedChat = { ...chat };
      updatedChat.messages = [...chat.messages];
      updatedChat.messages[messageIndex] = { ...chat.messages[messageIndex] };
      delete updatedChat.messages[messageIndex].threads;

      // Update timestamp
      updatedChat.updatedAt = new Date().toISOString();

      // Save
      await updateChat(chatID, updatedChat);

      showNotification(`Removed ${threadCount} thread(s) from message`, 'success');
      console.log(`[${CONFIG.EXTENSION_NAME}] Flattened message ${messageIndex}`);

      return true;
    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Error flattening message:`, error);
      showNotification(`Error: ${error.message}`, 'error');
      return false;
    }
  }

  async function flattenChat(chatID) {
    try {
      const chat = await getChat(chatID);

      // Count threads to be removed
      const analysis = analyzeChat(chat);
      if (analysis.totalThreads === 0) {
        showNotification('No threads to remove', 'info');
        return false;
      }

      const confirmed = confirm(
        `Remove ALL ${analysis.totalThreads} thread(s) from this chat?\n\n` +
        `Only the currently active conversation will remain.\n\n` +
        `Continue?`
      );

      if (!confirmed) {
        return false;
      }

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
        `Chat flattened! Removed ${analysis.totalThreads} thread(s).`,
        'success',
        5000
      );

      console.log(`[${CONFIG.EXTENSION_NAME}] Flattened chat ${chatID}`);

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

      // Analyze chat
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
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(8px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a1a;
      color: #e5e5e5;
      padding: 32px;
      border-radius: 16px;
      max-width: 900px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid #333;
    `;

    content.innerHTML = `
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          Thread Manager
        </h2>
        <button id="close-thread-modal" style="
          background: transparent;
          border: none;
          color: #999;
          font-size: 32px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          line-height: 1;
          transition: color 0.2s;
        " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#999'">&times;</button>
      </div>

      <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%); border-radius: 12px; border: 1px solid #333;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #fff;">Chat Overview</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
          <div style="background: #252525; padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Active Messages</div>
            <div style="font-size: 24px; font-weight: 700; color: #667eea;">${analysis.totalMessages}</div>
          </div>
          <div style="background: #252525; padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Total Threads</div>
            <div style="font-size: 24px; font-weight: 700; color: #764ba2;">${analysis.totalThreads}</div>
          </div>
          <div style="background: #252525; padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">With Variants</div>
            <div style="font-size: 24px; font-weight: 700; color: #48bb78;">${analysis.activeMessages.filter(m => m.hasThreads).length}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 24px; display: flex; gap: 12px;">
        <button id="export-chat-button" style="
          flex: 1;
          padding: 12px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(102, 126, 234, 0.4)'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(102, 126, 234, 0.3)'">
          💾 Export Chat as JSON
        </button>
        ${analysis.totalThreads > 0 ? `
          <button id="flatten-chat-button" style="
            flex: 1;
            padding: 12px 20px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(245, 87, 108, 0.3);
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(245, 87, 108, 0.4)'"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(245, 87, 108, 0.3)'">
            🗜️ Flatten Entire Chat
          </button>
        ` : ''}
      </div>

      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #fff;">Active Messages</h3>
        <p style="margin: 0; font-size: 13px; color: #999;">Click any message to expand and view its thread variants</p>
      </div>

      ${analysis.totalMessages === 0 ? `
        <div style="padding: 60px 20px; text-align: center; color: #666;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin: 0 auto 20px; opacity: 0.3;">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
          <p style="margin: 0; font-size: 16px; color: #999;">No messages found in this chat</p>
        </div>
      ` : `
        <div id="messages-list" style="display: flex; flex-direction: column; gap: 12px;">
          ${analysis.activeMessages.map((msg, idx) => createMessageCard(msg, idx)).join('')}
        </div>
      `}
    `;

    modal.appendChild(content);

    // Setup event listeners
    setupModalEventListeners(modal);

    return modal;
  }

  function createMessageCard(msg, idx) {
    const roleColors = {
      user: '#3b82f6',
      assistant: '#8b5cf6',
      system: '#10b981'
    };

    const roleColor = roleColors[msg.role] || '#6b7280';
    const isExpanded = state.expandedMessages.has(msg.index);

    return `
      <div style="
        border: 1px solid ${msg.hasThreads ? '#444' : '#2a2a2a'};
        border-radius: 12px;
        background: ${msg.hasThreads ? '#222' : '#1f1f1f'};
        overflow: hidden;
        transition: all 0.2s;
      ">
        <div
          class="message-header"
          data-message-index="${msg.index}"
          style="
            padding: 16px 20px;
            cursor: ${msg.hasThreads ? 'pointer' : 'default'};
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s;
          "
          ${msg.hasThreads ? `onmouseover="this.style.background='#2a2a2a'" onmouseout="this.style.background='transparent'"` : ''}
        >
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <span style="
                display: inline-block;
                padding: 4px 12px;
                background: ${roleColor}22;
                color: ${roleColor};
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">${msg.role}</span>
              <span style="font-size: 12px; color: #666;">Message ${msg.index + 1}</span>
              ${msg.hasThreads ? `
                <span style="
                  padding: 4px 10px;
                  background: #764ba222;
                  color: #764ba2;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 600;
                ">
                  ${msg.threadCount} variant${msg.threadCount !== 1 ? 's' : ''}
                </span>
              ` : ''}
            </div>
            <div style="
              font-size: 14px;
              color: #ccc;
              line-height: 1.5;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            ">${escapeHtml(msg.content)}${msg.content.length >= 150 ? '...' : ''}</div>
          </div>
          ${msg.hasThreads ? `
            <div style="margin-left: 16px; color: #666; font-size: 20px; transition: transform 0.2s; transform: rotate(${isExpanded ? '180deg' : '0deg'});">
              ▼
            </div>
          ` : ''}
        </div>
        ${msg.hasThreads && isExpanded ? `
          <div class="message-threads" style="
            border-top: 1px solid #333;
            padding: 16px 20px;
            background: #1a1a1a;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #999;">Thread Variants</h4>
              ${msg.threadCount > 0 ? `
                <button
                  class="flatten-message-btn"
                  data-message-index="${msg.index}"
                  style="
                    padding: 6px 14px;
                    background: #f5576c22;
                    color: #f5576c;
                    border: 1px solid #f5576c44;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                  "
                  onmouseover="this.style.background='#f5576c33'; this.style.borderColor='#f5576c'"
                  onmouseout="this.style.background='#f5576c22'; this.style.borderColor='#f5576c44'"
                >
                  Flatten Message
                </button>
              ` : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${msg.threads.map((thread, threadIdx) => `
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 14px;
                  background: #252525;
                  border: 1px solid #333;
                  border-radius: 8px;
                  transition: all 0.2s;
                " onmouseover="this.style.borderColor='#444'" onmouseout="this.style.borderColor='#333'">
                  <div style="flex: 1; margin-right: 16px; min-width: 0;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 6px;">
                      Created: ${new Date(thread.createdAt).toLocaleString()} • ${thread.messages?.length || 0} message(s)
                    </div>
                    <div style="
                      font-size: 13px;
                      color: #aaa;
                      line-height: 1.4;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      display: -webkit-box;
                      -webkit-line-clamp: 2;
                      -webkit-box-orient: vertical;
                    ">${escapeHtml(getThreadPreview(thread))}</div>
                  </div>
                  <button
                    class="delete-thread-btn"
                    data-message-index="${msg.index}"
                    data-thread-index="${threadIdx}"
                    style="
                      padding: 8px 16px;
                      background: #ef444422;
                      color: #ef4444;
                      border: 1px solid #ef444444;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 600;
                      cursor: pointer;
                      white-space: nowrap;
                      transition: all 0.2s;
                    "
                    onmouseover="this.style.background='#ef4444'; this.style.color='white'; this.style.borderColor='#ef4444'"
                    onmouseout="this.style.background='#ef444422'; this.style.color='#ef4444'; this.style.borderColor='#ef444444'"
                  >
                    🗑️ Delete
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function setupModalEventListeners(modal) {
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

    // Export button
    const exportButton = modal.querySelector('#export-chat-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        exportChatAsJSON(state.currentChat, state.currentChatID);
      });
    }

    // Flatten chat button
    const flattenButton = modal.querySelector('#flatten-chat-button');
    if (flattenButton) {
      flattenButton.addEventListener('click', async () => {
        const success = await flattenChat(state.currentChatID);
        if (success) {
          closeModal();
          setTimeout(() => {
            if (confirm('Chat flattened! Reload page to see changes?')) {
              window.location.reload();
            }
          }, 500);
        }
      });
    }

    // Message expand/collapse
    modal.querySelectorAll('.message-header').forEach(header => {
      const messageIndex = parseInt(header.dataset.messageIndex);
      const analysis = analyzeChat(state.currentChat);
      const msg = analysis.activeMessages.find(m => m.index === messageIndex);

      if (msg && msg.hasThreads) {
        header.addEventListener('click', () => {
          if (state.expandedMessages.has(messageIndex)) {
            state.expandedMessages.delete(messageIndex);
          } else {
            state.expandedMessages.add(messageIndex);
          }
          // Refresh modal
          closeModal();
          setTimeout(() => showThreadManagerModal(), 50);
        });
      }
    });

    // Flatten message buttons
    modal.querySelectorAll('.flatten-message-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent message expansion
        const messageIndex = parseInt(e.target.dataset.messageIndex);

        const success = await flattenMessage(state.currentChatID, messageIndex);
        if (success) {
          closeModal();
          setTimeout(() => showThreadManagerModal(), 100);
        }
      });
    });

    // Delete thread buttons
    modal.querySelectorAll('.delete-thread-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent message expansion
        const messageIndex = parseInt(e.target.dataset.messageIndex);
        const threadIndex = parseInt(e.target.dataset.threadIndex);

        const confirmed = confirm(
          'Delete this thread variant?\n\n' +
          'This action cannot be undone.\n\n' +
          'Continue?'
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

  function closeModal() {
    const modal = document.getElementById('chat-thread-manager-modal');
    if (modal) {
      modal.remove();
    }
    state.uiElements.modal = null;
    // Don't clear expandedMessages - let it persist across modal refreshes
    // It will be cleared when navigating to a different chat (see observeChatChanges)
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
        state.expandedMessages.clear();
      }
    }, 500);
  }

  // ============================================
  // Utilities
  // ============================================

  function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    const colors = {
      info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      success: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
      error: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      warning: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'
    };

    notification.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 16px 24px;
      background: ${colors[type] || colors.info};
      color: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      max-width: 400px;
      animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      font-size: 14px;
      font-weight: 500;
      backdrop-filter: blur(10px);
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
        transform: translateX(450px) scale(0.8);
        opacity: 0;
      }
      to {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
      to {
        transform: translateX(450px) scale(0.8);
        opacity: 0;
      }
    }

    /* Custom scrollbar for modal */
    #chat-thread-manager-modal ::-webkit-scrollbar {
      width: 8px;
    }

    #chat-thread-manager-modal ::-webkit-scrollbar-track {
      background: #1a1a1a;
      border-radius: 4px;
    }

    #chat-thread-manager-modal ::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 4px;
    }

    #chat-thread-manager-modal ::-webkit-scrollbar-thumb:hover {
      background: #555;
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
    flattenMessage,
    exportChat: exportChatAsJSON
  };

  console.log(`[${CONFIG.EXTENSION_NAME}] Loaded. Press Ctrl+Shift+T to open.`);

})();
