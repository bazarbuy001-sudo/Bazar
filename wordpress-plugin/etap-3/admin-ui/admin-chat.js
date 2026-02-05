/**
 * BazarBuy Admin Chat UI
 * 
 * Минимальный интерфейс для менеджеров в WordPress Admin
 * 
 * Использование:
 * 1. Подключите в админ-странице плагина
 * 2. Создайте контейнер: <div id="chat-app"></div>
 * 3. Инициализируйте: new BazarbuyAdminChat()
 */

class BazarbuyAdminChat {
    constructor() {
        this.apiBase = '/wp-json/cabinet/v1/admin/chat';
        this.activeClientId = null;
        this.pollInterval = null;
        this.pollDelay = 3000; // 3 секунды
        
        this.init();
    }
    
    /**
     * Инициализация интерфейса
     */
    init() {
        this.render();
        this.bindEvents();
        this.loadThreads();
        
        // Polling для обновления сообщений
        this.startPolling();
    }
    
    /**
     * Рендер HTML интерфейса
     */
    render() {
        const container = document.getElementById('chat-app');
        if (!container) {
            console.error('[AdminChat] Container #chat-app not found');
            return;
        }
        
        container.innerHTML = `
            <div class="bazarbuy-admin-chat">
                <div class="chat-sidebar">
                    <h3>Диалоги</h3>
                    <div id="threads-list" class="threads-list"></div>
                </div>
                <div class="chat-main">
                    <div id="chat-header" class="chat-header">
                        <h3 id="chat-client-name">Выберите диалог</h3>
                        <span id="unread-badge" class="unread-badge" style="display: none;"></span>
                    </div>
                    <div id="messages-list" class="messages-list"></div>
                    <div class="chat-input-area" style="display: none;">
                        <textarea id="message-input" placeholder="Введите сообщение..." rows="3"></textarea>
                        <button id="send-button" class="button button-primary">Отправить</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Привязать обработчики событий
     */
    bindEvents() {
        const sendButton = document.getElementById('send-button');
        const messageInput = document.getElementById('message-input');
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }
    
    /**
     * Загрузить список диалогов
     */
    async loadThreads() {
        try {
            const response = await fetch(this.apiBase + '/threads', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load threads');
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.renderThreads(result.data);
            }
        } catch (error) {
            console.error('[AdminChat] Error loading threads:', error);
            this.showError('Ошибка загрузки диалогов');
        }
    }
    
    /**
     * Отобразить список диалогов
     */
    renderThreads(threads) {
        const container = document.getElementById('threads-list');
        if (!container) return;
        
        if (threads.length === 0) {
            container.innerHTML = '<p class="no-threads">Нет активных диалогов</p>';
            return;
        }
        
        container.innerHTML = threads.map(thread => `
            <div class="thread-item ${this.activeClientId === thread.clientId ? 'active' : ''}" 
                 data-client-id="${thread.clientId}"
                 data-user-id="${thread.userId}">
                <div class="thread-header">
                    <strong>${this.escapeHtml(thread.clientName)}</strong>
                    ${thread.unreadCount > 0 ? `<span class="unread-count">${thread.unreadCount}</span>` : ''}
                </div>
                <div class="thread-email">${this.escapeHtml(thread.clientEmail)}</div>
                <div class="thread-preview">${this.escapeHtml(thread.lastMessage || '')}</div>
                <div class="thread-time">${this.formatTime(thread.lastMessageAt)}</div>
            </div>
        `).join('');
        
        // Привязать клики
        container.querySelectorAll('.thread-item').forEach(item => {
            item.addEventListener('click', () => {
                const clientId = item.dataset.clientId;
                const userId = item.dataset.userId;
                this.openThread(clientId, userId);
            });
        });
    }
    
    /**
     * Открыть диалог с клиентом
     */
    async openThread(clientId, userId) {
        this.activeClientId = clientId;
        this.activeUserId = userId;
        
        // Обновить выделение в списке
        document.querySelectorAll('.thread-item').forEach(item => {
            item.classList.toggle('active', item.dataset.clientId === clientId);
        });
        
        // Показать заголовок
        const clientName = document.querySelector(`[data-client-id="${clientId}"] .thread-header strong`)?.textContent || 'Клиент';
        document.getElementById('chat-client-name').textContent = clientName;
        
        // Показать область ввода
        document.querySelector('.chat-input-area').style.display = 'block';
        
        // Загрузить сообщения
        await this.loadMessages();
    }
    
    /**
     * Загрузить сообщения текущего диалога
     */
    async loadMessages() {
        if (!this.activeClientId) return;
        
        try {
            const response = await fetch(
                `${this.apiBase}/messages?clientId=${encodeURIComponent(this.activeClientId)}&limit=50`,
                { credentials: 'include' }
            );
            
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.renderMessages(result.data);
                
                // Отметить как прочитанные
                this.markAsRead();
            }
        } catch (error) {
            console.error('[AdminChat] Error loading messages:', error);
        }
    }
    
    /**
     * Отобразить сообщения
     */
    renderMessages(messages) {
        const container = document.getElementById('messages-list');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = '<p class="no-messages">Нет сообщений</p>';
            return;
        }
        
        // Сортируем по времени (старые первыми)
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        container.innerHTML = messages.map(msg => `
            <div class="message-item message-${msg.from}">
                <div class="message-author">${msg.from === 'client' ? 'Клиент' : 'Менеджер'}</div>
                <div class="message-text">${this.escapeHtml(msg.text)}</div>
                <div class="message-time">${this.formatTime(msg.createdAt)}</div>
            </div>
        `).join('');
        
        // Прокрутка вниз
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * Отправить сообщение
     */
    async sendMessage() {
        if (!this.activeClientId) {
            this.showError('Выберите диалог');
            return;
        }
        
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) {
            return;
        }
        
        // Блокируем кнопку
        const button = document.getElementById('send-button');
        button.disabled = true;
        button.textContent = 'Отправка...';
        
        try {
            const response = await fetch(this.apiBase + '/send', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.activeClientId,
                    message: text
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            // Очистить поле ввода
            input.value = '';
            
            // Перезагрузить сообщения
            await this.loadMessages();
            
            // Перезагрузить список диалогов (для обновления последнего сообщения)
            await this.loadThreads();
            
        } catch (error) {
            console.error('[AdminChat] Error sending message:', error);
            this.showError('Ошибка отправки сообщения');
        } finally {
            button.disabled = false;
            button.textContent = 'Отправить';
        }
    }
    
    /**
     * Отметить сообщения как прочитанные
     */
    async markAsRead() {
        if (!this.activeClientId) return;
        
        try {
            await fetch(this.apiBase + '/mark-read', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.activeClientId
                })
            });
            
            // Обновить список диалогов
            await this.loadThreads();
        } catch (error) {
            console.error('[AdminChat] Error marking as read:', error);
        }
    }
    
    /**
     * Начать polling для обновления сообщений
     */
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(() => {
            if (this.activeClientId) {
                this.loadMessages();
            }
            this.loadThreads();
        }, this.pollDelay);
    }
    
    /**
     * Остановить polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    /**
     * Экранирование HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Форматирование времени
     */
    formatTime(isoString) {
        if (!isoString) return '';
        
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'только что';
        }
        
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} мин. назад`;
        }
        
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} ч. назад`;
        }
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * Показать ошибку
     */
    showError(message) {
        // Простое уведомление (можно заменить на toast)
        alert(message);
    }
}

// Автоинициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('chat-app')) {
            window.bazarbuyAdminChat = new BazarbuyAdminChat();
        }
    });
} else {
    if (document.getElementById('chat-app')) {
        window.bazarbuyAdminChat = new BazarbuyAdminChat();
    }
}


