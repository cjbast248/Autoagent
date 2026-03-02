
(function() {
  'use strict';

  // Prevent multiple widget initializations
  if (window.KalinaWidget) {
    return;
  }

  // Configuration
  const SUPABASE_URL = 'https://pwfczzxwjfxomqzhhwvj.supabase.co';
  const CHAT_ENDPOINT = `${SUPABASE_URL}/functions/v1/kalina-chat`;

  // Widget class
  class KalinaWidget {
    constructor(element) {
      this.element = element;
      this.agentId = element.getAttribute('agent-id');
      this.isOpen = false;
      this.isTyping = false;
      this.conversation = [];
      this.audioQueue = [];
      this.currentAudio = null;
      
      if (!this.agentId) {
        console.error('Kalina Widget: agent-id attribute is required');
        return;
      }

      this.init();
    }

    init() {
      this.createStyles();
      this.createWidget();
      this.attachEventListeners();
    }

    createStyles() {
      if (document.getElementById('kalina-widget-styles')) return;

      const styles = document.createElement('style');
      styles.id = 'kalina-widget-styles';
      styles.textContent = `
        .kalina-widget-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .kalina-widget-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          color: white;
          font-size: 24px;
        }

        .kalina-widget-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .kalina-widget-chat {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 380px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e1e5e9;
        }

        .kalina-widget-chat.open {
          display: flex;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .kalina-widget-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kalina-widget-agent-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .kalina-widget-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .kalina-widget-agent-name {
          font-weight: 600;
          font-size: 16px;
        }

        .kalina-widget-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .kalina-widget-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .kalina-widget-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .kalina-widget-message {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }

        .kalina-widget-message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .kalina-widget-message.assistant {
          align-self: flex-start;
        }

        .kalina-widget-message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .kalina-widget-message.user .kalina-widget-message-avatar {
          background: #007bff;
          color: white;
        }

        .kalina-widget-message.assistant .kalina-widget-message-avatar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .kalina-widget-message-content {
          background: #f8f9fa;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .kalina-widget-message.user .kalina-widget-message-content {
          background: #007bff;
          color: white;
        }

        .kalina-widget-typing {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          margin-bottom: 16px;
        }

        .kalina-widget-typing-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .kalina-widget-typing-dots {
          display: flex;
          gap: 4px;
        }

        .kalina-widget-typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ccc;
          animation: typing 1.4s infinite;
        }

        .kalina-widget-typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .kalina-widget-typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .kalina-widget-input-area {
          padding: 20px;
          border-top: 1px solid #e1e5e9;
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .kalina-widget-input {
          flex: 1;
          border: 1px solid #e1e5e9;
          border-radius: 20px;
          padding: 12px 16px;
          font-size: 14px;
          resize: none;
          outline: none;
          max-height: 100px;
          min-height: 20px;
          line-height: 1.4;
        }

        .kalina-widget-input:focus {
          border-color: #667eea;
        }

        .kalina-widget-send {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          font-size: 16px;
        }

        .kalina-widget-send:hover {
          transform: scale(1.1);
        }

        .kalina-widget-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 420px) {
          .kalina-widget-chat {
            width: calc(100vw - 40px);
            right: 20px;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    createWidget() {
      const container = document.createElement('div');
      container.className = 'kalina-widget-container';
      container.innerHTML = `
        <button class="kalina-widget-button" id="kalina-toggle-btn">
          💬
        </button>
        <div class="kalina-widget-chat" id="kalina-chat">
          <div class="kalina-widget-header">
            <div class="kalina-widget-agent-info">
              <div class="kalina-widget-avatar">🤖</div>
              <div class="kalina-widget-agent-name">AI Assistant</div>
            </div>
            <button class="kalina-widget-close" id="kalina-close-btn">×</button>
          </div>
          <div class="kalina-widget-messages" id="kalina-messages">
            <div class="kalina-widget-message assistant">
              <div class="kalina-widget-message-avatar">🤖</div>
              <div class="kalina-widget-message-content">
                Salut! Sunt aici să te ajut. Cu ce te pot ajuta astăzi?
              </div>
            </div>
          </div>
          <div class="kalina-widget-input-area">
            <textarea 
              class="kalina-widget-input" 
              id="kalina-input" 
              placeholder="Scrie mesajul tău aici..."
              rows="1"
            ></textarea>
            <button class="kalina-widget-send" id="kalina-send-btn">➤</button>
          </div>
        </div>
      `;

      this.element.appendChild(container);
      
      // Cache DOM elements
      this.toggleBtn = container.querySelector('#kalina-toggle-btn');
      this.chatWindow = container.querySelector('#kalina-chat');
      this.closeBtn = container.querySelector('#kalina-close-btn');
      this.messagesContainer = container.querySelector('#kalina-messages');
      this.input = container.querySelector('#kalina-input');
      this.sendBtn = container.querySelector('#kalina-send-btn');
    }

    attachEventListeners() {
      this.toggleBtn.addEventListener('click', () => this.toggleChat());
      this.closeBtn.addEventListener('click', () => this.closeChat());
      this.sendBtn.addEventListener('click', () => this.sendMessage());
      
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      this.input.addEventListener('input', () => {
        this.autoResize();
      });
    }

    autoResize() {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
    }

    toggleChat() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }

    openChat() {
      this.isOpen = true;
      this.chatWindow.classList.add('open');
      this.input.focus();
    }

    closeChat() {
      this.isOpen = false;
      this.chatWindow.classList.remove('open');
    }

    async sendMessage() {
      const message = this.input.value.trim();
      if (!message || this.isTyping) return;

      // Add user message to conversation
      this.addMessage('user', message);
      this.conversation.push({ role: 'user', content: message });
      
      // Clear input
      this.input.value = '';
      this.autoResize();
      
      // Show typing indicator
      this.showTypingIndicator();
      
      try {
        // Send to backend
        const response = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: this.agentId,
            message: message,
            conversation_history: this.conversation.slice(-10) // Keep last 10 messages for context
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Hide typing indicator
        this.hideTypingIndicator();
        
        if (data.error) {
          throw new Error(data.error);
        }

        // Add assistant response
        this.addMessage('assistant', data.text || data.message || 'Ne pare rău, nu am putut genera un răspuns.');
        this.conversation.push({ role: 'assistant', content: data.text || data.message });
        
        // Play audio if available
        if (data.audio) {
          this.playAudio(data.audio);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        this.hideTypingIndicator();
        this.addMessage('assistant', 'Ne pare rău, a apărut o eroare. Te rog să încerci din nou.');
      }
    }

    addMessage(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `kalina-widget-message ${role}`;
      
      const avatar = role === 'user' ? '👤' : '🤖';
      
      messageDiv.innerHTML = `
        <div class="kalina-widget-message-avatar">${avatar}</div>
        <div class="kalina-widget-message-content">${this.escapeHtml(content)}</div>
      `;
      
      this.messagesContainer.appendChild(messageDiv);
      this.scrollToBottom();
    }

    showTypingIndicator() {
      if (this.isTyping) return;
      
      this.isTyping = true;
      this.sendBtn.disabled = true;
      
      const typingDiv = document.createElement('div');
      typingDiv.className = 'kalina-widget-typing';
      typingDiv.id = 'kalina-typing-indicator';
      typingDiv.innerHTML = `
        <div class="kalina-widget-typing-avatar">🤖</div>
        <div class="kalina-widget-typing-dots">
          <div class="kalina-widget-typing-dot"></div>
          <div class="kalina-widget-typing-dot"></div>
          <div class="kalina-widget-typing-dot"></div>
        </div>
      `;
      
      this.messagesContainer.appendChild(typingDiv);
      this.scrollToBottom();
    }

    hideTypingIndicator() {
      this.isTyping = false;
      this.sendBtn.disabled = false;
      
      const typingIndicator = document.getElementById('kalina-typing-indicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
    }

    playAudio(audioDataUrl) {
      try {
        const audio = new Audio(audioDataUrl);
        audio.play().catch(e => {
          console.log('Audio autoplay prevented:', e);
        });
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }

    scrollToBottom() {
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 100);
    }

    escapeHtml(text) {
      if (!text || typeof text !== 'string') return '';
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;'
      };
      return String(text).replace(/[&<>"'\/]/g, function(m) { return map[m]; });
    }
  }

  // Initialize widget when DOM is ready
  function initializeWidgets() {
    const widgets = document.querySelectorAll('kalina-chat-widget');
    widgets.forEach(widget => {
      if (!widget._kalinaInitialized) {
        new KalinaWidget(widget);
        widget._kalinaInitialized = true;
      }
    });
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidgets);
  } else {
    initializeWidgets();
  }

  // Also initialize on dynamic content changes
  const observer = new MutationObserver(() => {
    initializeWidgets();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Export for manual initialization
  window.KalinaWidget = KalinaWidget;
})();
