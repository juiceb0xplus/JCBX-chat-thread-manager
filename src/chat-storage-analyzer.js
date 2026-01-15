/**
 * TypingMind Chat Storage Analyzer Extension
 * Version: 1.1.0
 *
 * Features:
 * - Scan all stored chats to analyze storage usage
 * - Display chats sorted by size (largest first)
 * - Show thread count per chat
 * - Configurable size cutoff filter
 * - Batch flatten selected chats to reduce storage
 * - Automatic backups before destructive operations
 *
 * v1.1.0 Changes:
 * - Fixed critical data corruption bug (shallow copy -> deep clone)
 * - Added validation before saving flattened chats
 * - Improved null/undefined handling throughout
 * - Better error messages and recovery guidance
 * - Optimized size calculations (removed unnecessary Blob creation)
 * - Fixed memory leak in MutationObserver
 * - Added edge case handling in formatBytes
 * - Comprehensive thread cleanup (images, attachments, metadata)
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
    EXTENSION_NAME: 'ChatStorageAnalyzer',
    VERSION: '1.1.0',
    DB_NAME: 'keyval-store',
    OBJECT_STORE: 'keyval',
    BACKUP_PREFIX: 'CSA_BACKUP_',
    MAX_BACKUPS: 10,
    DEFAULT_CUTOFF_KB: 100, // Default minimum size to show (in KB)
    BATCH_DELAY: 100 // Delay between batch operations (ms)
  };

  // ============================================
  // State Management
  // ============================================

  const state = {
    chats: [],
    selectedChats: new Set(),
    isScanning: false,
    cutoffKB: CONFIG.DEFAULT_CUTOFF_KB,
    sortBy: 'size', // 'size' or 'threads'
    sortOrder: 'desc',
    uiElements: {},
    uiObserver: null,
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
    if (document.querySelector('[data-element-id="workspace-tab-storage-analyzer"]')) {
      return;
    }

    // Create storage analyzer button
    const button = createAnalyzerButton();
    settingsButton.parentNode.insertBefore(button, settingsButton.nextSibling);

    state.uiElements.button = button;

    console.log(`[${CONFIG.EXTENSION_NAME}] UI initialized`);
  }

  function createAnalyzerButton() {
    const settingsButton = document.querySelector('[data-element-id="workspace-tab-settings"]');
    const button = settingsButton.cloneNode(true);

    button.setAttribute('data-element-id', 'workspace-tab-storage-analyzer');
    button.title = 'Chat Storage Analyzer';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="8" width="3" height="7" rx="0.5"/>
        <rect x="5" y="5" width="3" height="10" rx="0.5"/>
        <rect x="9" y="2" width="3" height="13" rx="0.5"/>
        <rect x="13" y="6" width="2" height="9" rx="0.5"/>
        <circle cx="12" cy="3" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <span style="margin-left: 8px;">Storage</span>
    `;

    return button;
  }

  // ============================================
  // Data Access Layer
  // ============================================

  async function getAllChats() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME);

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([CONFIG.OBJECT_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.OBJECT_STORE);
        const getAllRequest = objectStore.getAllKeys();

        getAllRequest.onsuccess = async () => {
          const keys = getAllRequest.result.filter(key =>
            typeof key === 'string' && key.startsWith('CHAT_')
          );

          const chats = [];
          for (const key of keys) {
            try {
              const chat = await getChat(key);
              if (chat) {
                chats.push({ id: key, data: chat });
              }
            } catch (e) {
              console.warn(`[${CONFIG.EXTENSION_NAME}] Failed to load chat ${key}:`, e);
            }
          }

          resolve(chats);
        };

        getAllRequest.onerror = () => reject(getAllRequest.error);
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

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
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
    // Handle null/undefined chat gracefully
    if (!chat || typeof chat !== 'object') {
      return {
        sizeBytes: 0,
        sizeKB: 0,
        sizeMB: 0,
        totalMessages: 0,
        totalThreads: 0,
        messagesWithThreads: 0,
        threadMessages: 0,
        estimatedThreadSizeBytes: 0,
        estimatedSavingsPercent: 0,
        title: 'Invalid Chat',
        createdAt: null,
        updatedAt: null
      };
    }

    const chatString = JSON.stringify(chat);
    const sizeBytes = chatString.length; // More efficient than Blob

    let totalMessages = 0;
    let totalThreads = 0;
    let messagesWithThreads = 0;
    let threadMessages = 0;

    if (chat.messages && Array.isArray(chat.messages)) {
      totalMessages = chat.messages.length;

      chat.messages.forEach(msg => {
        // Skip null/undefined messages
        if (!msg || typeof msg !== 'object') return;

        if (msg.threads && Array.isArray(msg.threads) && msg.threads.length > 0) {
          messagesWithThreads++;
          totalThreads += msg.threads.length;

          // Count messages within threads
          msg.threads.forEach(thread => {
            if (thread && thread.messages && Array.isArray(thread.messages)) {
              threadMessages += thread.messages.length;
            }
          });
        }
      });
    }

    // Estimate size savings from flattening
    const estimatedThreadSize = calculateThreadSize(chat);

    return {
      sizeBytes,
      sizeKB: sizeBytes / 1024,
      sizeMB: sizeBytes / (1024 * 1024),
      totalMessages,
      totalThreads,
      messagesWithThreads,
      threadMessages,
      estimatedThreadSizeBytes: estimatedThreadSize,
      estimatedSavingsPercent: sizeBytes > 0 ? (estimatedThreadSize / sizeBytes * 100) : 0,
      title: chat.chatTitle || chat.title || chat.name || 'Untitled Chat',
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    };
  }

  function calculateThreadSize(chat) {
    if (!chat || !chat.messages || !Array.isArray(chat.messages)) return 0;

    let threadSize = 0;
    chat.messages.forEach(msg => {
      // Skip null/undefined messages
      if (!msg || typeof msg !== 'object') return;

      if (msg.threads && Array.isArray(msg.threads)) {
        // Use string length instead of Blob for efficiency
        threadSize += JSON.stringify(msg.threads).length;
      }
    });

    return threadSize;
  }

  async function scanAllChats() {
    state.isScanning = true;
    updateScanButton(true);

    try {
      const rawChats = await getAllChats();

      state.chats = rawChats.map(({ id, data }) => {
        const analysis = analyzeChat(data);
        return {
          id,
          ...analysis
        };
      });

      // Sort by size (largest first) by default
      sortChats();

      console.log(`[${CONFIG.EXTENSION_NAME}] Scanned ${state.chats.length} chats`);
      showNotification(`Scanned ${state.chats.length} chats`, 'success');

    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Scan error:`, error);
      showNotification(`Scan failed: ${error.message}`, 'error');
    } finally {
      state.isScanning = false;
      updateScanButton(false);
      renderChatList();
    }
  }

  function sortChats() {
    state.chats.sort((a, b) => {
      let valueA, valueB;

      if (state.sortBy === 'size') {
        valueA = a.sizeBytes;
        valueB = b.sizeBytes;
      } else if (state.sortBy === 'threads') {
        valueA = a.totalThreads;
        valueB = b.totalThreads;
      } else if (state.sortBy === 'messages') {
        valueA = a.totalMessages;
        valueB = b.totalMessages;
      }

      return state.sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });
  }

  function getFilteredChats() {
    return state.chats.filter(chat => chat.sizeKB >= state.cutoffKB);
  }

  // ============================================
  // Validation Helpers
  // ============================================

  /**
   * Validates that a chat object has the minimum required structure.
   * Conservative validation to avoid corrupting data.
   */
  function validateChatStructure(chat) {
    if (!chat || typeof chat !== 'object') {
      return { valid: false, reason: 'Chat is null or not an object' };
    }
    if (!Array.isArray(chat.messages)) {
      return { valid: false, reason: 'Chat messages is not an array' };
    }
    return { valid: true };
  }

  // ============================================
  // Backup System
  // ============================================

  async function createBackup(chatID, chat) {
    const backup = {
      chatID,
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(chat))
    };

    const backupKey = `${CONFIG.BACKUP_PREFIX}${chatID}_${Date.now()}`;

    try {
      localStorage.setItem(backupKey, JSON.stringify(backup));
      cleanOldBackups(chatID);
      console.log(`[${CONFIG.EXTENSION_NAME}] Backup created: ${backupKey}`);
      return backupKey;
    } catch (e) {
      // localStorage might be full
      console.warn(`[${CONFIG.EXTENSION_NAME}] Could not save backup to localStorage:`, e);
      // Store in memory as fallback
      window._csaBackups = window._csaBackups || {};
      window._csaBackups[backupKey] = backup;
      // Warn user that backup is only in memory
      showNotification(
        'Warning: Backup saved to memory only (localStorage full). It will be lost on page refresh.',
        'warning',
        5000
      );
      return backupKey;
    }
  }

  function cleanOldBackups(chatID) {
    const backups = Object.keys(localStorage)
      .filter(key => key.startsWith(`${CONFIG.BACKUP_PREFIX}${chatID}_`))
      .sort()
      .reverse();

    backups.slice(CONFIG.MAX_BACKUPS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  function listAllBackups() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(CONFIG.BACKUP_PREFIX))
      .map(key => {
        try {
          const backup = JSON.parse(localStorage.getItem(key));
          return {
            key,
            chatID: backup.chatID,
            timestamp: backup.timestamp,
            title: backup.data?.chatTitle || backup.data?.title || 'Untitled'
          };
        } catch (e) {
          return null;
        }
      })
      .filter(b => b !== null)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async function restoreFromBackup(backupKey) {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      throw new Error('Backup not found');
    }

    const backup = JSON.parse(backupData);

    // Validate backup structure before restoring
    if (!backup || !backup.data || !backup.chatID) {
      throw new Error('Invalid backup format');
    }

    const validation = validateChatStructure(backup.data);
    if (!validation.valid) {
      throw new Error(`Backup data is corrupted: ${validation.reason}`);
    }

    // The backup.data contains the raw chat object - directly compatible with TypingMind
    await updateChat(backup.chatID, backup.data);

    // Inform user they may need to refresh to see changes
    showNotification(
      'Backup restored. Refresh the page or switch chats to see changes.',
      'success',
      5000
    );
    console.log(`[${CONFIG.EXTENSION_NAME}] Restored backup: ${backupKey}`);
  }

  function deleteBackup(backupKey) {
    try {
      localStorage.removeItem(backupKey);
      console.log(`[${CONFIG.EXTENSION_NAME}] Deleted backup: ${backupKey}`);
      return true;
    } catch (e) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Failed to delete backup:`, e);
      return false;
    }
  }

  function clearAllBackups() {
    const backups = listAllBackups();
    let deletedCount = 0;

    backups.forEach(backup => {
      try {
        localStorage.removeItem(backup.key);
        deletedCount++;
      } catch (e) {
        console.warn(`[${CONFIG.EXTENSION_NAME}] Failed to delete backup ${backup.key}:`, e);
      }
    });

    // Also clear in-memory backups
    if (window._csaBackups) {
      window._csaBackups = {};
    }

    console.log(`[${CONFIG.EXTENSION_NAME}] Cleared ${deletedCount} backups`);
    return deletedCount;
  }

  // ============================================
  // Export System (TypingMind Compatible)
  // ============================================

  /**
   * Export selected chats as a TypingMind-compatible JSON file.
   * The exported format can be directly imported into TypingMind.
   */
  async function exportSelectedChats() {
    const selectedIds = Array.from(state.selectedChats);

    if (selectedIds.length === 0) {
      showNotification('No chats selected for export', 'warning');
      return;
    }

    try {
      const chatsToExport = [];

      for (const chatID of selectedIds) {
        const chat = await getChat(chatID);
        if (chat) {
          // Export the RAW chat object - this is TypingMind compatible
          chatsToExport.push(chat);
        }
      }

      if (chatsToExport.length === 0) {
        showNotification('No chats found to export', 'error');
        return;
      }

      // Create export data structure
      // TypingMind expects { data: { chats: [...] } } format for imports
      const exportData = {
        data: {
          chats: chatsToExport
        }
      };

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `typingmind-backup-${chatsToExport.length}-chats-${timestamp}.json`;

      // Download file
      downloadJSON(exportData, filename);

      showNotification(`Exported ${chatsToExport.length} chat(s) successfully`, 'success');
      console.log(`[${CONFIG.EXTENSION_NAME}] Exported ${chatsToExport.length} chats to ${filename}`);

    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Export error:`, error);
      showNotification(`Export failed: ${error.message}`, 'error');
    }
  }

  /**
   * Export a backup from localStorage as a TypingMind-compatible file
   */
  function exportBackupToFile(backupKey) {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      showNotification('Backup not found', 'error');
      return;
    }

    try {
      const backup = JSON.parse(backupData);

      // Export in TypingMind-compatible format { data: { chats: [...] } }
      const chatData = backup.data;
      const exportData = {
        data: {
          chats: [chatData]
        }
      };

      const timestamp = new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-');
      const title = (chatData.chatTitle || chatData.title || 'untitled').replace(/[^a-z0-9]/gi, '-').substring(0, 30);
      const filename = `typingmind-chat-${title}-${timestamp}.json`;

      downloadJSON(exportData, filename);

      showNotification('Backup exported successfully', 'success');
    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Export backup error:`, error);
      showNotification(`Export failed: ${error.message}`, 'error');
    }
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // ============================================
  // Flatten Operations
  // ============================================

  /**
   * Recursively removes all thread-related data from a message.
   * This ensures images and other content within threads are fully cleaned.
   */
  function cleanMessageThreadData(msg) {
    if (!msg || typeof msg !== 'object') return msg;

    // Remove primary threads array (contains all thread messages with their images)
    if ('threads' in msg) {
      delete msg.threads;
    }

    // Remove any thread-related metadata that might reference deleted content
    // These are potential property names TypingMind might use
    const threadRelatedProps = [
      'threadId',
      'threadIndex',
      'activeThreadIndex',
      'selectedThreadIndex',
      'parentThreadId',
      'branchId',
      'branchIndex',
      'threadAttachments',
      'threadImages',
      'threadFiles'
    ];

    threadRelatedProps.forEach(prop => {
      if (prop in msg) {
        delete msg[prop];
      }
    });

    // If message has nested content array (multimodal), ensure no thread refs there
    if (Array.isArray(msg.content)) {
      msg.content = msg.content.map(part => {
        if (part && typeof part === 'object') {
          // Remove any thread references from content parts
          if ('threadId' in part) delete part.threadId;
          if ('fromThread' in part) delete part.fromThread;
        }
        return part;
      });
    }

    return msg;
  }

  /**
   * Flattens a chat by removing all thread data including images.
   * Uses deep clone to prevent reference issues.
   * Creates automatic backup before modification.
   */
  async function flattenChat(chatID) {
    let backupKey = null;

    try {
      const chat = await getChat(chatID);
      if (!chat) {
        throw new Error(`Chat ${chatID} not found`);
      }

      // Validate chat structure before processing
      const validation = validateChatStructure(chat);
      if (!validation.valid) {
        throw new Error(`Invalid chat structure: ${validation.reason}`);
      }

      // Check if there are any threads to remove
      const analysis = analyzeChat(chat);
      if (analysis.totalThreads === 0) {
        return { success: true, threadsRemoved: 0, bytesSaved: 0 };
      }

      // Create backup and store key for potential rollback
      backupKey = await createBackup(chatID, chat);

      // Stringify once for efficiency - reuse for size and clone
      const chatString = JSON.stringify(chat);
      const sizeBefore = chatString.length;

      // CRITICAL: Deep clone to prevent reference issues
      // This ensures we don't accidentally mutate the original or backup
      const flattenedChat = JSON.parse(chatString);

      // Remove threads and all thread-related data from all messages
      // This includes images, attachments, and any metadata within threads
      flattenedChat.messages = flattenedChat.messages.map(msg => {
        return cleanMessageThreadData(msg);
      });

      // Also clean any chat-level thread metadata
      const chatLevelThreadProps = [
        'activeThreads',
        'threadHistory',
        'threadMetadata'
      ];
      chatLevelThreadProps.forEach(prop => {
        if (prop in flattenedChat) {
          delete flattenedChat[prop];
        }
      });

      // Update timestamp to track when flattening occurred
      flattenedChat.updatedAt = new Date().toISOString();

      // Validate the flattened result before saving
      const postValidation = validateChatStructure(flattenedChat);
      if (!postValidation.valid) {
        throw new Error(`Flattened chat failed validation: ${postValidation.reason}`);
      }

      // Calculate size after
      const sizeAfter = JSON.stringify(flattenedChat).length;

      // Save the flattened chat
      await updateChat(chatID, flattenedChat);

      return {
        success: true,
        threadsRemoved: analysis.totalThreads,
        bytesSaved: sizeBefore - sizeAfter
      };

    } catch (error) {
      console.error(`[${CONFIG.EXTENSION_NAME}] Error flattening chat ${chatID}:`, error);

      // If we created a backup but failed to save, inform user
      if (backupKey) {
        console.log(`[${CONFIG.EXTENSION_NAME}] Backup available at: ${backupKey}`);
      }

      return { success: false, error: error.message, backupKey };
    }
  }

  async function flattenSelectedChats() {
    const selectedIds = Array.from(state.selectedChats);

    if (selectedIds.length === 0) {
      showNotification('No chats selected', 'warning');
      return;
    }

    // Calculate total threads to be removed
    const selectedChats = state.chats.filter(c => state.selectedChats.has(c.id));
    const totalThreads = selectedChats.reduce((sum, c) => sum + c.totalThreads, 0);
    const estimatedSavings = selectedChats.reduce((sum, c) => sum + c.estimatedThreadSizeBytes, 0);

    if (totalThreads === 0) {
      showNotification('Selected chats have no threads to remove', 'info');
      return;
    }

    // Confirm with user
    const confirmed = confirm(
      `Flatten ${selectedIds.length} chat(s)?\n\n` +
      `This will permanently remove ${totalThreads} thread(s).\n` +
      `Estimated space savings: ${formatBytes(estimatedSavings)}\n\n` +
      `Backups will be created automatically.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    // Show progress
    const progressModal = showProgressModal(selectedIds.length);
    let processed = 0;
    let totalRemoved = 0;
    let totalSaved = 0;
    let errors = [];

    for (const chatID of selectedIds) {
      try {
        const result = await flattenChat(chatID);

        if (result.success) {
          totalRemoved += result.threadsRemoved;
          totalSaved += result.bytesSaved;
        } else {
          errors.push({ chatID, error: result.error });
        }
      } catch (e) {
        errors.push({ chatID, error: e.message });
      }

      processed++;
      updateProgressModal(progressModal, processed, selectedIds.length);

      // Small delay to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
    }

    closeProgressModal(progressModal);

    // Clear selection
    state.selectedChats.clear();

    // Rescan to update the list
    await scanAllChats();

    // Show results
    if (errors.length === 0) {
      showNotification(
        `Successfully flattened ${selectedIds.length} chats. ` +
        `Removed ${totalRemoved} threads, saved ${formatBytes(totalSaved)}`,
        'success',
        5000
      );
    } else {
      showNotification(
        `Flattened ${selectedIds.length - errors.length}/${selectedIds.length} chats. ` +
        `${errors.length} errors occurred.`,
        'warning',
        5000
      );
    }
  }

  // ============================================
  // UI: Main Modal
  // ============================================

  function showStorageAnalyzerModal() {
    // Remove existing modal if any
    closeModal();

    const modal = document.createElement('div');
    modal.id = 'chat-storage-analyzer-modal';
    modal.className = 'csa-overlay';

    const content = document.createElement('div');
    content.className = 'csa-modal';

    content.innerHTML = getModalHTML();
    modal.appendChild(content);
    document.body.appendChild(modal);

    state.uiElements.modal = modal;

    setupModalEventListeners(modal);

    // Auto-scan if no data
    if (state.chats.length === 0) {
      scanAllChats();
    } else {
      renderChatList();
    }
  }

  function getModalHTML() {
    const totalSize = state.chats.reduce((sum, c) => sum + c.sizeBytes, 0);
    const totalThreads = state.chats.reduce((sum, c) => sum + c.totalThreads, 0);
    const filteredChats = getFilteredChats();

    return `
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600;">
          <span style="margin-right: 8px;">📊</span>
          Chat Storage Analyzer
        </h2>
        <button id="close-storage-modal" style="
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
        ">&times;</button>
      </div>

      <!-- Summary Stats -->
      <div style="margin-bottom: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Storage Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Chats</div>
            <div style="font-size: 20px; font-weight: 600;" id="stat-total-chats">${state.chats.length}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Size</div>
            <div style="font-size: 20px; font-weight: 600; color: #3b82f6;" id="stat-total-size">${formatBytes(totalSize)}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Threads</div>
            <div style="font-size: 20px; font-weight: 600; color: #8b5cf6;" id="stat-total-threads">${totalThreads}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Showing</div>
            <div style="font-size: 20px; font-weight: 600;" id="stat-showing">${filteredChats.length} chats</div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div style="margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
        <button id="scan-chats-btn" style="
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <span id="scan-icon">🔍</span>
          <span id="scan-text">Scan Chats</span>
        </button>

        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 14px; color: #374151;">Min Size:</label>
          <input type="number" id="cutoff-input" value="${state.cutoffKB}" min="0" step="10" style="
            width: 80px;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
          ">
          <span style="font-size: 14px; color: #6b7280;">KB</span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 14px; color: #374151;">Sort by:</label>
          <select id="sort-select" style="
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
          ">
            <option value="size" ${state.sortBy === 'size' ? 'selected' : ''}>Size</option>
            <option value="threads" ${state.sortBy === 'threads' ? 'selected' : ''}>Threads</option>
            <option value="messages" ${state.sortBy === 'messages' ? 'selected' : ''}>Messages</option>
          </select>
        </div>

        <button id="export-selected-btn" style="
          padding: 10px 20px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-left: auto;
          opacity: 0.5;
        " disabled>
          📥 Export (<span id="export-count">0</span>)
        </button>

        <button id="flatten-selected-btn" style="
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          opacity: 0.5;
        " disabled>
          🗜️ Flatten (<span id="selected-count">0</span>)
        </button>
      </div>

      <!-- Selection Controls -->
      <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
        <button id="select-all-btn" style="
          padding: 6px 12px;
          background: #e5e7eb;
          color: #374151;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        ">Select All Visible</button>
        <button id="select-none-btn" style="
          padding: 6px 12px;
          background: #e5e7eb;
          color: #374151;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        ">Deselect All</button>
        <button id="select-with-threads-btn" style="
          padding: 6px 12px;
          background: #e5e7eb;
          color: #374151;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        ">Select With Threads</button>
      </div>

      <!-- Chat List -->
      <div id="chat-list-container" style="
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        max-height: 400px;
        overflow-y: auto;
      ">
        <div style="padding: 40px; text-align: center; color: #6b7280;">
          Click "Scan Chats" to analyze your chat storage
        </div>
      </div>

      <!-- Backups Section -->
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">💾 Backups</h3>
          <div style="display: flex; gap: 8px;">
            <button id="clear-all-backups-btn" style="
              padding: 4px 12px;
              background: rgba(239, 68, 68, 0.1);
              color: #ef4444;
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
            ">🗑️ Clear All</button>
            <button id="toggle-backups-btn" style="
              padding: 4px 12px;
              background: #e5e7eb;
              color: #374151;
              border: none;
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
            ">Show Backups</button>
          </div>
        </div>
        <div id="backups-container" style="display: none;">
          <div id="backups-list" style="font-size: 13px; color: #6b7280;">
            Loading backups...
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <strong>Tip:</strong> Threads are created when you edit or regenerate messages.
        Flattening removes alternate conversation branches while keeping the main thread.
        Backups are created automatically before any changes.
        <br><br>
        <strong>Export:</strong> Exported files are in TypingMind-compatible JSON format and can be imported directly.
      </div>
    `;
  }

  function renderChatList() {
    const container = document.getElementById('chat-list-container');
    if (!container) return;

    const filteredChats = getFilteredChats();

    // Update stats
    const totalSize = state.chats.reduce((sum, c) => sum + c.sizeBytes, 0);
    const totalThreads = state.chats.reduce((sum, c) => sum + c.totalThreads, 0);

    const statTotalChats = document.getElementById('stat-total-chats');
    const statTotalSize = document.getElementById('stat-total-size');
    const statTotalThreads = document.getElementById('stat-total-threads');
    const statShowing = document.getElementById('stat-showing');

    if (statTotalChats) statTotalChats.textContent = state.chats.length;
    if (statTotalSize) statTotalSize.textContent = formatBytes(totalSize);
    if (statTotalThreads) statTotalThreads.textContent = totalThreads;
    if (statShowing) statShowing.textContent = `${filteredChats.length} chats`;

    if (filteredChats.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #6b7280;">
          ${state.chats.length === 0
            ? 'No chats found. Click "Scan Chats" to analyze your storage.'
            : `No chats above ${state.cutoffKB} KB threshold. Try lowering the minimum size filter.`
          }
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="position: sticky; top: 0; background: #f9fafb;">
          <tr>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; width: 40px;">
              <input type="checkbox" id="select-all-checkbox" style="cursor: pointer;">
            </th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Chat Title</th>
            <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; width: 100px;">Size</th>
            <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; width: 80px;">Messages</th>
            <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; width: 80px;">Threads</th>
            <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; width: 100px;">Savings</th>
          </tr>
        </thead>
        <tbody>
          ${filteredChats.map((chat, idx) => `
            <tr style="
              background: ${state.selectedChats.has(chat.id) ? '#eff6ff' : (idx % 2 === 0 ? '#ffffff' : '#f9fafb')};
              cursor: pointer;
            " class="chat-row" data-chat-id="${chat.id}">
              <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">
                <input type="checkbox" class="chat-checkbox" data-chat-id="${chat.id}"
                  ${state.selectedChats.has(chat.id) ? 'checked' : ''} style="cursor: pointer;">
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 500; color: #111827; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(chat.title)}
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                  ${chat.updatedAt ? `Updated: ${new Date(chat.updatedAt).toLocaleDateString()}` : 'No date'}
                </div>
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #3b82f6;">
                ${formatBytes(chat.sizeBytes)}
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                ${chat.totalMessages}
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                ${chat.totalThreads > 0
                  ? `<span style="background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">${chat.totalThreads}</span>`
                  : `<span style="color: #9ca3af;">0</span>`
                }
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px;">
                ${chat.estimatedSavingsPercent > 0
                  ? `<span style="color: #10b981;">~${chat.estimatedSavingsPercent.toFixed(1)}%</span>`
                  : '<span style="color: #9ca3af;">-</span>'
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Use event delegation for better performance and to avoid listener leaks
    container.onclick = (e) => {
      const row = e.target.closest('.chat-row');
      const checkbox = e.target.closest('.chat-checkbox');
      const selectAllCheckbox = e.target.closest('#select-all-checkbox');

      if (selectAllCheckbox) {
        filteredChats.forEach(chat => {
          if (selectAllCheckbox.checked) {
            state.selectedChats.add(chat.id);
          } else {
            state.selectedChats.delete(chat.id);
          }
        });
        renderChatList();
        updateFlattenButton();
        return;
      }

      if (checkbox) {
        handleCheckboxChange(checkbox);
        return;
      }

      if (row) {
        const rowCheckbox = row.querySelector('.chat-checkbox');
        if (rowCheckbox) {
          rowCheckbox.checked = !rowCheckbox.checked;
          handleCheckboxChange(rowCheckbox);
        }
      }
    };

    // Update select-all checkbox state
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = filteredChats.length > 0 && filteredChats.every(c => state.selectedChats.has(c.id));
    }
  }

  function handleCheckboxChange(checkbox) {
    const chatId = checkbox.dataset.chatId;
    if (checkbox.checked) {
      state.selectedChats.add(chatId);
    } else {
      state.selectedChats.delete(chatId);
    }
    updateFlattenButton();

    // Update row background
    const row = checkbox.closest('.chat-row');
    if (row) {
      row.style.background = checkbox.checked ? '#eff6ff' : '';
    }
  }

  function updateFlattenButton() {
    const btn = document.getElementById('flatten-selected-btn');
    const countSpan = document.getElementById('selected-count');
    const exportBtn = document.getElementById('export-selected-btn');
    const exportCountSpan = document.getElementById('export-count');

    const count = state.selectedChats.size;

    if (btn && countSpan) {
      countSpan.textContent = count;
      btn.disabled = count === 0;
      btn.style.opacity = count === 0 ? '0.5' : '1';
    }

    if (exportBtn && exportCountSpan) {
      exportCountSpan.textContent = count;
      exportBtn.disabled = count === 0;
      exportBtn.style.opacity = count === 0 ? '0.5' : '1';
    }
  }

  function updateScanButton(isScanning) {
    const icon = document.getElementById('scan-icon');
    const text = document.getElementById('scan-text');
    const btn = document.getElementById('scan-chats-btn');

    if (icon && text && btn) {
      if (isScanning) {
        icon.textContent = '⏳';
        text.textContent = 'Scanning...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
      } else {
        icon.textContent = '🔍';
        text.textContent = 'Scan Chats';
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }
  }

  // ============================================
  // Progress Modal
  // ============================================

  function showProgressModal(total) {
    const modal = document.createElement('div');
    modal.id = 'progress-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 32px;
        border-radius: 12px;
        text-align: center;
        min-width: 300px;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">🗜️</div>
        <h3 style="margin: 0 0 16px 0;">Flattening Chats</h3>
        <div style="margin-bottom: 16px;">
          <div style="
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          ">
            <div id="progress-bar" style="
              height: 100%;
              background: #3b82f6;
              width: 0%;
              transition: width 0.3s;
            "></div>
          </div>
        </div>
        <div id="progress-text" style="font-size: 14px; color: #6b7280;">
          0 / ${total} chats processed
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function updateProgressModal(modal, current, total) {
    if (!modal) return;

    const bar = modal.querySelector('#progress-bar');
    const text = modal.querySelector('#progress-text');

    if (bar) bar.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total} chats processed`;
  }

  function closeProgressModal(modal) {
    if (modal) modal.remove();
  }

  // ============================================
  // Event Handlers
  // ============================================

  function setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-element-id="workspace-tab-storage-analyzer"]')) {
        e.preventDefault();
        e.stopPropagation();
        showStorageAnalyzerModal();
      }
    });

    // Keyboard shortcut (Ctrl+Shift+S)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        showStorageAnalyzerModal();
      }
    });
  }

  function setupModalEventListeners(modal) {
    // Close button
    modal.querySelector('#close-storage-modal').addEventListener('click', closeModal);

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Escape key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Store handler reference for cleanup
    modal._escapeHandler = escapeHandler;

    // Scan button
    const scanBtn = modal.querySelector('#scan-chats-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', scanAllChats);
    }

    // Cutoff input with validation
    const cutoffInput = modal.querySelector('#cutoff-input');
    if (cutoffInput) {
      cutoffInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        // Ensure non-negative value
        state.cutoffKB = Math.max(0, isNaN(value) ? 0 : value);
        e.target.value = state.cutoffKB; // Update input to reflect validated value
        renderChatList();
      });
    }

    // Sort select
    const sortSelect = modal.querySelector('#sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        sortChats();
        renderChatList();
      });
    }

    // Flatten selected button
    const flattenBtn = modal.querySelector('#flatten-selected-btn');
    if (flattenBtn) {
      flattenBtn.addEventListener('click', flattenSelectedChats);
    }

    // Selection buttons
    const selectAllBtn = modal.querySelector('#select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        getFilteredChats().forEach(chat => state.selectedChats.add(chat.id));
        renderChatList();
        updateFlattenButton();
      });
    }

    const selectNoneBtn = modal.querySelector('#select-none-btn');
    if (selectNoneBtn) {
      selectNoneBtn.addEventListener('click', () => {
        state.selectedChats.clear();
        renderChatList();
        updateFlattenButton();
      });
    }

    const selectWithThreadsBtn = modal.querySelector('#select-with-threads-btn');
    if (selectWithThreadsBtn) {
      selectWithThreadsBtn.addEventListener('click', () => {
        state.selectedChats.clear();
        getFilteredChats()
          .filter(chat => chat.totalThreads > 0)
          .forEach(chat => state.selectedChats.add(chat.id));
        renderChatList();
        updateFlattenButton();
      });
    }

    // Export selected button
    const exportBtn = modal.querySelector('#export-selected-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportSelectedChats);
    }

    // Toggle backups section
    const toggleBackupsBtn = modal.querySelector('#toggle-backups-btn');
    if (toggleBackupsBtn) {
      toggleBackupsBtn.addEventListener('click', () => {
        const container = document.getElementById('backups-container');
        if (container) {
          const isHidden = container.style.display === 'none';
          container.style.display = isHidden ? 'block' : 'none';
          toggleBackupsBtn.textContent = isHidden ? 'Hide Backups' : 'Show Backups';

          if (isHidden) {
            renderBackupsList();
          }
        }
      });
    }

    // Clear all backups button
    const clearAllBackupsBtn = modal.querySelector('#clear-all-backups-btn');
    if (clearAllBackupsBtn) {
      clearAllBackupsBtn.addEventListener('click', () => {
        const backups = listAllBackups();
        if (backups.length === 0) {
          showNotification('No backups to delete', 'info');
          return;
        }

        const confirmed = confirm(
          `Delete ALL ${backups.length} backup(s)?\n\n` +
          'This will permanently remove all stored backups.\n' +
          'This action cannot be undone.\n\n' +
          'Continue?'
        );

        if (!confirmed) return;

        const deletedCount = clearAllBackups();
        showNotification(`Deleted ${deletedCount} backup(s)`, 'success');

        // Refresh backups list if visible
        const container = document.getElementById('backups-container');
        if (container && container.style.display !== 'none') {
          renderBackupsList();
        }
      });
    }
  }

  function renderBackupsList() {
    const container = document.getElementById('backups-list');
    if (!container) return;

    const backups = listAllBackups();

    // Calculate total size of backups
    let totalBackupSize = 0;
    backups.forEach(backup => {
      try {
        const data = localStorage.getItem(backup.key);
        if (data) totalBackupSize += data.length * 2; // Approximate bytes (UTF-16)
      } catch (e) { /* ignore */ }
    });

    if (backups.length === 0) {
      container.innerHTML = '<p style="color: #6b7280;">No backups found. Backups are created automatically when flattening chats.</p>';
      return;
    }

    container.innerHTML = `
      <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; font-size: 12px;">
        <strong>${backups.length}</strong> backup(s) using approximately <strong>${formatBytes(totalBackupSize)}</strong> of localStorage
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
        ${backups.slice(0, 20).map(backup => `
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f9fafb;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          " class="backup-item" data-backup-key="${backup.key}">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 500; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(backup.title)}
              </div>
              <div style="font-size: 12px; color: #6b7280;">
                ${new Date(backup.timestamp).toLocaleString()}
              </div>
            </div>
            <div style="display: flex; gap: 8px; margin-left: 12px;">
              <button
                class="backup-export-btn"
                data-backup-key="${backup.key}"
                style="
                  padding: 6px 12px;
                  background: #10b981;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                "
              >📥 Export</button>
              <button
                class="backup-restore-btn"
                data-backup-key="${backup.key}"
                style="
                  padding: 6px 12px;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                "
              >♻️ Restore</button>
              <button
                class="backup-delete-btn"
                data-backup-key="${backup.key}"
                style="
                  padding: 6px 12px;
                  background: rgba(239, 68, 68, 0.1);
                  color: #ef4444;
                  border: 1px solid rgba(239, 68, 68, 0.3);
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                "
              >🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
      ${backups.length > 20 ? `<p style="margin-top: 8px; font-size: 12px; color: #6b7280;">Showing 20 of ${backups.length} backups</p>` : ''}
    `;

    // Add event listeners for backup buttons
    container.querySelectorAll('.backup-export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backupKey = e.target.dataset.backupKey;
        exportBackupToFile(backupKey);
      });
    });

    container.querySelectorAll('.backup-restore-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const backupKey = e.target.dataset.backupKey;
        const confirmed = confirm(
          'Restore this backup?\n\n' +
          'This will replace the current chat data with the backup.\n' +
          'The current version will be lost unless you export it first.\n\n' +
          'Continue?'
        );

        if (!confirmed) return;

        try {
          await restoreFromBackup(backupKey);
          // Rescan to update the list
          await scanAllChats();
        } catch (error) {
          showNotification(`Restore failed: ${error.message}`, 'error');
        }
      });
    });

    // Delete individual backup buttons
    container.querySelectorAll('.backup-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backupKey = e.target.dataset.backupKey;
        const confirmed = confirm(
          'Delete this backup?\n\n' +
          'This action cannot be undone.\n\n' +
          'Continue?'
        );

        if (!confirmed) return;

        if (deleteBackup(backupKey)) {
          showNotification('Backup deleted', 'success');
          renderBackupsList(); // Refresh the list
        } else {
          showNotification('Failed to delete backup', 'error');
        }
      });
    });
  }

  // ============================================
  // UI Observers
  // ============================================

  function observeUIChanges() {
    // Disconnect existing observer if any (prevent duplicates)
    if (state.uiObserver) {
      state.uiObserver.disconnect();
      state.uiObserver = null;
    }

    const observer = new MutationObserver(() => {
      if (!document.querySelector('[data-element-id="workspace-tab-storage-analyzer"]')) {
        initializeUI();
      }
    });

    const workspaceBar = document.querySelector('[data-element-id="workspace-bar"]');
    if (workspaceBar) {
      observer.observe(workspaceBar, { childList: true, subtree: false });
      // Store observer reference for cleanup
      state.uiObserver = observer;
    }
  }

  // ============================================
  // Utilities
  // ============================================

  function closeModal() {
    const modal = document.getElementById('chat-storage-analyzer-modal');
    if (modal) {
      // Clean up escape key handler
      if (modal._escapeHandler) {
        document.removeEventListener('keydown', modal._escapeHandler);
      }
      modal.remove();
    }
    state.uiElements.modal = null;
  }

  function formatBytes(bytes) {
    // Handle edge cases: negative, zero, NaN, undefined
    if (!bytes || bytes <= 0 || !Number.isFinite(bytes)) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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
      z-index: 10002;
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

  // Add CSS animations and styles
  const style = document.createElement('style');
  style.textContent = `
    /* =========================================
       CSS Variables & Dark Theme
       ========================================= */
    :root {
      --csa-bg-overlay: rgba(0, 0, 0, 0.6);
      --csa-bg-modal: rgba(20, 20, 23, 0.95);
      --csa-bg-card: rgba(255, 255, 255, 0.03);
      --csa-bg-card-hover: rgba(255, 255, 255, 0.06);
      --csa-border-color: rgba(255, 255, 255, 0.08);
      --csa-border-hover: rgba(255, 255, 255, 0.15);
      --csa-text-primary: #ffffff;
      --csa-text-secondary: #a1a1aa;
      --csa-text-tertiary: #71717a;
      --csa-accent-blue: #3b82f6;
      --csa-accent-purple: #8b5cf6;
      --csa-accent-green: #10b981;
      --csa-accent-red: #ef4444;
      --csa-radius-lg: 16px;
      --csa-radius-md: 12px;
      --csa-radius-sm: 8px;
    }

    /* =========================================
       Modal Overlay & Container
       ========================================= */
    .csa-overlay {
      position: fixed;
      inset: 0;
      background: var(--csa-bg-overlay);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      animation: csaFadeIn 0.2s ease-out;
    }

    .csa-modal {
      background: var(--csa-bg-modal);
      color: var(--csa-text-primary);
      padding: 24px;
      border-radius: var(--csa-radius-lg);
      border: 1px solid var(--csa-border-color);
      max-width: 900px;
      width: 95%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
      animation: csaScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .csa-modal::-webkit-scrollbar {
      width: 8px;
    }
    .csa-modal::-webkit-scrollbar-track {
      background: transparent;
    }
    .csa-modal::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    .csa-modal::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Dark theme overrides for modal content */
    .csa-modal h2, .csa-modal h3 {
      color: var(--csa-text-primary);
    }
    .csa-modal label, .csa-modal span {
      color: var(--csa-text-secondary);
    }

    /* Summary stats dark theme */
    .csa-modal [style*="background: #f3f4f6"] {
      background: var(--csa-bg-card) !important;
      border: 1px solid var(--csa-border-color);
    }
    .csa-modal [style*="color: #6b7280"] {
      color: var(--csa-text-tertiary) !important;
    }
    .csa-modal [style*="color: #374151"] {
      color: var(--csa-text-secondary) !important;
    }
    .csa-modal [style*="color: #111827"] {
      color: var(--csa-text-primary) !important;
    }

    /* Input/Select dark theme */
    .csa-modal input[type="number"],
    .csa-modal select {
      background: var(--csa-bg-card) !important;
      border-color: var(--csa-border-color) !important;
      color: var(--csa-text-primary) !important;
    }
    .csa-modal input[type="number"]:focus,
    .csa-modal select:focus {
      border-color: var(--csa-accent-blue) !important;
      outline: none;
    }

    /* Table dark theme */
    .csa-modal table {
      color: var(--csa-text-primary);
    }
    .csa-modal thead {
      background: rgba(255, 255, 255, 0.02) !important;
    }
    .csa-modal th {
      color: var(--csa-text-secondary) !important;
      border-color: var(--csa-border-color) !important;
    }
    .csa-modal td {
      border-color: var(--csa-border-color) !important;
    }
    .csa-modal tr[style*="background: #ffffff"],
    .csa-modal tr[style*="background: #f9fafb"] {
      background: transparent !important;
    }
    .csa-modal tr:hover {
      background: var(--csa-bg-card-hover) !important;
    }
    .csa-modal tr[style*="background: #eff6ff"] {
      background: rgba(59, 130, 246, 0.1) !important;
    }

    /* Chat list container */
    .csa-modal #chat-list-container {
      background: var(--csa-bg-card);
      border-color: var(--csa-border-color) !important;
    }

    /* Backups section */
    .csa-modal [style*="background: #f9fafb"][style*="border-radius: 6px"] {
      background: var(--csa-bg-card) !important;
      border-color: var(--csa-border-color) !important;
    }

    /* Button style overrides */
    .csa-modal button[style*="background: #e5e7eb"] {
      background: var(--csa-bg-card) !important;
      color: var(--csa-text-primary) !important;
      border: 1px solid var(--csa-border-color) !important;
    }
    .csa-modal button[style*="background: #e5e7eb"]:hover {
      background: var(--csa-bg-card-hover) !important;
    }

    /* Close button */
    .csa-modal #close-storage-modal {
      color: var(--csa-text-secondary);
      transition: color 0.2s;
    }
    .csa-modal #close-storage-modal:hover {
      color: var(--csa-text-primary);
    }

    /* Footer text */
    .csa-modal [style*="border-top: 1px solid #e5e7eb"] {
      border-color: var(--csa-border-color) !important;
    }

    /* Progress modal dark theme */
    #progress-modal > div {
      background: var(--csa-bg-modal) !important;
      color: var(--csa-text-primary) !important;
      border: 1px solid var(--csa-border-color);
    }
    #progress-modal [style*="background: #e5e7eb"] {
      background: var(--csa-bg-card) !important;
    }
    #progress-modal #progress-text {
      color: var(--csa-text-secondary) !important;
    }

    /* =========================================
       Animations
       ========================================= */
    @keyframes csaFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes csaScaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

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

  // Expose for debugging and programmatic access
  window.ChatStorageAnalyzer = {
    version: CONFIG.VERSION,
    getState: () => state,
    showModal: showStorageAnalyzerModal,
    scanAllChats,
    flattenChat,
    flattenSelectedChats,
    // Export functions (TypingMind compatible)
    exportSelectedChats,
    exportBackupToFile,
    // Backup management
    createBackup,
    listAllBackups,
    restoreFromBackup,
    deleteBackup,
    clearAllBackups
  };

  console.log(`[${CONFIG.EXTENSION_NAME}] Loaded. Press Ctrl+Shift+S to open.`);

})();
