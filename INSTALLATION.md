# Installation Guide

## Chat Thread Manager Extension for TypingMind

This guide will help you install and use the Chat Thread Manager extension for TypingMind.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
3. [Verification](#verification)
4. [Usage Guide](#usage-guide)
5. [Troubleshooting](#troubleshooting)
6. [Uninstallation](#uninstallation)

---

## Prerequisites

- Active TypingMind account
- Browser with JavaScript enabled
- Modern browser (Chrome, Firefox, Safari, Edge)

---

## Installation Methods

### Method 1: GitHub Pages (Recommended)

**Step 1: Host the Extension**

1. Fork this repository to your GitHub account
2. Go to repository Settings
3. Navigate to Pages section
4. Enable GitHub Pages from the `main` branch
5. Wait for deployment (usually 1-2 minutes)
6. Your extension will be available at: `https://[your-username].github.io/typingmind-chat-thread-manager/src/chat-thread-manager.js`

**Step 2: Install in TypingMind**

1. Open TypingMind (https://typingmind.com)
2. Click the menu (☰) → **Preferences**
3. Scroll to **Extensions** section
4. Click **Add Extension**
5. Paste your GitHub Pages URL: `https://[your-username].github.io/typingmind-chat-thread-manager/src/chat-thread-manager.js`
6. Click **Save**
7. Reload the page

### Method 2: Direct File Hosting

If you have your own web server:

1. Upload `src/chat-thread-manager.js` to your server
2. Ensure the file is served with `Content-Type: application/javascript` or `text/javascript`
3. Enable CORS if needed
4. Follow Step 2 from Method 1, using your server's URL

### Method 3: CDN (jsDelivr)

If this repository is public and you want automatic updates:

1. Use the jsDelivr CDN URL:
   ```
   https://cdn.jsdelivr.net/gh/[username]/typingmind-chat-thread-manager@main/src/chat-thread-manager.js
   ```
2. Follow Step 2 from Method 1
3. Extension will auto-update when you push changes to the `main` branch

---

## Verification

After installation, verify the extension loaded correctly:

1. **Check Browser Console**
   - Press F12 to open DevTools
   - Go to Console tab
   - Look for: `[ChatThreadManager] Loaded. Press Ctrl+Shift+T to open.`

2. **Check UI**
   - Look for the "Threads" button in the top menu bar
   - It should appear next to the Settings button

3. **Test Functionality**
   - Click the "Threads" button
   - Or press **Ctrl+Shift+T** (Windows/Linux) or **Cmd+Shift+T** (Mac)
   - The Thread Manager modal should open

---

## Usage Guide

### Opening Thread Manager

**Three ways to open:**

1. **Click button**: Click the "Threads" button in the menu bar
2. **Keyboard shortcut**: Press **Ctrl+Shift+T**
3. **Console**: Type `window.ChatThreadManager.showModal()` in browser console

### Understanding the Interface

**Statistics Panel:**
- **Total Messages**: Number of messages in current chat
- **Messages with Threads**: How many messages have alternate thread branches
- **Total Threads**: Total number of thread variants across all messages

**Threads List:**
- Shows all messages that have thread variants
- Each message displays:
  - Message index and role (user/assistant)
  - Preview of message content
  - Number of threads
  - List of all thread variants

**Thread Details:**
- Creation timestamp
- Preview of thread content
- Number of messages in that branch
- Delete button

**Backups Section:**
- Lists recent backups (up to 5)
- Shows backup timestamp
- Restore button for each backup

### Features

#### 1. View Threads

Simply open the Thread Manager to see:
- Which messages have thread variants
- How many threads exist
- When each thread was created
- Preview of thread content

#### 2. Delete Individual Thread

To remove a specific thread variant:

1. Open Thread Manager
2. Find the message with the thread you want to delete
3. Locate the specific thread variant
4. Click the **🗑️ Delete** button
5. Confirm the deletion
6. A backup is automatically created

**⚠️ Warning**: This is permanent! Use backups to restore if needed.

#### 3. Flatten Chat

To remove **ALL** threads and keep only the active conversation:

1. Open Thread Manager
2. Click **🗜️ Flatten Chat** button at the top
3. Review the confirmation dialog (shows how many threads will be removed)
4. Click OK to confirm
5. A backup is automatically created
6. Reload the page to see changes

**Use Case**: Archive old chats, reduce storage, clean up exploration branches

#### 4. Restore from Backup

If you deleted threads by mistake:

1. Open Thread Manager
2. Scroll to Backups section
3. Find the backup (sorted by date, newest first)
4. Click **Restore** button
5. Confirm restoration
6. Reload page to see restored chat

**Note**: Backups are stored in browser localStorage. If you clear browser data, backups are lost.

---

## Troubleshooting

### Extension Not Loading

**Symptoms**: No "Threads" button appears

**Solutions**:

1. **Check URL**: Ensure the extension URL is correct and accessible
   - Open the URL directly in browser
   - Should show JavaScript code (not 404 error)

2. **Check Safe Mode**: TypingMind might be in safe mode
   - Remove `?safe_mode=1` from URL if present
   - Reload the page

3. **Check Console for Errors**:
   - Open DevTools (F12) → Console
   - Look for red error messages
   - Common issues:
     - CORS errors → Need to enable CORS on your server
     - 404 errors → URL is wrong
     - Syntax errors → File might be corrupted

4. **Clear Cache and Reload**:
   - Press Ctrl+Shift+R (hard reload)
   - Or clear browser cache and reload

### Button Appears But Doesn't Work

1. **Check Browser Console**:
   - Look for errors when clicking the button
   - Might be IndexedDB permission issues

2. **Check Chat is Loaded**:
   - Extension works only when a chat is active
   - Open or create a chat first

3. **Try Keyboard Shortcut**:
   - Press Ctrl+Shift+T
   - If this works, button event listener issue

### Modal Shows "No Active Chat Detected"

1. **Ensure You're in a Chat**:
   - Click on an existing chat or create new one
   - URL should contain `#chat=...`

2. **Wait for Chat to Load**:
   - Large chats take time to load
   - Wait 2-3 seconds and try again

### Flatten/Delete Not Working

1. **Check Backups are Being Created**:
   - Open Thread Manager
   - Check Backups section has entries
   - If no backups, localStorage might be full

2. **Check Browser Storage**:
   - DevTools → Application → Local Storage
   - Ensure you have enough space

3. **Try Manual Console Command**:
   ```javascript
   // Get current chat ID from URL
   const chatID = 'CHAT_' + window.location.hash.match(/chat=([^&]+)/)[1];

   // Try flattening
   await window.ChatThreadManager.flattenChat(chatID);
   ```

### Changes Not Visible After Operation

**After deleting threads or flattening, you must reload the page:**

1. Press F5 or Ctrl+R
2. Or close and reopen the chat
3. TypingMind doesn't automatically refresh chat data

---

## Advanced Usage

### Console API

The extension exposes a console API for advanced users:

```javascript
// Get extension state
window.ChatThreadManager.getState()

// Open modal programmatically
window.ChatThreadManager.showModal()

// Delete specific thread
await window.ChatThreadManager.deleteThread(chatID, messageIndex, threadIndex)

// Flatten chat
await window.ChatThreadManager.flattenChat(chatID)

// Create manual backup
await window.ChatThreadManager.createBackup(chatID, chatData)

// List backups
window.ChatThreadManager.listBackups(chatID)

// Restore backup
await window.ChatThreadManager.restoreBackup(backupKey)

// Check version
window.ChatThreadManager.version
```

### Bulk Operations (Advanced)

To delete all threads from a specific message:

```javascript
// Get chat ID
const chatID = 'CHAT_' + window.location.hash.match(/chat=([^&]+)/)[1];

// Message index (e.g., message 4)
const messageIndex = 4;

// Get chat data
const request = indexedDB.open('keyval-store');
request.onsuccess = async (e) => {
  const db = e.target.result;
  const tx = db.transaction(['keyval'], 'readonly');
  const store = tx.objectStore('keyval');
  const chat = await store.get(chatID);

  // Count threads
  const threadCount = chat.messages[messageIndex].threads?.length || 0;
  console.log(`Message ${messageIndex} has ${threadCount} threads`);

  // Delete each thread (from last to first)
  for (let i = threadCount - 1; i >= 0; i--) {
    await window.ChatThreadManager.deleteThread(chatID, messageIndex, i);
    console.log(`Deleted thread ${i}`);
  }
};
```

---

## Uninstallation

To remove the extension:

1. Open TypingMind
2. Menu → Preferences → Extensions
3. Find "Chat Thread Manager" entry
4. Click **Remove** or delete the URL
5. Save
6. Reload the page

**Note**: Backups will remain in localStorage until you manually clear them.

### Clear Backups

To remove all backups created by this extension:

```javascript
// Clear all backups for all chats
Object.keys(localStorage)
  .filter(key => key.startsWith('CTM_BACKUP_'))
  .forEach(key => localStorage.removeItem(key));

console.log('All backups cleared');
```

---

## Safety & Privacy

### Data Storage

- **Extension Code**: Loaded from your specified URL
- **Backups**: Stored in browser localStorage (client-side only)
- **No Server Communication**: Extension operates entirely client-side
- **No Data Transmission**: Your chat data never leaves your browser

### Security Considerations

1. **Trust the Source**: Only install from trusted URLs you control
2. **Backup Limits**: Maximum 5 backups per chat (configurable)
3. **Storage Limits**: Browser localStorage has ~5-10MB limit
4. **Data Persistence**: Backups survive page reloads but not cache clearing

---

## Best Practices

### Before Using Destructive Operations

1. **Manual Backup**: Export chat as markdown first (use TypingMind's export)
2. **Test on Non-Critical Chat**: Try on a test chat first
3. **Understand Threads**: Know which threads you want to keep
4. **Check Backups Work**: Verify backups are being created

### Regular Maintenance

1. **Clean Old Backups**: Periodically check and remove old backups
2. **Monitor Storage**: Check localStorage usage if you have many chats
3. **Update Extension**: Pull latest version if bugs are fixed

### When to Flatten

- **Archive Chat**: Before archiving, flatten to save space
- **Share Chat**: Before exporting, flatten to share only main thread
- **Clean Exploration**: After trying many variants, keep only the best

---

## Support

### Getting Help

1. **Check Console**: F12 → Console for error messages
2. **Review FINDINGS.md**: Understand data structure
3. **Check GitHub Issues**: See if others have same problem
4. **Create Issue**: Report bugs on GitHub repository

### Reporting Bugs

Include:
- Browser and version
- TypingMind version (if known)
- Console error messages
- Steps to reproduce
- Expected vs actual behavior

---

## FAQ

**Q: Will this work on mobile?**
A: Should work on mobile browsers, but UI optimized for desktop. Test before use.

**Q: Can I undo a flatten operation?**
A: Yes, use the Restore feature in Backups section.

**Q: How many backups are kept?**
A: 5 per chat by default (configurable in code).

**Q: Does this work with TypingMind Teams?**
A: Should work, but test on non-critical data first.

**Q: Can I export backups?**
A: Not built-in, but you can copy from localStorage manually.

**Q: Will updates break my installation?**
A: If using jsDelivr CDN with `@main`, you get auto-updates. Pin to specific version for stability.

**Q: Does this work offline?**
A: Once loaded, yes. But you need internet to load extension initially.

---

## Version History

### v1.0.0 (2025-11-18)
- Initial release
- Thread viewer
- Delete individual threads
- Flatten chat
- Automatic backups
- Restore functionality

---

**Made with ❤️ for the TypingMind community**

*For technical details, see [RESEARCH.md](./RESEARCH.md) and [FINDINGS.md](./FINDINGS.md)*
