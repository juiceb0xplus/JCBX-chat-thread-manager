# TypingMind Chat Thread Manager

A browser extension for TypingMind that allows users to view, manage, and delete chat threads directly from the UI with a modern dark-mode interface.

## 🎯 Project Goal

Enable users to manage chat conversation threads (created through message edits/regenerations) with a clean, modern UI interface, including:

- View all active messages in the current chat
- Expand messages to see their thread variants
- Delete specific thread variants
- Flatten individual messages or entire chat
- Export chat data as JSON for backup

## 📊 Project Status

**Current Version**: 2.0.0 - Major Refactor! 🎉

- [x] Research TypingMind extension system
- [x] Document extension architecture patterns
- [x] Create data inspection tools
- [x] Inspect actual thread data structure in IndexedDB
- [x] Map UI elements and injection points
- [x] Build working prototype extension
- [x] Implement thread viewer with expandable messages
- [x] Implement delete thread functionality
- [x] Implement flatten individual message functionality
- [x] Implement flatten entire chat functionality
- [x] Implement manual JSON export (no localStorage quota issues)
- [x] Apply modern dark-mode theme
- [x] Fix sidebar button alignment
- [x] Create comprehensive documentation

## 📁 Repository Structure

```
typingmind-chat-thread-manager/
├── README.md                       # Project overview (this file)
├── INSTALLATION.md                 # Installation and usage guide
├── RESEARCH.md                     # Technical research documentation
├── FINDINGS.md                     # Thread data model findings
├── NEXT_STEPS.md                   # Development roadmap
├── RESEARCH_SUMMARY.md             # Research executive summary
├── scripts/
│   └── inspect-data.js             # Data inspection tool
└── src/
    └── chat-thread-manager.js      # Main extension file ✨
```

## 🚀 Quick Start

### Option 1: Install the Extension (Recommended)

1. **Read the installation guide**: [INSTALLATION.md](./INSTALLATION.md)
2. **Host the extension**: Upload `src/chat-thread-manager.js` to GitHub Pages or your server
3. **Add to TypingMind**: Menu → Preferences → Extensions → Add your URL
4. **Start using**: Click "Threads" button or press Ctrl+Shift+T

### Option 2: Explore the Research

If you want to understand how it works:

1. **Read findings**: [FINDINGS.md](./FINDINGS.md) - Thread data model
2. **Read research**: [RESEARCH.md](./RESEARCH.md) - Extension architecture
3. **Run inspection script**: `scripts/inspect-data.js` - Explore your own data

### Features (v2.0.0)

✨ **Active Message View**: See all active messages in your chat with expandable thread lists
🗑️ **Delete Thread Variants**: Remove specific thread branches from any message
🗜️ **Flatten Messages**: Remove all thread variants from a single message
🗜️ **Flatten Entire Chat**: Remove all threads from the chat, keep only active conversation
💾 **Manual Export**: Export chat as JSON file (downloads to your computer - no localStorage quota issues!)
📊 **Statistics**: View active message count, total threads, and messages with variants
🎨 **Modern Dark Theme**: Beautiful gradient design with smooth animations
⌨️ **Keyboard Shortcut**: Quick access with Ctrl+Shift+T

### Usage

```
Ctrl+Shift+T  → Open Thread Manager
Click "Threads" button in menu bar
```

## 🧪 Development Phases

### Phase 1: Research & Discovery ✅ COMPLETE
- ✅ Understand thread data model
- ✅ Map UI elements
- ✅ Create inspection tools
- ✅ Document findings

### Phase 2: Working Prototype ✅ COMPLETE (v2.0.0)
- ✅ Add "Thread Manager" button to TypingMind UI
- ✅ Create modal/panel for thread visualization
- ✅ Display active messages with expandable thread lists
- ✅ Display thread metadata and statistics
- ✅ Implement delete thread functionality
- ✅ Implement flatten individual message functionality
- ✅ Implement flatten entire chat functionality
- ✅ Manual JSON export system (no localStorage)
- ✅ Modern dark-mode theme with gradients
- ✅ Fixed sidebar button alignment
- ✅ Keyboard shortcut (Ctrl+Shift+T)

### Phase 3: Testing & Polish (Next)
- [ ] Test on various chat types
- [ ] Mobile responsive design
- [ ] Performance optimization for large chats
- [ ] Additional UI/UX refinements
- [ ] Configuration options
- [ ] Custom keyboard shortcuts

### Phase 4: Distribution
- [ ] Host on GitHub Pages
- [ ] Create demo video
- [ ] Submit to [awesome-typingmind](https://github.com/TypingMind/awesome-typingmind)
- [ ] Community feedback
- [ ] Bug fixes and improvements

## 🔗 Related Resources

### Official Documentation
- [TypingMind Extensions](https://docs.typingmind.com/typing-mind-extensions)
- [Chat Threads](https://docs.typingmind.com/chat-management/chat-thread)
- [Build Plugins](https://docs.typingmind.com/plugins/build-a-typingmind-plugin)

### Example Extensions
- [awesome-typingmind](https://github.com/TypingMind/awesome-typingmind) - Collection of extensions
- [ContentShield](https://github.com/itcon-pty-au/typingmind-contentshield) - Input monitoring
- [Cloud Backup](https://github.com/itcon-pty-au/typingmind-cloud-backup) - Data sync
- [MCP Extension](https://github.com/iamjackg/typingmind-mcp-extension) - MCP integration

## ⚠️ Important Warnings

- **Data Risk**: Modifying IndexedDB directly can corrupt user data. Always backup first.
- **No Support**: TypingMind provides no official support for extensions.
- **Schema Changes**: Internal data model may change without notice.
- **Security**: Extensions have full access to user data. Be responsible.

## 🤝 Contributing

This is an early-stage research project. Contributions are welcome!

**How to help:**
1. Run the data inspection script and share findings
2. Document UI elements and data-element-id values
3. Test existing TypingMind features with threads
4. Suggest implementation approaches
5. Review and improve documentation

## 📝 License

MIT License - See LICENSE file (to be added)

## 🙏 Acknowledgments

- TypingMind team for creating an extensible platform
- Extension developers in the TypingMind community
- Contributors to awesome-typingmind

---

**Next Step**: Run the data inspection script and document the thread structure!
