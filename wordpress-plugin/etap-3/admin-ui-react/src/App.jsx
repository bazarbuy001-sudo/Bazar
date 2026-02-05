import { useEffect, useState } from 'react';
import { getThreads, getMessages, sendMessage, markAsRead } from './api';
import ThreadList from './components/ThreadList';
import ChatWindow from './components/ChatWindow';

/**
 * Главный компонент админ-чата
 */
export default function App() {
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Polling интервал (3 секунды)
    const POLL_INTERVAL = 3000;
    
    useEffect(() => {
        // Загружаем список диалогов при монтировании
        loadThreads();
        
        // Polling для обновления
        const interval = setInterval(() => {
            if (activeThread) {
                refreshMessages();
            }
            loadThreads();
        }, POLL_INTERVAL);
        
        return () => clearInterval(interval);
    }, [activeThread]);
    
    /**
     * Загрузить список диалогов
     */
    async function loadThreads() {
        try {
            const data = await getThreads();
            setThreads(data);
            setError(null);
        } catch (err) {
            console.error('[App] Error loading threads:', err);
            setError('Ошибка загрузки диалогов');
        }
    }
    
    /**
     * Открыть диалог
     */
    async function openThread(thread) {
        setActiveThread(thread);
        setIsLoading(true);
        setError(null);
        
        try {
            const data = await getMessages(thread.clientId);
            setMessages(data);
            
            // Отмечаем как прочитанные
            await markAsRead(thread.clientId);
            
            // Обновляем список диалогов (сбрасываем unreadCount)
            await loadThreads();
        } catch (err) {
            console.error('[App] Error loading messages:', err);
            setError('Ошибка загрузки сообщений');
        } finally {
            setIsLoading(false);
        }
    }
    
    /**
     * Обновить сообщения текущего диалога
     */
    async function refreshMessages() {
        if (!activeThread) return;
        
        try {
            const data = await getMessages(activeThread.clientId);
            setMessages(data);
        } catch (err) {
            console.error('[App] Error refreshing messages:', err);
        }
    }
    
    /**
     * Отправить сообщение
     */
    async function handleSend(text) {
        if (!activeThread || !text.trim()) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            await sendMessage(activeThread.clientId, text, activeThread.orderId || null);
            
            // Обновляем сообщения
            await refreshMessages();
            
            // Обновляем список диалогов
            await loadThreads();
        } catch (err) {
            console.error('[App] Error sending message:', err);
            setError('Ошибка отправки сообщения');
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <div className="bazarbuy-admin-chat">
            <ThreadList 
                threads={threads}
                activeThread={activeThread}
                onOpen={openThread}
            />
            
            {activeThread ? (
                <ChatWindow
                    thread={activeThread}
                    messages={messages}
                    isLoading={isLoading}
                    error={error}
                    onSend={handleSend}
                />
            ) : (
                <div className="chat-window-empty">
                    <p>Выберите диалог для начала общения</p>
                </div>
            )}
        </div>
    );
}


