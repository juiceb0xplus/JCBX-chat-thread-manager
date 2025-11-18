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

### Understanding the Interface (v2.0.0)

**Chat Overview Panel:**
- **Active Messages**: Total number of messages in the current conversation
- **Total Threads**: Total number of thread variants across all messages
- **With Variants**: How many messages have alternate thread branches

**Action Buttons:**
- **💾 Export Chat as JSON**: Download the entire chat as a JSON file (no localStorage quota issues!)
- **🗜️ Flatten Entire Chat**: Remove all threads from the chat (appears only if threads exist)

**Active Messages List:**
- Shows ALL messages in the current conversation (active path)
- Messages with thread variants are highlighted
- Click any message with variants to expand and see its threads

**Message Card:**
- Role badge (user/assistant/system)
- Message number and preview
- Variant count badge (if threads exist)
- Expandable dropdown arrow (if threads exist)

**Thread Variants (when expanded):**
- **Flatten Message** button: Remove all variants from this specific message
- List of thread variants showing:
  - Creation timestamp
  - Number of messages in that branch
  - Preview of thread content
  - 🗑️ Delete button for each variant

### Features (v2.0.0)

#### 1. View Active Messages & Threads

Simply open the Thread Manager to see:
- All messages in your active conversation
- Which messages have thread variants (highlighted)
- Statistics about messages and threads
- Click any message to expand and view its variants

#### 2. Export Chat as JSON

To create a manual backup of your chat:

1. Open Thread Manager
2. Click **💾 Export Chat as JSON** button
3. Chat downloads as a JSON file to your computer
4. Can be imported back via TypingMind's import feature

**Benefits**:
- No localStorage quota issues
- Portable backup you can save anywhere
- Can share or archive chats

#### 3. Delete Individual Thread Variant

To remove a specific thread variant from a message:

1. Open Thread Manager
2. Click on a message to expand it
3. Find the thread variant you want to delete
4. Click the **🗑️ Delete** button next to that variant
5. Confirm the deletion
6. Changes save automatically

**⚠️ Warning**: This is permanent! Export chat first if unsure.

#### 4. Flatten Individual Message

To remove **ALL** thread variants from a specific message:

1. Open Thread Manager
2. Click on a message to expand it
3. Click **Flatten Message** button
4. Confirm the operation
5. All variants removed, only active message remains

**Use Case**: Clean up a specific message that has too many variants

#### 5. Flatten Entire Chat

To remove **ALL** threads from the entire chat:

1. Open Thread Manager
2. Click **🗜️ Flatten Entire Chat** button at the top
3. Review confirmation (shows how many threads will be removed)
4. Click OK to confirm
5. Reload page to see changes

**Use Case**: Archive old chats, reduce storage, clean up all exploration branches

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

1. **Check IndexedDB Access**:
   - Ensure browser has IndexedDB enabled
   - Check for browser permission issues
   - Try in a different browser

2. **Export First**:
   - Use the Export feature to backup your chat
   - Then try the operation again

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

### Console API (v2.0.0)

The extension exposes a console API for advanced users:

```javascript
// Get extension state
window.ChatThreadManager.getState()

// Open modal programmatically
window.ChatThreadManager.showModal()

// Delete specific thread variant
await window.ChatThreadManager.deleteThread(chatID, messageIndex, threadIndex)

// Flatten entire chat (remove all threads)
await window.ChatThreadManager.flattenChat(chatID)

// Flatten specific message (remove all threads from one message)
await window.ChatThreadManager.flattenMessage(chatID, messageIndex)

// Export chat as JSON (downloads file)
window.ChatThreadManager.exportChat(chatData, chatID)

// Check version
window.ChatThreadManager.version // "2.0.0"
```

### Bulk Operations (Advanced)

To flatten all messages that have threads:

```javascript
// Get chat ID
const chatID = 'CHAT_' + window.location.hash.match(/chat=([^&]+)/)[1];

// Get chat data
const request = indexedDB.open('keyval-store');
request.onsuccess = async (e) => {
  const db = e.target.result;
  const tx = db.transaction(['keyval'], 'readonly');
  const store = tx.objectStore('keyval');
  const getReq = store.get(chatID);

  getReq.onsuccess = async () => {
    const chat = getReq.result;

    // Find all messages with threads
    const messagesWithThreads = chat.messages
      .map((msg, idx) => ({ idx, count: msg.threads?.length || 0 }))
      .filter(m => m.count > 0);

    console.log(`Found ${messagesWithThreads.length} messages with threads`);

    // Flatten each message
    for (const msg of messagesWithThreads) {
      await window.ChatThreadManager.flattenMessage(chatID, msg.idx);
      console.log(`Flattened message ${msg.idx}`);
    }
  };
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

**Note**: The extension doesn't store any data in localStorage. All data is in TypingMind's IndexedDB.

---

## Safety & Privacy

### Data Storage (v2.0.0)

- **Extension Code**: Loaded from your specified URL
- **No localStorage**: Extension doesn't use localStorage (no quota issues!)
- **No Server Communication**: Extension operates entirely client-side
- **No Data Transmission**: Your chat data never leaves your browser
- **Manual Exports**: JSON exports are downloaded to your computer only

### Security Considerations

1. **Trust the Source**: Only install from trusted URLs you control
2. **No Automatic Backups**: You control when to export chat data
3. **Client-Side Only**: All operations happen in your browser
4. **Data Control**: Exports are standard JSON files you can inspect

---

## Best Practices (v2.0.0)

### Before Using Destructive Operations

1. **Export First**: Use the "Export Chat as JSON" button to backup
2. **Test on Non-Critical Chat**: Try on a test chat first
3. **Understand Threads**: Know which threads you want to keep
4. **Review Before Flattening**: Expand messages to see what will be removed

### Regular Maintenance

1. **Export Important Chats**: Periodically export chats you want to keep
2. **Archive Exports**: Store JSON files in a safe location
3. **Update Extension**: Pull latest version if bugs are fixed

### When to Flatten

- **Archive Chat**: Before archiving, flatten to save space
- **Share Chat**: Before exporting, flatten to share only main thread
- **Clean Exploration**: After trying many variants, keep only the best
- **Reduce Clutter**: Remove experimental branches you don't need

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

## FAQ (v2.0.0)

**Q: Will this work on mobile?**
A: Should work on mobile browsers, but UI optimized for desktop. Test before use.

**Q: Can I undo a flatten operation?**
A: No automatic undo. Export your chat first using the "Export Chat as JSON" button.

**Q: Where are backups stored?**
A: No automatic backups. You manually export chats as JSON files to your computer.

**Q: Does this work with TypingMind Teams?**
A: Should work, but test on non-critical data first.

**Q: Can I restore from an exported JSON?**
A: Yes, use TypingMind's built-in import feature to restore exported chats.

**Q: Will updates break my installation?**
A: If using jsDelivr CDN with `@main`, you get auto-updates. Pin to specific version for stability.

**Q: Does this work offline?**
A: Once loaded, yes. But you need internet to load extension initially.

**Q: Why did you remove automatic backups?**
A: To avoid localStorage quota exceeded errors. Manual exports give you more control.

---

## Version History

### v2.0.0 (2025-11-18) - Major Refactor
- **Breaking Change**: Removed automatic backups (localStorage quota issues)
- **New**: Manual export as JSON file (downloads to computer)
- **New**: UI now shows active messages with expandable thread lists
- **New**: Flatten individual messages (not just entire chat)
- **New**: Modern dark-mode theme with gradient designs
- **Fixed**: Sidebar button alignment
- **Improved**: Better UX with expandable message cards
- **Improved**: No localStorage usage - no quota errors

### v1.0.0 (2025-11-18)
- Initial release
- Thread viewer
- Delete individual threads
- Flatten chat
- Automatic backups (removed in v2.0.0)
- Restore functionality (removed in v2.0.0)

---

**Made with ❤️ for the TypingMind community**

*For technical details, see [RESEARCH.md](./RESEARCH.md) and [FINDINGS.md](./FINDINGS.md)*
