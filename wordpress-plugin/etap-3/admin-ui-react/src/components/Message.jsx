/**
 * Компонент одного сообщения
 */
export default function Message({ message }) {
    const formatTime = (isoString) => {
        if (!isoString) return '';
        
        const date = new Date(isoString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const isFromClient = message.from === 'client';
    const isFromManager = message.from === 'manager';
    const isFromSystem = message.from === 'system';
    
    return (
        <div className={`message-item message-${message.from}`}>
            <div className="message-header">
                <span className="message-author">
                    {isFromClient && '👤 Клиент'}
                    {isFromManager && '👨‍💼 Менеджер'}
                    {isFromSystem && '🔔 Система'}
                </span>
                <span className="message-time">{formatTime(message.createdAt)}</span>
            </div>
            
            <div className="message-text">{message.text}</div>
            
            {message.status && (
                <div className="message-status">
                    {message.status === 'pending' && '⏳ Отправляется...'}
                    {message.status === 'delivered' && '✓ Доставлено'}
                    {message.status === 'read' && '✓✓ Прочитано'}
                    {message.status === 'failed' && '❌ Ошибка'}
                </div>
            )}
        </div>
    );
}


