/**
 * API клиент для админ-чата (React)
 * 
 * Все запросы используют credentials: 'include' для передачи WordPress cookies
 */

const API_BASE = '/wp-json/cabinet/v1/admin/chat';

/**
 * Получить список диалогов
 * 
 * @returns {Promise<Array>}
 */
export async function getThreads() {
    const response = await fetch(`${API_BASE}/threads`, {
        credentials: 'include',
        headers: {
            'X-WP-Nonce': window.wpApiSettings?.nonce || ''
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to load threads: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || [];
}

/**
 * Получить сообщения диалога
 * 
 * @param {string|number} clientId 
 * @param {number} limit 
 * @param {number} offset 
 * @returns {Promise<Array>}
 */
export async function getMessages(clientId, limit = 50, offset = 0) {
    const params = new URLSearchParams({
        clientId: String(clientId),
        limit: String(limit),
        offset: String(offset)
    });
    
    const response = await fetch(`${API_BASE}/messages?${params}`, {
        credentials: 'include',
        headers: {
            'X-WP-Nonce': window.wpApiSettings?.nonce || ''
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || [];
}

/**
 * Отправить сообщение от менеджера
 * 
 * @param {string|number} clientId 
 * @param {string} message 
 * @param {string|number|null} orderId 
 * @returns {Promise<Object>}
 */
export async function sendMessage(clientId, message, orderId = null) {
    const body = {
        clientId: String(clientId),
        message: message
    };
    
    if (orderId) {
        body.orderId = String(orderId);
    }
    
    const response = await fetch(`${API_BASE}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.wpApiSettings?.nonce || ''
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Failed to send message: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || {};
}

/**
 * Отметить сообщения как прочитанные
 * 
 * @param {string|number} clientId 
 * @returns {Promise<boolean>}
 */
export async function markAsRead(clientId) {
    const response = await fetch(`${API_BASE}/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.wpApiSettings?.nonce || ''
        },
        body: JSON.stringify({
            clientId: String(clientId)
        })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to mark as read: ${response.status}`);
    }
    
    const result = await response.json();
    return result.success || false;
}


