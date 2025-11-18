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

**Current Phase**: Phase 1 - Research & Discovery

- [x] Research TypingMind extension system
- [x] Document extension architecture patterns
- [x] Create data inspection tools
- [ ] Inspect actual thread data structure in IndexedDB
- [ ] Map UI elements and injection points
- [ ] Create proof-of-concept prototype

## 📁 Repository Structure

```
typingmind-chat-thread-manager/
├── README.md                 # This file
├── RESEARCH.md              # Comprehensive research documentation
├── scripts/
│   └── inspect-data.js      # Browser console script to inspect IndexedDB
├── src/                     # Extension source code (coming soon)
└── docs/                    # Additional documentation (coming soon)
```

## 🚀 Getting Started

### Step 1: Understand the Extension System

Read [RESEARCH.md](./RESEARCH.md) for comprehensive documentation on:
- How TypingMind extensions work
- Data access patterns
- UI integration techniques
- Implementation examples

### Step 2: Inspect Thread Data Structure

Since TypingMind doesn't document their internal data model, we need to reverse-engineer it:

1. Open TypingMind in your browser
2. Create a test chat with multiple threads:
   - Send a message: "Hello"
   - Click regenerate or edit the assistant's response
   - Navigate using the arrow buttons (← →)
   - Create 2-3 different thread branches
3. Open DevTools (F12) → Console tab
4. Copy the contents of [`scripts/inspect-data.js`](./scripts/inspect-data.js)
5. Paste into console and press Enter
6. Examine the output to understand how threads are stored

### Step 3: Document Findings

After running the inspection script, document your findings:
- How are threads represented in the chat object?
- What properties indicate the current active thread?
- How are messages linked across threads?
- Are there IDs, pointers, or nested structures?

Create an issue or update RESEARCH.md with your findings.

## 🧪 Development Phases

### Phase 1: Research & Discovery ← WE ARE HERE
- Understand thread data model
- Map UI elements
- Create inspection tools
- Document findings

### Phase 2: Read-Only Prototype
- Add "Thread Manager" button to TypingMind UI
- Create modal/panel for thread visualization
- Display thread metadata
- Test on various chat types

### Phase 3: Destructive Operations
- Implement backup system
- Add delete thread functionality
- Add trim thread functionality
- Comprehensive testing

### Phase 4: Polish & Distribution
- UI/UX enhancements
- Configuration options
- Documentation
- Host on GitHub Pages
- Submit to [awesome-typingmind](https://github.com/TypingMind/awesome-typingmind)

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
