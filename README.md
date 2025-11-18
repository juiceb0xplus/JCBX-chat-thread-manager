# TypingMind Chat Thread Manager

A browser extension for TypingMind that lets you manage chat threads created through message edits and regenerations.

## What it does

- View all messages in your chat with their thread variants
- Delete specific thread branches you don't need
- Flatten messages or entire chats to clean up
- Export chats as JSON for backup
- Dark-themed UI that matches TypingMind

## Quick Start

1. **Host the extension**: Fork this repo and enable GitHub Pages, or upload `src/chat-thread-manager.js` to your own server
2. **Add to TypingMind**: Go to Menu → Preferences → Extensions → Add your URL
3. **Use it**: Click the "Threads" button or press `Ctrl+Shift+T`

## Installation

### GitHub Pages (easiest)

1. Fork this repository
2. Enable GitHub Pages in Settings → Pages (source: main branch)
3. Your extension URL will be: `https://[your-username].github.io/JCBX-chat-thread-manager/src/chat-thread-manager.js`
4. In TypingMind: Menu → Preferences → Extensions → paste the URL → Save
5. Reload and you're done

### Your own server

Just upload `src/chat-thread-manager.js` to any web server and use that URL instead.

## Features

**View threads**: See all your messages and expand any with thread variants

**Delete threads**: Remove specific thread branches you experimented with

**Flatten**: Clean up individual messages or the entire chat

**Export**: Download chat as JSON (no storage quota issues)

**Keyboard shortcut**: `Ctrl+Shift+T` to open

## Usage

Open the thread manager by clicking "Threads" in the menu bar or pressing `Ctrl+Shift+T`.

The interface shows:
- All active messages in your current chat
- Which messages have thread variants (highlighted)
- Stats about total messages and threads
- Export and flatten buttons

Click any message to expand and see its thread variants. Each variant can be deleted individually, or flatten the whole message to remove all variants at once.

**Important**: Always export your chat before making destructive changes. There's no undo.

## Safety

- Everything runs in your browser only
- No data is sent to any server
- Exports are standard JSON files you control
- Only install from URLs you trust

## Warnings

- Deleting threads is permanent
- Always backup important chats first
- TypingMind's data structure can change without notice
- This extension has no official support from TypingMind

## Contributing

Found a bug? Have a feature idea? Open an issue or submit a PR.

## License

MIT - see LICENSE file

---

Made for the TypingMind community
