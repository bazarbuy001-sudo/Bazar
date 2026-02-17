/**
 * Messages & Chat Module
 */

class MessagesManager {
  constructor() {
    this.chats = [];
    this.currentChat = null;
    this.messages = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Send message button
    document.getElementById('btn-send-message')?.addEventListener('click', () => {
      this.sendMessage();
    });

    // Send on Enter key
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
  }

  async loadChats() {
    try {
      const response = await apiClient.getChats();
      this.chats = response.chats || [];
      this.renderChatsList();

      // Load first chat if available
      if (this.chats.length > 0) {
        this.selectChat(this.chats[0].id);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      dashboardManager.showToast('Ошибка загрузки чатов', 'error');
    }
  }

  renderChatsList() {
    const container = document.getElementById('chats-list-items');

    if (this.chats.length === 0) {
      container.innerHTML = '<p style="padding: 15px; text-align: center; color: #999;">Нет активных чатов</p>';
      return;
    }

    container.innerHTML = this.chats.map(chat => `
      <div class="chat-item ${this.currentChat?.id === chat.id ? 'active' : ''}" 
           style="padding: 12px; border-bottom: 1px solid #e0e0e0; cursor: pointer; ${this.currentChat?.id === chat.id ? 'background: #e3f2fd;' : ''}"
           onclick="messagesManager.selectChat('${chat.id}')">
        <div style="font-weight: 600; font-size: 14px;">${chat.client_name}</div>
        <div style="font-size: 12px; color: #999; margin-top: 5px;">
          ${this.truncate(chat.last_message, 30)}
        </div>
        <div style="font-size: 11px; color: #bbb; margin-top: 3px;">
          ${dashboardManager.formatDate(chat.last_message_at)}
        </div>
      </div>
    `).join('');
  }

  async selectChat(chatId) {
    this.currentChat = this.chats.find(c => c.id === chatId);

    if (!this.currentChat) return;

    try {
      const response = await apiClient.getChatMessages(chatId);
      this.messages = response.messages || [];
      this.renderMessages();

      // Update active chat in list
      document.querySelectorAll('.chat-item').forEach(item => {
        item.style.background = '';
      });
      event?.target?.closest('.chat-item').style.background = '#e3f2fd';
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      dashboardManager.showToast('Ошибка загрузки сообщений', 'error');
    }
  }

  renderMessages() {
    const container = document.getElementById('chat-messages');

    if (this.messages.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Нет сообщений</div>';
      return;
    }

    container.innerHTML = this.messages.map(msg => {
      const isAdmin = msg.sender_type === 'admin';
      return `
        <div style="margin-bottom: 15px; ${isAdmin ? 'text-align: right;' : 'text-align: left;'}">
          <div style="display: inline-block; max-width: 70%; ${isAdmin ? 'background: #1976d2; color: white;' : 'background: #f0f0f0; color: black;'} padding: 10px; border-radius: 8px;">
            <div>${msg.text}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">
              ${this.formatTime(msg.created_at)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();

    if (!text || !this.currentChat) return;

    try {
      await apiClient.sendMessage(this.currentChat.id, { text });
      input.value = '';

      // Reload messages
      this.selectChat(this.currentChat.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      dashboardManager.showToast('Ошибка отправки сообщения', 'error');
    }
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.messagesManager = new MessagesManager();
});
