/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CABINET-API.JS — Абстракция API для Личного кабинета
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ПРАВИЛА:
 * - НЕ ТРОГАТЬ структуру CabinetAPI — она фиксирована
 * - МОЖНО менять CONFIG.baseURL при смене backend
 * - МОЖНО менять endpoints при смене путей API
 * 
 * MOCK MODE:
 * - Установите CONFIG.useMock = true для локальной разработки без backend
 * - Mock data имитирует реальное API с задержками
 */

const CabinetAPI = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ (МОЖНО МЕНЯТЬ ПУТИ)
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        baseURL: '/api/v1',              // Backend API базовый путь
        useMock: false,                   // false для использования реального backend
        mockDelay: 300,                   // Задержка mock ответов (мс)
        timeout: 15000,                   // Таймаут запросов (мс)
        
        // Endpoints (можно менять пути, но не структуру)
        endpoints: {
            // Авторизация
            authCheck: '/auth/me',
            login: '/auth/login',
            register: '/auth/register',
            socialAuth: '/auth/social',
            logout: '/auth/logout',
            
            // Клиент (вместо profile)
            client: '/user/client',
            profile: '/user/profile',
            
            // Заказы
            orders: '/orders',
            orderDetails: '/orders/{id}',
            
            // Реквизиты
            requisites: '/user/requisites',
            
            // ЧАТ (новые endpoints)
            chatHistory: '/chat/history',
            chatSend: '/chat/send',
            telegramNotify: '/telegram/notify'
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MOCK DATA (для разработки без backend)
    // ═══════════════════════════════════════════════════════════════════════════

    const mockData = {
        // Клиент (заменяет user)
        client: {
            id: 'user_001',
            clientId: 'CL-000001',
            email: 'test@example.com',
            authProvider: 'email',
            name: 'ООО "Тестовая Компания"',
            city: 'Москва',
            phone: '+7 (999) 123-45-67',
            isFirstLogin: true,
            emailVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-01-15T10:30:00Z'
        },
        
        // Заказы
        orders: [
            {
                id: 'ORD-2024-001',
                status: 'На согласовании',
                createdAt: '2024-01-15T10:30:00Z',
                items: [
                    { productId: 'prod_001', name: 'Ткань A', color: 'Белый', meters: 150, rolls: 3, price: 15000 },
                    { productId: 'prod_002', name: 'Ткань B', color: 'Серый', meters: 75, rolls: 1, price: 7500 }
                ],
                total: 22500,
                delivery: null
            },
            {
                id: 'ORD-2024-002',
                status: 'Исполнен',
                createdAt: '2024-01-10T09:00:00Z',
                items: [
                    { productId: 'prod_003', name: 'Ткань C', color: 'Чёрный', meters: 200, rolls: 4, price: 20000 }
                ],
                total: 20000,
                delivery: {
                    address: 'г. Москва, ул. Примерная, д. 1',
                    deliveredAt: '2024-01-12T15:00:00Z'
                }
            }
        ],
        
        // Реквизиты
        requisites: {
            name: 'ООО "Тестовая Компания"',
            currency: 'RUB',
            recipient: 'Иванов Иван Иванович',
            inn: '7701234567',
            regNumber: 'ОГРН 1027700000001',
            legalAddress: 'г. Москва, ул. Юридическая, д. 1',
            postalAddress: 'г. Москва, ул. Почтовая, д. 2',
            bank: 'ПАО "Сбербанк"',
            correspondentBank: null,
            updatedAt: '2024-01-15T11:00:00Z'
        },
        
        // История чата
        chatHistory: [
            {
                id: 'msg_001',
                sender: 'client',
                text: 'Здравствуйте, есть ли ткань в наличии?',
                createdAt: '2024-01-15T10:31:00Z',
                orderId: 'ORD-2024-001'
            },
            {
                id: 'msg_002',
                sender: 'system',
                text: '✅ К разговору подключился менеджер',
                createdAt: '2024-01-15T10:32:00Z'
            },
            {
                id: 'msg_003',
                sender: 'manager',
                text: 'Добрый день! Да, всё в наличии. Готов оформить заказ.',
                createdAt: '2024-01-15T10:33:00Z',
                orderId: 'ORD-2024-001'
            }
        ]
    };

    // Состояние mock авторизации
    let mockAuthState = {
        isAuthenticated: false,
        token: null
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ВНУТРЕННИЕ ХЕЛПЕРЫ
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Получить токен авторизации
     */
    function getAuthToken() {
        return localStorage.getItem('cabinet_token');
    }

    /**
     * Сохранить токен авторизации
     */
    function setAuthToken(token) {
        if (token) {
            localStorage.setItem('cabinet_token', token);
        } else {
            localStorage.removeItem('cabinet_token');
        }
    }

    /**
     * Имитация задержки для mock запросов
     */
    function mockDelay() {
        return new Promise(resolve => setTimeout(resolve, CONFIG.mockDelay));
    }

    /**
     * Задача 5: Форматирование сообщения для Telegram
     * ЕДИНЫЙ ФОРМАТ для всех уведомлений
     * 
     * @param {Object} data — данные из notifyTelegram или sendChatMessage
     * @returns {string} — отформатированное сообщение
     */
    function formatTelegramMessage(data) {
        const clientId = data.clientId || 'N/A';
        const clientName = data.clientName || '';
        const clientCity = data.clientCity || '';
        const clientEmail = data.clientEmail || '';
        const activeOrdersCount = data.activeOrdersCount ?? 0;
        const orderId = data.orderId || null;
        const text = data.text || '';
        const type = data.type || 'MESSAGE';

        // Строка с именем и городом
        const nameCity = [clientName, clientCity].filter(Boolean).join(', ');

        // Типы уведомлений
        const typeLabels = {
            'CHAT_ACTIVATED': '💬 Клиент открыл чат',
            'REQUISITES_FILLED': '📋 Клиент заполнил реквизиты',
            'MESSAGE': '✉️ Новое сообщение'
        };

        const header = typeLabels[type] || typeLabels['MESSAGE'];

        let message = `${header}\n\n`;
        message += `Клиент №${clientId.replace('CL-', '')}\n`;
        if (nameCity) message += `${nameCity}\n`;
        if (clientEmail) message += `Email: ${clientEmail}\n`;
        message += `\n`;
        message += `Активные заказы: ${activeOrdersCount}\n`;
        if (orderId) message += `Текущий: ${orderId}\n`;
        
        if (text) {
            message += `\nСообщение:\n"${text}"`;
        }

        if (type === 'REQUISITES_FILLED' && data.requisites) {
            message += `\nРеквизиты:\n`;
            message += `• ${data.requisites.name || 'Не указано'}\n`;
            message += `• ${data.requisites.currency || 'RUB'}\n`;
            if (data.requisites.inn) message += `• ИНН: ${data.requisites.inn}\n`;
        }

        return message;
    }

    /**
     * Базовый HTTP запрос
     */
    async function request(method, endpoint, data = null) {
        // Mock режим
        if (CONFIG.useMock) {
            return mockRequest(method, endpoint, data);
        }

        // Реальный запрос
        const url = CONFIG.baseURL + endpoint;
        const token = getAuthToken();
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                // Обработка 401 (токен истёк) - КРИТИЧНО ДЛЯ БЕЗОПАСНОСТИ
                if (response.status === 401) {
                    // Очищаем токен
                    setAuthToken(null);
                    
                    // Эмитируем событие для CabinetStore
                    window.dispatchEvent(new CustomEvent('cabinet:auth-expired'));
                    
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || errorData.error?.message || 'Сессия истекла. Войдите снова.');
                }
                
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания запроса');
            }
            throw error;
        }
    }

    /**
     * Mock запросы для разработки
     */
    async function mockRequest(method, endpoint, data) {
        await mockDelay();
        
        console.log(`[CabinetAPI Mock] ${method} ${endpoint}`, data);

        // Авторизация
        if (endpoint === CONFIG.endpoints.authCheck) {
            return {
                isAuthenticated: mockAuthState.isAuthenticated,
                user: mockAuthState.isAuthenticated ? { ...mockData.client } : null
            };
        }

        if (endpoint === CONFIG.endpoints.login) {
            // Симуляция успешного входа
            mockAuthState.isAuthenticated = true;
            mockAuthState.token = 'mock_token_' + Date.now();
            setAuthToken(mockAuthState.token);
            
            return {
                success: true,
                token: mockAuthState.token,
                user: { ...mockData.client, isFirstLogin: false }
            };
        }

        if (endpoint === CONFIG.endpoints.register) {
            mockAuthState.isAuthenticated = true;
            mockAuthState.token = 'mock_token_' + Date.now();
            setAuthToken(mockAuthState.token);
            
            return {
                success: true,
                token: mockAuthState.token,
                user: { 
                    ...mockData.client, 
                    email: data?.email || mockData.client.email,
                    isFirstLogin: true 
                }
            };
        }

        if (endpoint === CONFIG.endpoints.socialAuth) {
            mockAuthState.isAuthenticated = true;
            mockAuthState.token = 'mock_token_' + Date.now();
            setAuthToken(mockAuthState.token);
            
            return {
                success: true,
                token: mockAuthState.token,
                user: { 
                    ...mockData.client, 
                    authProvider: data?.provider || 'google',
                    isFirstLogin: true 
                }
            };
        }

        if (endpoint === CONFIG.endpoints.logout) {
            mockAuthState.isAuthenticated = false;
            mockAuthState.token = null;
            setAuthToken(null);
            return { success: true };
        }

        // Профиль/Клиент
        if (endpoint === CONFIG.endpoints.client || endpoint === CONFIG.endpoints.profile) {
            if (method === 'GET') {
                return { ...mockData.client };
            }
            if (method === 'PUT' || method === 'PATCH') {
                Object.assign(mockData.client, data);
                return { ...mockData.client };
            }
        }

        // Заказы
        if (endpoint === CONFIG.endpoints.orders) {
            if (method === 'GET') {
                return [...mockData.orders];
            }
            if (method === 'POST') {
                const newOrder = {
                    id: `ORD-2024-${String(mockData.orders.length + 1).padStart(3, '0')}`,
                    status: 'На согласовании',
                    createdAt: new Date().toISOString(),
                    items: data?.items || [],
                    total: data?.items?.reduce((sum, item) => sum + (item.price || 0), 0) || 0,
                    delivery: null
                };
                mockData.orders.unshift(newOrder);
                return newOrder;
            }
        }

        // Реквизиты
        if (endpoint === CONFIG.endpoints.requisites) {
            if (method === 'GET') {
                return mockData.requisites ? { ...mockData.requisites } : null;
            }
            if (method === 'PUT' || method === 'POST') {
                mockData.requisites = {
                    ...mockData.requisites,
                    ...data,
                    updatedAt: new Date().toISOString()
                };
                return { ...mockData.requisites };
            }
        }

        // Чат
        if (endpoint === CONFIG.endpoints.chatHistory) {
            return [...mockData.chatHistory];
        }

        if (endpoint === CONFIG.endpoints.chatSend) {
            const newMessage = {
                id: `msg_${Date.now()}`,
                sender: 'client',
                text: data?.text,
                createdAt: new Date().toISOString(),
                orderId: data?.orderId
            };
            mockData.chatHistory.push(newMessage);
            
            // Имитация ответа менеджера через 2 секунды
            setTimeout(() => {
                const managerResponse = {
                    id: `msg_${Date.now()}`,
                    sender: 'manager',
                    text: 'Спасибо за сообщение! Сейчас уточню информацию.',
                    createdAt: new Date().toISOString()
                };
                mockData.chatHistory.push(managerResponse);
                
                // Отправляем событие для UI
                window.dispatchEvent(new CustomEvent('cabinet:manager-message', {
                    detail: managerResponse
                }));
            }, 2000);
            
            return { success: true, messageId: newMessage.id };
        }

        if (endpoint === CONFIG.endpoints.telegramNotify) {
            // ═══════════════════════════════════════════════════════════════════════
            // Задача 5: Формат уведомлений в Telegram (ЕДИНЫЙ ДЛЯ ВСЕХ)
            // ═══════════════════════════════════════════════════════════════════════
            // 
            // Клиент №124
            // Анна Петровна, Новосибирск
            // Email: anna@mail.ru
            //
            // Активные заказы: 2
            // Текущий: ORD-2024-001
            //
            // Сообщение:
            // "Текст клиента"
            //
            // ═══════════════════════════════════════════════════════════════════════
            
            const formattedMessage = formatTelegramMessage(data);
            console.log('[CabinetAPI Mock] Telegram notification:\n' + formattedMessage);
            
            // Имитация подключения менеджера через 3 секунды
            if (data?.type === 'CHAT_ACTIVATED') {
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('cabinet:manager-connected'));
                }, 3000);
            }
            
            return { success: true };
        }

        // Неизвестный endpoint
        console.warn(`[CabinetAPI Mock] Unknown endpoint: ${endpoint}`);
        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ПУБЛИЧНЫЕ МЕТОДЫ API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        // Конфигурация (для изменения baseURL и т.д.)
        CONFIG,

        // ─────────────────────────────────────────────────────────────────────────
        // АВТОРИЗАЦИЯ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Проверить авторизацию (при загрузке страницы)
         * @returns {Promise<{isAuthenticated: boolean, user: Object|null}>}
         */
        async checkAuth() {
            try {
                const result = await request('GET', CONFIG.endpoints.authCheck);
                
                // Наш backend возвращает {success: true, data: {id, email, name, ...}}
                if (result.success === true && result.data) {
                    return {
                        isAuthenticated: true,
                        user: result.data
                    };
                }
                
                // Если ошибка авторизации
                if (result.success === false) {
                    return {
                        isAuthenticated: false,
                        user: null
                    };
                }
                
                // Fallback (не должен сюда попасть с нашим API)
                return {
                    isAuthenticated: false,
                    user: null
                };
            } catch (error) {
                // При ошибке считаем неавторизованным
                return {
                    isAuthenticated: false,
                    user: null
                };
            }
        },

        /**
         * Вход по email/пароль
         * @param {string} email
         * @param {string} password
         * @returns {Promise<{success: boolean, token: string, user: Object}>}
         */
        async login(email, password) {
            const result = await request('POST', CONFIG.endpoints.login, { email, password });
            // Backend возвращает {success: true, data: {token, user}}
            if (result.success && result.data && result.data.token) {
                setAuthToken(result.data.token);
            }
            return result;
        },

        /**
         * Регистрация
         * @param {Object} data - { email, password, name? }
         * @returns {Promise<{success: boolean, token: string, user: Object}>}
         */
        async register(data) {
            const result = await request('POST', CONFIG.endpoints.register, data);
            // Backend возвращает {success: true, data: {token, user}}
            if (result.success && result.data && result.data.token) {
                setAuthToken(result.data.token);
            }
            return result;
        },

        /**
         * Вход через соцсети
         * @param {string} provider - 'google' | 'vk'
         * @returns {Promise<{success: boolean, token: string, user: Object}>}
         */
        async socialAuth(provider) {
            // В реальности это редирект на OAuth провайдера
            // Mock просто возвращает результат
            const result = await request('POST', CONFIG.endpoints.socialAuth, { provider });
            if (result.token) {
                setAuthToken(result.token);
            }
            return result;
        },

        /**
         * Выход
         * @returns {Promise<{success: boolean}>}
         */
        async logout() {
            const result = await request('POST', CONFIG.endpoints.logout);
            setAuthToken(null);
            return result;
        },

        // ─────────────────────────────────────────────────────────────────────────
        // КЛИЕНТ / ПРОФИЛЬ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Получить данные клиента
         * @returns {Promise<Object>}
         */
        async getClient() {
            return request('GET', CONFIG.endpoints.client);
        },

        /**
         * Обновить профиль
         * @param {Object} data - { name?, city?, phone?, isFirstLogin? }
         * @returns {Promise<Object>}
         */
        async updateProfile(data) {
            return request('PUT', CONFIG.endpoints.profile, data);
        },

        // ─────────────────────────────────────────────────────────────────────────
        // ЗАКАЗЫ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Получить список заказов
         * @returns {Promise<Array>}
         */
        async getOrders() {
            return request('GET', CONFIG.endpoints.orders);
        },

        /**
         * Получить детали заказа
         * @param {string} orderId
         * @returns {Promise<Object>}
         */
        async getOrderDetails(orderId) {
            const endpoint = CONFIG.endpoints.orderDetails.replace('{id}', orderId);
            return request('GET', endpoint);
        },

        /**
         * Создать заказ
         * @param {Object} data - { items: Array, status?: string }
         * @returns {Promise<Object>}
         */
        async createOrder(data) {
            return request('POST', CONFIG.endpoints.orders, data);
        },

        // ─────────────────────────────────────────────────────────────────────────
        // РЕКВИЗИТЫ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Получить реквизиты
         * @returns {Promise<Object|null>}
         */
        async getRequisites() {
            return request('GET', CONFIG.endpoints.requisites);
        },

        /**
         * Сохранить реквизиты
         * @param {Object} data
         * @returns {Promise<Object>}
         */
        async saveRequisites(data) {
            return request('PUT', CONFIG.endpoints.requisites, data);
        },

        // ─────────────────────────────────────────────────────────────────────────
        // ЧАТ (новые методы)
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Получить историю чата
         * @returns {Promise<Array>}
         */
        async getChatHistory() {
            return request('GET', CONFIG.endpoints.chatHistory);
        },

        /**
         * Отправить сообщение в чат
         * @param {Object} data - { clientId, text, orderId? }
         * @returns {Promise<{success: boolean, messageId: string}>}
         */
        async sendChatMessage(data) {
            return request('POST', CONFIG.endpoints.chatSend, data);
        },

        /**
         * Уведомить Telegram (активация чата, реквизиты и т.д.)
         * @param {Object} data - { type, clientId, ... }
         * @returns {Promise<{success: boolean}>}
         */
        async notifyTelegram(data) {
            return request('POST', CONFIG.endpoints.telegramNotify, data);
        },

        // ─────────────────────────────────────────────────────────────────────────
        // УТИЛИТЫ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Проверить наличие токена
         * @returns {boolean}
         */
        hasToken() {
            return !!getAuthToken();
        },

        /**
         * Очистить токен (для отладки)
         */
        clearToken() {
            setAuthToken(null);
        }
    };
})();

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CabinetAPI;
}
