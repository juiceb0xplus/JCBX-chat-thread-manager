/**
 * TypingMind Data Inspection Script
 *
 * USAGE:
 * 1. Open TypingMind in your browser
 * 2. Create a test chat with multiple threads:
 *    - Send a message
 *    - Edit or regenerate the assistant's response
 *    - Navigate between threads using arrows
 * 3. Open browser DevTools (F12)
 * 4. Go to Console tab
 * 5. Copy and paste this entire script
 * 6. Press Enter to run
 * 7. Examine the output to understand thread data structure
 */

(function inspectTypingMindData() {
  'use strict';

  console.log('%c=== TypingMind Data Inspection Tool ===', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
  console.log('Starting IndexedDB inspection...\n');

  const request = indexedDB.open('keyval-store');

  request.onsuccess = (event) => {
    const db = event.target.result;
    console.log('✓ Database opened successfully');

    const transaction = db.transaction(['keyval'], 'readonly');
    const objectStore = transaction.objectStore('keyval');
    const getAllKeysRequest = objectStore.getAllKeys();
    const getAllRequest = objectStore.getAll();

    Promise.all([
      new Promise(r => {
        getAllKeysRequest.onsuccess = () => r(getAllKeysRequest.result);
        getAllKeysRequest.onerror = () => r([]);
      }),
      new Promise(r => {
        getAllRequest.onsuccess = () => r(getAllRequest.result);
        getAllRequest.onerror = () => r([]);
      })
    ]).then(([keys, values]) => {

      // ========================================
      // 1. OVERVIEW
      // ========================================

      console.log('\n%c1. DATA OVERVIEW', 'color: #10b981; font-size: 14px; font-weight: bold;');
      console.log(`Total entries in database: ${keys.length}`);

      // Categorize keys
      const categories = {
        chats: keys.filter(k => k.startsWith('CHAT_')),
        settings: keys.filter(k => k.startsWith('TM_')),
        other: keys.filter(k => !k.startsWith('CHAT_') && !k.startsWith('TM_'))
      };

      console.log(`  Chats: ${categories.chats.length}`);
      console.log(`  Settings: ${categories.settings.length}`);
      console.log(`  Other: ${categories.other.length}`);

      // ========================================
      // 2. CHAT ANALYSIS
      // ========================================

      const chats = [];
      keys.forEach((key, index) => {
        if (key.startsWith('CHAT_')) {
          chats.push({ key, data: values[index] });
        }
      });

      console.log('\n%c2. CHAT STRUCTURE ANALYSIS', 'color: #10b981; font-size: 14px; font-weight: bold;');

      if (chats.length === 0) {
        console.log('⚠ No chats found. Create a chat first, then run this script again.');
        return;
      }

      // Analyze all unique keys across all chats
      const allChatKeys = new Set();
      const keyFrequency = {};

      chats.forEach(({ data }) => {
        Object.keys(data).forEach(key => {
          allChatKeys.add(key);
          keyFrequency[key] = (keyFrequency[key] || 0) + 1;
        });
      });

      console.log(`Analyzed ${chats.length} chat(s)`);
      console.log('\n%cAll unique keys found in chat objects:', 'font-weight: bold;');
      console.table(
        Array.from(allChatKeys).sort().map(key => ({
          'Key': key,
          'Frequency': `${keyFrequency[key]}/${chats.length} chats`,
          'Type': typeof chats[0].data[key]
        }))
      );

      // ========================================
      // 3. THREAD DETECTION
      // ========================================

      console.log('\n%c3. THREAD-RELATED DATA DETECTION', 'color: #10b981; font-size: 14px; font-weight: bold;');

      // Look for thread-related keys
      const threadRelatedKeys = Array.from(allChatKeys).filter(key =>
        key.toLowerCase().includes('thread') ||
        key.toLowerCase().includes('branch') ||
        key.toLowerCase().includes('version') ||
        key.toLowerCase().includes('variant') ||
        key.toLowerCase().includes('history') ||
        key.toLowerCase().includes('tree') ||
        key.toLowerCase().includes('node') ||
        key.toLowerCase().includes('path')
      );

      if (threadRelatedKeys.length > 0) {
        console.log('Found potential thread-related keys:');
        threadRelatedKeys.forEach(key => {
          console.log(`  • ${key}:`, chats[0].data[key]);
        });
      } else {
        console.log('⚠ No obvious thread-related keys found.');
        console.log('  Threads might be embedded in messages array or use a different structure.');
      }

      // ========================================
      // 4. DETAILED CHAT INSPECTION
      // ========================================

      console.log('\n%c4. DETAILED CHAT STRUCTURE', 'color: #10b981; font-size: 14px; font-weight: bold;');

      // Find chat with most messages (likely to have threads)
      const chatWithMostMessages = chats.reduce((max, chat) => {
        const messageCount = chat.data.messages?.length || 0;
        const maxCount = max.data.messages?.length || 0;
        return messageCount > maxCount ? chat : max;
      }, chats[0]);

      console.log(`\nInspecting chat: ${chatWithMostMessages.data.chatTitle || 'Untitled'}`);
      console.log(`Chat ID: ${chatWithMostMessages.key}`);
      console.log(`Messages: ${chatWithMostMessages.data.messages?.length || 0}`);
      console.log(`Created: ${new Date(chatWithMostMessages.data.createdAt).toLocaleString()}`);
      console.log(`Updated: ${new Date(chatWithMostMessages.data.updatedAt).toLocaleString()}`);

      // ========================================
      // 5. MESSAGE STRUCTURE
      // ========================================

      console.log('\n%c5. MESSAGE STRUCTURE ANALYSIS', 'color: #10b981; font-size: 14px; font-weight: bold;');

      const messages = chatWithMostMessages.data.messages || [];

      if (messages.length > 0) {
        console.log(`\nFound ${messages.length} messages`);

        // Analyze first message structure
        console.log('\n%cFirst message structure:', 'font-weight: bold;');
        const firstMessage = messages[0];
        console.log('Keys:', Object.keys(firstMessage));
        console.log('Full structure:', firstMessage);

        // Check for thread-related properties in messages
        const messageKeys = new Set();
        messages.forEach(msg => {
          Object.keys(msg).forEach(key => messageKeys.add(key));
        });

        const messageThreadKeys = Array.from(messageKeys).filter(key =>
          key.toLowerCase().includes('thread') ||
          key.toLowerCase().includes('branch') ||
          key.toLowerCase().includes('version') ||
          key.toLowerCase().includes('next') ||
          key.toLowerCase().includes('prev') ||
          key.toLowerCase().includes('parent') ||
          key.toLowerCase().includes('child') ||
          key.toLowerCase().includes('sibling')
        );

        if (messageThreadKeys.length > 0) {
          console.log('\n%cThread-related properties in messages:', 'font-weight: bold; color: #f59e0b;');
          messageThreadKeys.forEach(key => {
            console.log(`  • ${key}`);
            // Show examples
            messages.slice(0, 3).forEach((msg, i) => {
              if (msg[key] !== undefined) {
                console.log(`    [msg ${i}]:`, msg[key]);
              }
            });
          });
        } else {
          console.log('\n⚠ No obvious thread properties in message objects');
        }

        // Check message content structure
        console.log('\n%cMessage content types:', 'font-weight: bold;');
        const contentTypes = messages.reduce((types, msg) => {
          const type = typeof msg.content;
          types[type] = (types[type] || 0) + 1;
          return types;
        }, {});
        console.table(contentTypes);

        // Look for array-type content (might indicate branches)
        const arrayContentMessages = messages.filter(msg => Array.isArray(msg.content));
        if (arrayContentMessages.length > 0) {
          console.log('\n%c⚡ Found messages with array content (possible thread indicator!):', 'font-weight: bold; color: #f59e0b;');
          console.log(`  ${arrayContentMessages.length} message(s) have array content`);
          console.log('  Example:', arrayContentMessages[0]);
        }
      } else {
        console.log('⚠ No messages found in this chat');
      }

      // ========================================
      // 6. COMPLETE DATA DUMP
      // ========================================

      console.log('\n%c6. COMPLETE DATA STRUCTURES', 'color: #10b981; font-size: 14px; font-weight: bold;');
      console.log('\n%cChat object (full):', 'font-weight: bold;');
      console.log('window.inspectedChat =', chatWithMostMessages.data);
      window.inspectedChat = chatWithMostMessages.data;

      console.log('\n%cAll chats:', 'font-weight: bold;');
      console.log('window.allChats =', chats);
      window.allChats = chats;

      // ========================================
      // 7. RECOMMENDATIONS
      // ========================================

      console.log('\n%c7. NEXT STEPS & RECOMMENDATIONS', 'color: #10b981; font-size: 14px; font-weight: bold;');
      console.log('\n📋 To explore further:');
      console.log('  1. Type: window.inspectedChat');
      console.log('     → View the most detailed chat object');
      console.log('  2. Type: window.inspectedChat.messages');
      console.log('     → View all messages');
      console.log('  3. Type: window.allChats');
      console.log('     → View all chat objects');
      console.log('\n🧪 To test thread structure:');
      console.log('  1. Edit or regenerate a message in the current chat');
      console.log('  2. Re-run this script');
      console.log('  3. Compare the before/after structures');
      console.log('\n💡 Look for:');
      console.log('  • New properties added after creating threads');
      console.log('  • Changes in message array structure');
      console.log('  • Any ID fields that link messages together');
      console.log('  • Properties tracking current/active thread');

      // ========================================
      // 8. LOCALSTORAGE INSPECTION
      // ========================================

      console.log('\n%c8. LOCALSTORAGE DATA', 'color: #10b981; font-size: 14px; font-weight: bold;');

      const relevantLSKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('TM_') ||
        key.toLowerCase().includes('chat') ||
        key.toLowerCase().includes('thread')
      );

      console.log(`Found ${relevantLSKeys.length} relevant localStorage keys:`);
      relevantLSKeys.slice(0, 20).forEach(key => {
        const value = localStorage.getItem(key);
        let preview = value;

        if (value.length > 100) {
          preview = value.substring(0, 100) + '...';
        }

        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'object') {
            preview = `Object with keys: ${Object.keys(parsed).join(', ')}`;
          }
        } catch (e) {
          // Not JSON, use string preview
        }

        console.log(`  • ${key}: ${preview}`);
      });

      console.log('\n%c✓ Inspection complete!', 'color: #10b981; font-size: 14px; font-weight: bold;');
      console.log('Check the output above to understand TypingMind\'s data structure.\n');
    });
  };

  request.onerror = () => {
    console.error('%c✗ Failed to open IndexedDB', 'color: #ef4444; font-size: 14px; font-weight: bold;');
    console.error('Error:', request.error);
    console.log('\nTroubleshooting:');
    console.log('  • Make sure you\'re running this in the TypingMind browser tab');
    console.log('  • Check if IndexedDB is enabled in your browser');
    console.log('  • Try refreshing the page and running again');
  };

})();
