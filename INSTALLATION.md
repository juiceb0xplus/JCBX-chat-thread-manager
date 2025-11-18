# Installation

This project is just a single JavaScript file, so pick whatever hosting method you like and point TypingMind at it.

## 1. GitHub Pages
1. Fork → Settings → Pages → serve `main`.
2. Use `https://<username>.github.io/JCBX-chat-thread-manager/src/chat-thread-manager.js` as the extension URL inside TypingMind (Menu → Preferences → Extensions).

## 2. Your own host
1. Upload `src/chat-thread-manager.js` somewhere HTTPS-accessible.
2. Paste that URL into TypingMind's Extensions form and save.

## 3. jsDelivr CDN
If you prefer CDN delivery, replace `<username>` and optionally pin to a specific tag:
```
https://cdn.jsdelivr.net/gh/<username>/JCBX-chat-thread-manager@main/src/chat-thread-manager.js
```

After saving the URL in TypingMind, reload the page once. You should see a **Threads** button next to Settings, and `Ctrl/Cmd+Shift+T` will open the manager.
