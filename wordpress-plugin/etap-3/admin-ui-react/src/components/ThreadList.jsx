import { useState } from 'react';

/**
 * Компонент списка диалогов
 */
export default function ThreadList({ threads, activeThread, onOpen }) {
    const [searchQuery, setSearchQuery] = useState('');
    
    // Фильтрация по поисковому запросу
    const filteredThreads = threads.filter(thread => {
        if (!searchQuery) return true;
        
        const query = searchQuery.toLowerCase();
        return (
            thread.clientName.toLowerCase().includes(query) ||
            thread.clientEmail.toLowerCase().includes(query) ||
            thread.clientId.toLowerCase().includes(query) ||
            (thread.lastMessage || '').toLowerCase().includes(query)
        );
    });
    
    // Сортировка: сначала с непрочитанными, потом по дате последнего сообщения
    const sortedThreads = [...filteredThreads].sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        
        const dateA = new Date(a.lastMessageAt || 0);
        const dateB = new Date(b.lastMessageAt || 0);
        return dateB - dateA;
    });
    
    return (
        <div className="chat-sidebar">
            <div className="sidebar-header">
                <h3>💬 Диалоги</h3>
                <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>
            
            <div className="threads-list">
                {sortedThreads.length === 0 ? (
                    <div className="no-threads">
                        {searchQuery ? 'Ничего не найдено' : 'Нет активных диалогов'}
                    </div>
                ) : (
                    sortedThreads.map(thread => (
                        <ThreadItem
                            key={thread.clientId}
                            thread={thread}
                            isActive={activeThread?.clientId === thread.clientId}
                            onClick={() => onOpen(thread)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Компонент элемента диалога
 */
function ThreadItem({ thread, isActive, onClick }) {
    const formatTime = (isoString) => {
        if (!isoString) return '';
        
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    return (
        <div
            className={`thread-item ${isActive ? 'active' : ''} ${thread.unreadCount > 0 ? 'has-unread' : ''}`}
            onClick={onClick}
        >
            <div className="thread-header">
                <strong className="thread-name">{thread.clientName || 'Без имени'}</strong>
                {thread.unreadCount > 0 && (
                    <span className="unread-badge">{thread.unreadCount}</span>
                )}
            </div>
            
            <div className="thread-meta">
                <span className="thread-id">{thread.clientId}</span>
                {thread.clientEmail && (
                    <span className="thread-email">{thread.clientEmail}</span>
                )}
            </div>
            
            {thread.lastMessage && (
                <div className="thread-preview" title={thread.lastMessage}>
                    {thread.lastMessage.length > 50
                        ? thread.lastMessage.substring(0, 50) + '...'
                        : thread.lastMessage}
                </div>
            )}
            
            {thread.lastMessageAt && (
                <div className="thread-time">{formatTime(thread.lastMessageAt)}</div>
            )}
        </div>
    );
}


