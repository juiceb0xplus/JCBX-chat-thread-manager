# Installation Guide

## Prerequisites

- Active TypingMind account
- Modern browser (Chrome, Firefox, Safari, Edge)

## Installation

### Method 1: GitHub Pages (Recommended)

1. Fork this repository to your GitHub account
2. Go to Settings → Pages
3. Enable GitHub Pages from the `main` branch
4. Wait 1-2 minutes for deployment
5. Your URL: `https://[your-username].github.io/JCBX-chat-thread-manager/src/chat-thread-manager.js`

**Add to TypingMind:**
1. Open TypingMind
2. Menu → Preferences → Extensions → Add Extension
3. Paste your GitHub Pages URL
4. Save and reload

### Method 2: Your Own Server

1. Upload `src/chat-thread-manager.js` to your web server
2. Make sure CORS is enabled if needed
3. Use that URL in TypingMind Extensions settings

### Method 3: CDN (auto-updates)

Use jsDelivr for automatic updates:
```
https://cdn.jsdelivr.net/gh/[username]/JCBX-chat-thread-manager@main/src/chat-thread-manager.js
```

Note: This auto-updates when you push to main. Pin to a specific version for stability.

## Verification

After installation, check:

1. **Console**: Press F12 → Console → Look for: `[ChatThreadManager] Loaded. Press Ctrl+Shift+T to open.`
2. **UI**: "Threads" button appears in the menu bar
3. **Test**: Press `Ctrl+Shift+T` to open the modal

## Usage

### Opening the Manager

- Click "Threads" button in menu bar
- Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac)
- Console: `window.ChatThreadManager.showModal()`

### Interface Overview

**Stats Panel:**
- Active Messages count
- Total Threads count
- Messages with Variants count

**Actions:**
- Export Chat as JSON (manual backup)
- Flatten Entire Chat (if threads exist)

**Message List:**
- All active messages in the conversation
- Click to expand messages with thread variants
- Delete individual threads
- Flatten individual messages

### Features

**Export Chat**: Click "Export Chat as JSON" to download a backup. No storage quota issues.

**Delete Thread**: Expand a message → click the trash icon next to any thread variant.

**Flatten Message**: Expand a message → click "Flatten Message" to remove all its thread variants.

**Flatten Chat**: Click "Flatten Entire Chat" at the top to remove all threads from the entire chat.

**Important**: All destructive operations are permanent. Export first!

## Troubleshooting

### Extension not loading

- Check the URL is correct and accessible
- Open URL directly in browser to verify it shows JavaScript code
- Check browser console (F12) for errors
- Try hard reload: `Ctrl+Shift+R`

### Button doesn't work

- Ensure you're in an active chat
- Check browser console for errors
- Try the keyboard shortcut `Ctrl+Shift+T`

### "No Active Chat Detected"

- Make sure you've opened or created a chat
- Wait for the chat to fully load
- URL should contain `#chat=...`

### Changes not visible

Reload the page after deleting or flattening (F5 or Ctrl+R).

## Advanced Usage

### Console API

```javascript
// Open modal
window.ChatThreadManager.showModal()

// Delete specific thread
await window.ChatThreadManager.deleteThread(chatID, messageIndex, threadIndex)

// Flatten entire chat
await window.ChatThreadManager.flattenChat(chatID)

// Flatten one message
await window.ChatThreadManager.flattenMessage(chatID, messageIndex)

// Export chat
window.ChatThreadManager.exportChat(chatData, chatID)

// Check version
window.ChatThreadManager.version
```

## Uninstallation

1. TypingMind → Menu → Preferences → Extensions
2. Remove the extension URL
3. Save and reload

## Best Practices

- Export important chats before using destructive operations
- Test on non-critical chats first
- Store JSON exports somewhere safe
- Review what will be deleted before confirming

## FAQ

**Q: Can I undo a deletion?**
A: No. Export your chat first.

**Q: Where are backups stored?**
A: You manually export as JSON files to your computer.

**Q: Does this work on mobile?**
A: Should work but UI is optimized for desktop.

**Q: Does it work offline?**
A: Once loaded, yes. But needs internet to load initially.

**Q: Is my data safe?**
A: Yes. Everything is client-side. No data leaves your browser.

## Version

Current: v2.0.0

See README.md for changelog.

---

Need help? Check the browser console or open an issue on GitHub.
