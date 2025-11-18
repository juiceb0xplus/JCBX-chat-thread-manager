/**
 * TypingMind Chat Thread Manager Extension
 * Version: 2.1.0
 *
 * Features:
 * - View all active messages in current chat
 * - Expand messages to see their thread variants
 * - Delete individual threads
 * - Flatten individual messages or entire chat
 * - Export chat in TypingMind-compatible format (importable)
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
    VERSION: '2.1.0',
    DB_NAME: 'keyval-store',
    OBJECT_STORE: 'keyval'
  };

  // ============================================
  // State Management
  // ============================================

  const state = {
    currentChatID: null,
    currentChat: null,
    analysis: null,
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
    const button = document.createElement('button');
    button.setAttribute('data-element-id', 'workspace-tab-thread-manager');
    button.type = 'button';
    button.title = 'Chat Thread Manager';
    button.setAttribute('aria-label', 'Open Thread Manager');

    if (settingsButton) {
      button.className = settingsButton.className;
      const variant = settingsButton.getAttribute('data-variant');
      if (variant) {
        button.setAttribute('data-variant', variant);
      }
    }

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '16');
    icon.setAttribute('height', '16');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('aria-hidden', 'true');

    const bubble = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bubble.setAttribute('d', 'M5 4h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3.2L12 18l-.8-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z');
    bubble.setAttribute('stroke', 'currentColor');
    bubble.setAttribute('stroke-width', '1.5');
    bubble.setAttribute('stroke-linejoin', 'round');
    bubble.setAttribute('fill', 'none');

    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    lines.setAttribute('d', 'M8 8h8M8 11h5M4 16h6l.5 3 3-3H19');
    lines.setAttribute('stroke', 'currentColor');
    lines.setAttribute('stroke-width', '1.5');
    lines.setAttribute('stroke-linecap', 'round');
    lines.setAttribute('stroke-linejoin', 'round');

    icon.appendChild(bubble);
    icon.appendChild(lines);

    const label = document.createElement('span');
    label.textContent = 'Threads';

    button.appendChild(icon);
    button.appendChild(label);

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
      // Export in TypingMind's native format (raw chat object)
      // This ensures compatibility with TypingMind's import feature
      // Previous format wrapped the chat in metadata, which caused import errors
      const jsonString = JSON.stringify(chat, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link with metadata in filename
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const chatName = chat.chatTitle ? chat.chatTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '-') : 'chat';
      link.download = `${chatName}-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL
      setTimeout(() => URL.revokeObjectURL(url), 100);

      showNotification('Chat exported successfully! Compatible with TypingMind import.', 'success');
      console.log(`[${CONFIG.EXTENSION_NAME}] Chat exported in TypingMind format`);
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
      state.analysis = analysis;

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
    modal.className = 'ctm-overlay';

    const content = document.createElement('div');
    content.className = 'ctm-modal';
    modal.appendChild(content);

    content.appendChild(createModalHeader());
    content.appendChild(createOverviewSection(analysis));
    content.appendChild(createActionRow(analysis));
    content.appendChild(createHelperText());
    content.appendChild(createMessagesSection(analysis));

    setupModalEventListeners(modal);

    return modal;
  }

  function createModalHeader() {
    const header = document.createElement('div');
    header.className = 'ctm-modal-header';

    const title = document.createElement('h2');
    title.textContent = 'Thread Manager';

    const closeButton = document.createElement('button');
    closeButton.id = 'close-thread-modal';
    closeButton.type = 'button';
    closeButton.className = 'ctm-close-btn';
    closeButton.setAttribute('aria-label', 'Close thread manager');
    closeButton.textContent = '×';

    header.appendChild(title);
    header.appendChild(closeButton);
    return header;
  }

  function createOverviewSection(analysis) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ctm-overview';

    const heading = document.createElement('h3');
    heading.textContent = 'Chat Overview';
    wrapper.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'ctm-overview-grid';

    const stats = [
      { label: 'Active Messages', value: analysis.totalMessages, accent: 'primary' },
      { label: 'Total Threads', value: analysis.totalThreads, accent: 'secondary' },
      { label: 'With Variants', value: analysis.activeMessages.filter(m => m.hasThreads).length, accent: 'success' }
    ];

    stats.forEach(stat => {
      const card = document.createElement('div');
      card.className = `ctm-overview-card ctm-overview-card--${stat.accent}`;

      const label = document.createElement('span');
      label.className = 'ctm-overview-label';
      label.textContent = stat.label.toUpperCase();

      const value = document.createElement('span');
      value.className = 'ctm-overview-value';
      value.textContent = stat.value;

      card.appendChild(label);
      card.appendChild(value);
      grid.appendChild(card);
    });

    wrapper.appendChild(grid);
    return wrapper;
  }

  function createActionRow(analysis) {
    const row = document.createElement('div');
    row.className = 'ctm-action-row';

    const exportButton = document.createElement('button');
    exportButton.id = 'export-chat-button';
    exportButton.type = 'button';
    exportButton.className = 'ctm-btn ctm-btn--primary';
    exportButton.innerHTML = '<span aria-hidden="true">⬇️</span><span>Export Chat</span>';

    const flattenButton = document.createElement('button');
    flattenButton.id = 'flatten-chat-button';
    flattenButton.type = 'button';
    flattenButton.className = 'ctm-btn ctm-btn--danger-outline';
    flattenButton.innerHTML = '<span aria-hidden="true">🧹</span><span>Flatten Entire Chat</span>';
    flattenButton.disabled = analysis.totalThreads === 0;
    if (flattenButton.disabled) {
      flattenButton.setAttribute('aria-disabled', 'true');
    }

    row.appendChild(exportButton);
    row.appendChild(flattenButton);

    return row;
  }

  function createHelperText() {
    const text = document.createElement('p');
    text.className = 'ctm-helper-text';
    text.textContent = 'Click any message to expand and view its thread variants.';
    return text;
  }

  function createMessagesSection(analysis) {
    if (analysis.totalMessages === 0) {
      return createEmptyState();
    }

    const list = document.createElement('div');
    list.id = 'messages-list';
    list.className = 'ctm-messages-list';

    analysis.activeMessages.forEach(msg => {
      list.appendChild(createMessageCard(msg));
    });

    return list;
  }

  function createEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'ctm-empty-state';

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '64');
    icon.setAttribute('height', '64');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.setAttribute('stroke', 'currentColor');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('fill', 'none');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '12');
    line.setAttribute('y1', '8');
    line.setAttribute('x2', '12');
    line.setAttribute('y2', '12');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', '12');
    dot.setAttribute('cy', '16');
    dot.setAttribute('r', '1');
    dot.setAttribute('fill', 'currentColor');

    icon.appendChild(circle);
    icon.appendChild(line);
    icon.appendChild(dot);

    const text = document.createElement('p');
    text.textContent = 'No messages found in this chat yet.';

    emptyState.appendChild(icon);
    emptyState.appendChild(text);

    return emptyState;
  }

  function createMessageCard(msg) {
    const card = document.createElement('div');
    card.className = 'ctm-message-card';
    if (msg.hasThreads) {
      card.classList.add('has-threads');
    }

    const isExpanded = msg.hasThreads && state.expandedMessages.has(msg.index);
    if (isExpanded) {
      card.classList.add('is-expanded');
    }

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'ctm-message-header';
    header.dataset.messageIndex = msg.index;
    header.dataset.hasThreads = msg.hasThreads ? 'true' : 'false';
    header.disabled = !msg.hasThreads;
    header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    header.setAttribute('aria-controls', `ctm-message-threads-${msg.index}`);

    const headerContent = document.createElement('div');
    headerContent.className = 'ctm-message-header-content';

    const metaRow = document.createElement('div');
    metaRow.className = 'ctm-message-meta';

    const roleBadge = document.createElement('span');
    roleBadge.className = `ctm-role-badge ctm-role-badge--${msg.role || 'default'}`;
    roleBadge.textContent = msg.role || 'unknown';
    metaRow.appendChild(roleBadge);

    const messageNumber = document.createElement('span');
    messageNumber.className = 'ctm-message-number';
    messageNumber.textContent = `Message ${msg.index + 1}`;
    metaRow.appendChild(messageNumber);

    if (msg.hasThreads) {
      const threadBadge = document.createElement('span');
      threadBadge.className = 'ctm-thread-count';
      threadBadge.textContent = `${msg.threadCount} variant${msg.threadCount !== 1 ? 's' : ''}`;
      metaRow.appendChild(threadBadge);
    }

    headerContent.appendChild(metaRow);

    const preview = document.createElement('p');
    preview.className = 'ctm-message-preview';
    const previewText = typeof msg.content === 'string' ? msg.content : '[No preview available]';
    const needsEllipsis = typeof msg.fullContent === 'string' && msg.fullContent.length > previewText.length;
    preview.textContent = previewText + (needsEllipsis ? '…' : '');
    headerContent.appendChild(preview);

    if (msg.timestamp) {
      const timestamp = document.createElement('span');
      timestamp.className = 'ctm-message-timestamp';
      timestamp.textContent = new Date(msg.timestamp).toLocaleString();
      headerContent.appendChild(timestamp);
    }

    const arrow = document.createElement('span');
    arrow.className = 'ctm-expand-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowSvg.setAttribute('width', '16');
    arrowSvg.setAttribute('height', '16');
    arrowSvg.setAttribute('viewBox', '0 0 24 24');
    arrowSvg.setAttribute('fill', 'none');
    arrowSvg.setAttribute('stroke', 'currentColor');
    arrowSvg.setAttribute('stroke-width', '2');

    const arrowPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    arrowPolyline.setAttribute('points', '18 15 12 9 6 15');
    arrowSvg.appendChild(arrowPolyline);
    arrow.appendChild(arrowSvg);
    if (!msg.hasThreads) {
      arrow.style.visibility = 'hidden';
    }

    header.appendChild(headerContent);
    header.appendChild(arrow);
    card.appendChild(header);

    if (msg.hasThreads) {
      const threadsSection = document.createElement('div');
      threadsSection.className = 'ctm-message-threads';
      threadsSection.id = `ctm-message-threads-${msg.index}`;
      if (isExpanded) {
        threadsSection.classList.add('is-open');
      }

      const inner = document.createElement('div');
      inner.className = 'ctm-message-threads-inner';

      const actions = document.createElement('div');
      actions.className = 'ctm-card-actions';

      const summary = document.createElement('span');
      summary.className = 'ctm-thread-summary';
      const totalMessages = msg.threads.reduce((acc, thread) => acc + (thread.messages?.length || 0), 0);
      summary.textContent = `${msg.threadCount} variant${msg.threadCount !== 1 ? 's' : ''} • ${totalMessages} total message${totalMessages !== 1 ? 's' : ''}`;

      const flattenButton = document.createElement('button');
      flattenButton.type = 'button';
      flattenButton.className = 'ctm-btn ctm-btn--ghost flatten-message-btn';
      flattenButton.dataset.messageIndex = msg.index;
      flattenButton.textContent = 'Flatten Message';

      actions.appendChild(summary);
      actions.appendChild(flattenButton);

      const threadList = document.createElement('div');
      threadList.className = 'ctm-thread-list';

      msg.threads.forEach((thread, threadIdx) => {
        threadList.appendChild(createThreadCard(msg.index, thread, threadIdx));
      });

      inner.appendChild(actions);
      inner.appendChild(threadList);
      threadsSection.appendChild(inner);
      card.appendChild(threadsSection);
    }

    return card;
  }

  function createThreadCard(messageIndex, thread, threadIdx) {
    const threadCard = document.createElement('div');
    threadCard.className = 'ctm-thread-card';

    const details = document.createElement('div');
    details.className = 'ctm-thread-details';

    const meta = document.createElement('div');
    meta.className = 'ctm-thread-meta';
    const createdAt = thread.createdAt ? new Date(thread.createdAt).toLocaleString() : 'Unknown date';
    meta.textContent = `Created: ${createdAt} • ${thread.messages?.length || 0} message(s)`;

    const preview = document.createElement('p');
    preview.className = 'ctm-thread-preview';
    preview.textContent = getThreadPreview(thread);

    details.appendChild(meta);
    details.appendChild(preview);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'ctm-btn ctm-btn--danger delete-thread-btn';
    deleteButton.dataset.messageIndex = messageIndex;
    deleteButton.dataset.threadIndex = threadIdx;
    deleteButton.textContent = 'Delete';

    threadCard.appendChild(details);
    threadCard.appendChild(deleteButton);

    return threadCard;
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
    if (flattenButton && !flattenButton.disabled) {
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
    modal.querySelectorAll('.ctm-message-header[data-has-threads="true"]').forEach(header => {
      const messageIndex = parseInt(header.dataset.messageIndex, 10);
      header.addEventListener('click', () => toggleMessageExpansion(header, messageIndex));
    });

    // Flatten message buttons
    modal.querySelectorAll('.flatten-message-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent message expansion
        const button = e.currentTarget;
        const messageIndex = parseInt(button.dataset.messageIndex, 10);

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
        const button = e.currentTarget;
        const messageIndex = parseInt(button.dataset.messageIndex, 10);
        const threadIndex = parseInt(button.dataset.threadIndex, 10);

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

  function toggleMessageExpansion(header, messageIndex) {
    const card = header.closest('.ctm-message-card');
    const threadContent = card?.querySelector('.ctm-message-threads');
    const isExpanding = !state.expandedMessages.has(messageIndex);

    if (isExpanding) {
      state.expandedMessages.add(messageIndex);
    } else {
      state.expandedMessages.delete(messageIndex);
    }

    header.setAttribute('aria-expanded', isExpanding ? 'true' : 'false');
    if (threadContent) {
      threadContent.classList.toggle('is-open', isExpanding);
    }
    if (card) {
      card.classList.toggle('is-expanded', isExpanding);
    }
  }

  function closeModal() {
    const modal = document.getElementById('chat-thread-manager-modal');
    if (modal) {
      modal.remove();
    }
    state.uiElements.modal = null;
    state.analysis = null;
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
    const handleHashChange = () => {
      state.currentChatID = null;
      state.currentChat = null;
      state.analysis = null;
      state.expandedMessages.clear();
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
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
    .ctm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(8px);
      padding: 16px;
    }

    .ctm-modal {
      background: #1a1a1a;
      color: #e5e5e5;
      padding: 32px;
      border-radius: 18px;
      max-width: 920px;
      width: min(920px, 100%);
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid #2f2f2f;
    }

    .ctm-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
    }

    .ctm-modal-header h2 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .ctm-close-btn {
      background: transparent;
      border: none;
      color: #999;
      font-size: 32px;
      cursor: pointer;
      line-height: 1;
      transition: color 0.2s ease;
    }

    .ctm-close-btn:hover,
    .ctm-close-btn:focus-visible {
      color: #fff;
    }

    .ctm-overview {
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
      border: 1px solid #333;
      border-radius: 14px;
    }

    .ctm-overview h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .ctm-overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }

    .ctm-overview-card {
      background: #252525;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ctm-overview-label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ctm-overview-value {
      font-size: 24px;
      font-weight: 700;
    }

    .ctm-overview-card--primary .ctm-overview-value { color: #667eea; }
    .ctm-overview-card--secondary .ctm-overview-value { color: #764ba2; }
    .ctm-overview-card--success .ctm-overview-value { color: #48bb78; }

    .ctm-action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
    }

    .ctm-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
      border: none;
      background: #2d2d2d;
      color: #f3f4f6;
    }

    .ctm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    .ctm-btn--primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.25);
    }

    .ctm-btn--primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 15px 30px rgba(102, 126, 234, 0.35);
    }

    .ctm-btn--danger-outline {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .ctm-btn--danger-outline:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #fff;
    }

    .ctm-btn--danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .ctm-btn--danger:hover {
      background: #ef4444;
      color: #fff;
      border-color: #ef4444;
    }

    .ctm-btn--ghost {
      background: rgba(255, 255, 255, 0.05);
      color: #f3f4f6;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .ctm-btn--ghost:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .ctm-helper-text {
      margin: 0 0 20px 0;
      font-size: 13px;
      color: #9ca3af;
    }

    .ctm-messages-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ctm-message-card {
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      background: #1f1f1f;
      overflow: hidden;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .ctm-message-card.has-threads {
      border-color: #363636;
      background: #212121;
    }

    .ctm-message-card.is-expanded {
      border-color: #4b4b4b;
      background: #242424;
    }

    .ctm-message-header {
      width: 100%;
      background: transparent;
      border: none;
      color: inherit;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      text-align: left;
    }

    .ctm-message-header:disabled {
      cursor: default;
      opacity: 0.6;
    }

    .ctm-message-header-content {
      flex: 1;
      min-width: 0;
    }

    .ctm-message-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .ctm-role-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ctm-role-badge--user { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .ctm-role-badge--assistant { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; }
    .ctm-role-badge--system { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }
    .ctm-role-badge--default { background: rgba(156, 163, 175, 0.2); color: #e5e7eb; }

    .ctm-message-number {
      font-size: 12px;
      color: #9ca3af;
    }

    .ctm-thread-count {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(118, 75, 162, 0.2);
      color: #d8b4fe;
      font-weight: 600;
    }

    .ctm-message-preview {
      margin: 0;
      font-size: 14px;
      color: #d4d4d8;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .ctm-message-timestamp {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
    }

    .ctm-expand-arrow svg {
      transition: transform 0.3s ease;
    }

    .ctm-message-card.is-expanded .ctm-expand-arrow svg {
      transform: rotate(180deg);
    }

    .ctm-message-threads {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      border-top: 1px solid transparent;
      transition: max-height 0.3s ease, opacity 0.3s ease, border-top 0.3s ease;
    }

    .ctm-message-threads.is-open {
      max-height: 2000px;
      opacity: 1;
      border-top-color: #333;
    }

    .ctm-message-threads-inner {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #1a1a1a;
    }

    .ctm-card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .ctm-thread-summary {
      font-size: 13px;
      color: #9ca3af;
    }

    .ctm-thread-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ctm-thread-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 10px;
      transition: border-color 0.2s ease;
      flex-wrap: wrap;
    }

    .ctm-thread-card:hover {
      border-color: #444;
    }

    .ctm-thread-details {
      flex: 1;
      min-width: 0;
    }

    .ctm-thread-meta {
      font-size: 11px;
      color: #888;
      margin-bottom: 6px;
    }

    .ctm-thread-preview {
      margin: 0;
      font-size: 13px;
      color: #bdbdbd;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .ctm-empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #8b8b8b;
    }

    .ctm-empty-state svg {
      margin-bottom: 20px;
      opacity: 0.35;
    }

    @media (max-width: 600px) {
      .ctm-modal {
        padding: 20px;
      }

      .ctm-action-row {
        flex-direction: column;
      }
    }

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
