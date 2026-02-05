import { useState, useEffect, useRef } from 'react';
import Message from './Message';

/**
 * Компонент окна чата
 */
export default function ChatWindow({ thread, messages, isLoading, error, onSend }) {
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    
    // Автопрокрутка при новых сообщениях
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    // Фокус на input при открытии
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [thread]);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!inputText.trim() || isSending) return;
        
        setIsSending(true);
        try {
            await onSend(inputText.trim());
            setInputText('');
        } catch (err) {
            console.error('[ChatWindow] Send error:', err);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };
    
    return (
        <div className="chat-main">
            <div className="chat-header">
                <div>
                    <h3>{thread.clientName || 'Клиент'}</h3>
                    <div className="chat-header-meta">
                        <span className="client-id">{thread.clientId}</span>
                        {thread.clientEmail && (
                            <span className="client-email">{thread.clientEmail}</span>
                        )}
                    </div>
                </div>
                {thread.unreadCount > 0 && (
                    <span className="unread-badge">{thread.unreadCount} непрочитано</span>
                )}
            </div>
            
            {error && (
                <div className="chat-error">
                    ⚠️ {error}
                </div>
            )}
            
            <div className="messages-container">
                {isLoading && messages.length === 0 ? (
                    <div className="loading">Загрузка сообщений...</div>
                ) : messages.length === 0 ? (
                    <div className="no-messages">
                        Нет сообщений. Начните общение!
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map(message => (
                            <Message key={message.id} message={message} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>
            
            <form className="chat-input-form" onSubmit={handleSubmit}>
                <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Введите сообщение... (Enter для отправки, Shift+Enter для новой строки)"
                    rows="3"
                    disabled={isSending}
                    className="message-input"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="send-button"
                >
                    {isSending ? 'Отправка...' : 'Отправить'}
                </button>
            </form>
        </div>
    );
}


