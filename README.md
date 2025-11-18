# TypingMind Chat Thread Manager

A browser extension for TypingMind that allows users to view, manage, trim, and delete chat threads directly from the UI.

## 🎯 Project Goal

Enable users to manage chat conversation threads (created through message edits/regenerations) with a clean UI interface, including:

- View all threads in a conversation
- Navigate between threads
- Delete specific threads
- Trim threads at specific points
- Export individual threads

## 📊 Project Status

**Current Phase**: Phase 2 - COMPLETE! 🎉

- [x] Research TypingMind extension system
- [x] Document extension architecture patterns
- [x] Create data inspection tools
- [x] Inspect actual thread data structure in IndexedDB
- [x] Map UI elements and injection points
- [x] Build working prototype extension
- [x] Implement thread viewer
- [x] Implement delete thread functionality
- [x] Implement flatten chat functionality
- [x] Implement automatic backup system
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

### Features

✨ **Thread Viewer**: See all thread variants in your chat
🗑️ **Delete Threads**: Remove specific thread branches
🗜️ **Flatten Chat**: Remove all threads, keep only active conversation
💾 **Auto Backup**: Automatic backups before destructive operations
♻️ **Restore**: Undo deletions from backup
📊 **Statistics**: View thread counts and analytics

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

### Phase 2: Working Prototype ✅ COMPLETE
- ✅ Add "Thread Manager" button to TypingMind UI
- ✅ Create modal/panel for thread visualization
- ✅ Display thread metadata
- ✅ Implement delete thread functionality
- ✅ Implement flatten chat functionality
- ✅ Automatic backup system
- ✅ Restore from backup

### Phase 3: Testing & Polish (Next)
- [ ] Test on various chat types
- [ ] Mobile responsive design
- [ ] Performance optimization
- [ ] UI/UX refinements
- [ ] Configuration options
- [ ] Keyboard shortcuts customization

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
