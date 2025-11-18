# Chat Thread Manager

A small browser-side helper that lets you browse, prune, and export every branch hidden inside TypingMind chats. It plugs into TypingMind's extension slot but is its own project and not an official TypingMind feature.

## Highlights

- Lists every message plus its alternate branches in one scrollable panel
- Delete individual variants or flatten a whole message/chat when things get messy
- Export the active chat as a TypingMind-compatible JSON file
- Dark UI, keyboard shortcut (`Ctrl/Cmd+Shift+T`), and zero network calls

## Setup

You just need to host `src/chat-thread-manager.js` somewhere that TypingMind can load.

### Option 1: GitHub Pages
1. Fork this repo.
2. Settings → Pages → serve the `main` branch.
3. Your script URL will be `https://<username>.github.io/JCBX-chat-thread-manager/src/chat-thread-manager.js`.
4. In TypingMind: Menu → Preferences → Extensions → paste the URL → Save → reload.

### Option 2: Any static host
Upload `src/chat-thread-manager.js` to your server, note the HTTPS URL, and drop it into the TypingMind Extensions panel.

### Option 3: jsDelivr (auto updates)
```
https://cdn.jsdelivr.net/gh/<username>/JCBX-chat-thread-manager@main/src/chat-thread-manager.js
```
Pin to a tag/commit if you don't want automatic updates.

## Using the manager
1. Open a chat in TypingMind.
2. Click the new **Threads** button in the top bar (or hit `Ctrl/Cmd+Shift+T`).
3. Expand a message to see every stored variant.
4. Use the per-thread delete button, the message-level "Flatten" button, or "Flatten entire chat" if you want to start fresh.
5. Export before doing destructive edits—it's a raw JSON dump that TypingMind can re-import.

Everything runs locally. The script only touches the same IndexedDB TypingMind already uses.

## Tips & notes
- The extension waits for TypingMind's UI to load; if you don't see the button, reload once.
- Keyboard shortcut can be triggered via console with `window.ChatThreadManager.showModal()`.
- Deleting or flattening cannot be undone. Export often.
- Works best on desktop browsers. Mobile layouts are usable but cramped.

## Development
- `src/chat-thread-manager.js` is the extension entry point.
- `scripts/inspect-data.js` is a console helper for peeking at TypingMind's data model.
- No build step: edit, host, refresh.

## License
MIT. See [LICENSE](LICENSE).
