/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CABINET-STORE.JS — Централизованное состояние Личного кабинета
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * АРХИТЕКТУРНАЯ ФОРМУЛА:
 * «Клиент первичен. Чат постоянен. Заказы временные. Реквизиты — для админа.»
 * 
 * СТРУКТУРА СОСТОЯНИЯ:
 * - client     — единая сущность клиента (вместо auth + profile)
 * - chat       — постоянный чат (не зависит от заказов)
 * - orders     — список заказов + черновик из корзины
 * - requisites — реквизиты для администратора
 * - system     — техническое состояние UI
 * 
 * ПРАВИЛА:
 * - НЕ ТРОГАТЬ структуру состояния — она фиксирована
 * - НЕ ТРОГАТЬ сигнатуры actions — они используются в интеграциях
 * - НЕ ТРОГАТЬ имена событий EVENTS — они публичные
 */

const CabinetStore = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // НАЧАЛЬНОЕ СОСТОЯНИЕ (ФИКСИРОВАННАЯ СТРУКТУРА)
    // ═══════════════════════════════════════════════════════════════════════════

    const initialState = {
        // ─────────────────────────────────────────────────────────────────────────
        // КЛИЕНТ (ядро системы) — единая сущность, заменяет auth + profile
        // ─────────────────────────────────────────────────────────────────────────
        client: {
            // Идентификация
            id: null,                    // Внутренний UUID (из backend)
            clientId: null,              // Публичный ID "CL-000124" (для переписки, админки)
            
            // Данные авторизации
            email: null,
            authProvider: null,          // 'google' | 'vk' | 'email'
            emailVerified: false,
            
            // Профиль
            name: null,                  // ФИО или название компании
            city: null,
            phone: null,
            
            // Флаги
            isAuthenticated: false,      // Авторизован ли
            isFirstLogin: true,          // Первый вход — показать onboarding
            
            // Мета
            createdAt: null,
            lastLoginAt: null
        },

        // ─────────────────────────────────────────────────────────────────────────
        // ЧАТ (постоянный, не зависит от заказов)
        // Принцип: чат принадлежит КЛИЕНТУ, а не заказу
        // ─────────────────────────────────────────────────────────────────────────
        chat: {
            messages: [],                // История сообщений
            isActive: false,             // Чат открыт в UI (клиент нажал "Связаться")
            managerConnected: false,     // Менеджер подключился
            isTyping: false,             // Индикатор "менеджер печатает"
            lastMessageAt: null,         // Время последнего сообщения
            lastManagerActivityAt: null, // Время последней активности менеджера (для офлайн-индикатора)
            unreadCount: 0,              // Непрочитанные от менеджера
            activeOrderId: null          // Заказ, который обсуждается (может быть null)
        },

        // ─────────────────────────────────────────────────────────────────────────
        // ЗАКАЗЫ (временные сущности)
        // ─────────────────────────────────────────────────────────────────────────
        orders: {
            list: [],                    // Все заказы клиента
            draftOrder: null,            // Черновик из корзины (до создания Order)
            isLoading: false,
            error: null
        },

        // ─────────────────────────────────────────────────────────────────────────
        // РЕКВИЗИТЫ (данные для администратора)
        // Принцип: не скрыты, не приватны, один набор на клиента
        // ─────────────────────────────────────────────────────────────────────────
        requisites: {
            data: null,                  // Объект с реквизитами
            lastUpdatedAt: null,
            isLoading: false,
            isSaving: false,
            error: null
        },

        // ─────────────────────────────────────────────────────────────────────────
        // СИСТЕМНОЕ СОСТОЯНИЕ (техническое)
        // ─────────────────────────────────────────────────────────────────────────
        system: {
            stateVersion: 1,             // Версия состояния (для миграций)
            isLoading: true,             // Первоначальная загрузка
            error: null,
            
            // UI состояние
            activeSection: 'orders',     // 'orders' | 'requisites' | 'profile' | 'chat'
            authMode: 'login',           // 'login' | 'register' | 'reset-password'
            
            // Флаги
            isInitialized: false,        // Первая инициализация выполнена
            showOnboarding: false,       // Показывать onboarding
            showContinueOrder: false     // Показывать экран "Продолжить заказ"
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ПРИВАТНОЕ СОСТОЯНИЕ (не изменять напрямую извне)
    // ═══════════════════════════════════════════════════════════════════════════

    let state = JSON.parse(JSON.stringify(initialState));
    const subscribers = new Set();

    // ═══════════════════════════════════════════════════════════════════════════
    // СОБЫТИЯ (ФИКСИРОВАННЫЕ ИМЕНА — НЕ МЕНЯТЬ!)
    // ═══════════════════════════════════════════════════════════════════════════

    const EVENTS = {
        // Исходящие события (ЛК → сайт)
        AUTH_CHANGED: 'cabinet:auth-changed',
        ORDER_SUBMITTED: 'cabinet:order-submitted',
        REQUISITES_SAVED: 'cabinet:requisites-saved',
        CHAT_MESSAGE_SENT: 'cabinet:chat-message-sent',
        
        // Входящие события (сайт → ЛК)
        CART_SUBMIT: 'cart:submit-order',
        MANAGER_MESSAGE: 'cabinet:manager-message',
        MANAGER_CONNECTED: 'cabinet:manager-connected',
        MANAGER_TYPING: 'cabinet:manager-typing'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ВНУТРЕННИЕ ХЕЛПЕРЫ
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Обновить состояние и уведомить подписчиков
     * @param {Function} updater — функция (currentState) => newState
     */
    function setState(updater) {
        const prevState = state;
        state = updater(state);
        
        // Уведомить всех подписчиков
        subscribers.forEach(callback => {
            try {
                callback(state, prevState);
            } catch (err) {
                console.error('[CabinetStore] Subscriber error:', err);
            }
        });
    }

    /**
     * Сгенерировать публичный Client ID
     * Формат: CL-000001
     */
    function generateClientId(internalId) {
        if (!internalId) return null;
        // Если уже есть clientId — вернуть его
        if (typeof internalId === 'string' && internalId.startsWith('CL-')) {
            return internalId;
        }
        // Иначе сгенерировать из внутреннего ID
        const numericPart = String(internalId).replace(/\D/g, '').slice(-6);
        return `CL-${numericPart.padStart(6, '0')}`;
    }

    /**
     * Отправить CustomEvent в window
     */
    function emitEvent(eventName, detail = {}) {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // СЕЛЕКТОРЫ (ТОЛЬКО ЧТЕНИЕ)
    // ═══════════════════════════════════════════════════════════════════════════

    const selectors = {
        // Клиент
        getClient: () => state.client,
        getClientId: () => state.client.clientId,
        isAuthenticated: () => state.client.isAuthenticated,
        isFirstLogin: () => state.client.isFirstLogin,
        
        // Чат
        getChat: () => state.chat,
        getChatMessages: () => state.chat.messages,
        isChatActive: () => state.chat.isActive,
        isManagerConnected: () => state.chat.managerConnected,
        getUnreadCount: () => state.chat.unreadCount,
        getLastManagerActivityAt: () => state.chat.lastManagerActivityAt,
        
        // Заказы
        getOrders: () => state.orders.list,
        getDraftOrder: () => state.orders.draftOrder,
        getActiveOrder: () => {
            if (!state.chat.activeOrderId) return null;
            return state.orders.list.find(o => o.id === state.chat.activeOrderId) || null;
        },
        isOrdersLoading: () => state.orders.isLoading,
        
        // Реквизиты
        getRequisites: () => state.requisites.data,
        isRequisitesLoading: () => state.requisites.isLoading,
        isRequisitesSaving: () => state.requisites.isSaving,
        
        // Система
        getSystem: () => state.system,
        getStateVersion: () => state.system.stateVersion,
        getActiveSection: () => state.system.activeSection,
        isLoading: () => state.system.isLoading,
        getError: () => state.system.error,
        shouldShowOnboarding: () => state.system.showOnboarding,
        shouldShowContinueOrder: () => state.system.showContinueOrder,
        
        // Полное состояние (для отладки)
        getState: () => JSON.parse(JSON.stringify(state))
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS (ИЗМЕНЕНИЕ СОСТОЯНИЯ)
    // ═══════════════════════════════════════════════════════════════════════════

    const actions = {
        // ─────────────────────────────────────────────────────────────────────────
        // ИНИЦИАЛИЗАЦИЯ
        // ─────────────────────────────────────────────────────────────────────────
        
        /**
         * Инициализация store при загрузке страницы
         * Проверяет сессию и загружает данные
         */
        async init() {
            setState(s => ({
                ...s,
                system: { ...s.system, isLoading: true, error: null }
            }));

            try {
                // Проверяем авторизацию
                const authResult = await CabinetAPI.checkAuth();
                
                if (authResult.isAuthenticated && authResult.user) {
                    // Пользователь авторизован — загружаем данные
                    const client = this._mapUserToClient(authResult.user);
                    
                    setState(s => ({
                        ...s,
                        client: { ...client, isAuthenticated: true },
                        system: { 
                            ...s.system, 
                            isLoading: false, 
                            isInitialized: true,
                            showOnboarding: client.isFirstLogin
                        }
                    }));

                    // Параллельно загружаем связанные данные
                    await Promise.all([
                        this.loadOrders(),
                        this.loadRequisites(),
                        this.loadChatHistory()
                    ]);

                    emitEvent(EVENTS.AUTH_CHANGED, { 
                        isAuthenticated: true, 
                        clientId: client.clientId 
                    });
                } else {
                    // Не авторизован
                    setState(s => ({
                        ...s,
                        system: { ...s.system, isLoading: false, isInitialized: true }
                    }));
                    
                    emitEvent(EVENTS.AUTH_CHANGED, { isAuthenticated: false });
                }

                // Проверяем наличие заказа из корзины (передан через localStorage)
                try {
                    const pendingOrderData = localStorage.getItem('pending_order_data');
                    if (pendingOrderData) {
                        const orderData = JSON.parse(pendingOrderData);
                        console.log('[CabinetStore] Найден заказ из корзины:', orderData);
                        // Обрабатываем заказ
                        actions.saveDraftOrder(orderData);
                        // Удаляем из localStorage после обработки
                        localStorage.removeItem('pending_order_data');
                    }
                } catch (e) {
                    console.warn('[CabinetStore] Ошибка при обработке заказа из корзины:', e);
                }
            } catch (error) {
                console.error('[CabinetStore] Init error:', error);
                setState(s => ({
                    ...s,
                    system: { 
                        ...s.system, 
                        isLoading: false, 
                        isInitialized: true,
                        error: error.message 
                    }
                }));
            }
        },

        // ─────────────────────────────────────────────────────────────────────────
        // АВТОРИЗАЦИЯ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Вход по email/пароль
         */
        async login(email, password) {
            setState(s => ({
                ...s,
                system: { ...s.system, isLoading: true, error: null }
            }));

            try {
                const result = await CabinetAPI.login(email, password);
                await this._handleAuthSuccess(result, 'email');
                return result;
            } catch (error) {
                setState(s => ({
                    ...s,
                    system: { ...s.system, isLoading: false, error: error.message }
                }));
                throw error;
            }
        },

        /**
         * Регистрация по email
         */
        async register(data) {
            setState(s => ({
                ...s,
                system: { ...s.system, isLoading: true, error: null }
            }));

            try {
                const result = await CabinetAPI.register(data);
                await this._handleAuthSuccess(result, 'email');
                return result;
            } catch (error) {
                setState(s => ({
                    ...s,
                    system: { ...s.system, isLoading: false, error: error.message }
                }));
                throw error;
            }
        },

        /**
         * Вход через соцсети (Google/VK)
         */
        async socialLogin(provider) {
            setState(s => ({
                ...s,
                system: { ...s.system, isLoading: true, error: null }
            }));

            try {
                const result = await CabinetAPI.socialAuth(provider);
                await this._handleAuthSuccess(result, provider);
                return result;
            } catch (error) {
                setState(s => ({
                    ...s,
                    system: { ...s.system, isLoading: false, error: error.message }
                }));
                throw error;
            }
        },

        /**
         * Выход из аккаунта
         */
        async logout() {
            try {
                await CabinetAPI.logout();
            } catch (error) {
                console.error('[CabinetStore] Logout error:', error);
            }

            // Сбрасываем состояние
            setState(() => JSON.parse(JSON.stringify(initialState)));
            
            emitEvent(EVENTS.AUTH_CHANGED, { isAuthenticated: false });
        },

        /**
         * Внутренний метод: обработка успешной авторизации
         */
        async _handleAuthSuccess(result, provider) {
            const client = this._mapUserToClient(result.user, provider);
            
            setState(s => ({
                ...s,
                client: { ...client, isAuthenticated: true },
                system: {
                    ...s.system,
                    isLoading: false,
                    isInitialized: true,
                    activeSection: 'orders',
                    showOnboarding: client.isFirstLogin
                }
            }));

            // Если есть черновик заказа — создаём Order
            if (state.orders.draftOrder) {
                await this.createOrderFromDraft();
            }

            // Загружаем связанные данные
            await Promise.all([
                this.loadOrders(),
                this.loadRequisites(),
                this.loadChatHistory()
            ]);

            emitEvent(EVENTS.AUTH_CHANGED, { 
                isAuthenticated: true, 
                clientId: client.clientId 
            });
        },

        /**
         * Внутренний метод: преобразование user из API в client
         */
        _mapUserToClient(user, provider = null) {
            return {
                id: user.id,
                clientId: user.clientId || generateClientId(user.id),
                email: user.email,
                authProvider: provider || user.authProvider || 'email',
                emailVerified: user.emailVerified || false,
                name: user.name || user.displayName || null,
                city: user.city || null,
                phone: user.phone || null,
                isAuthenticated: true,
                isFirstLogin: user.isFirstLogin !== false,
                createdAt: user.createdAt || new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };
        },

        // ─────────────────────────────────────────────────────────────────────────
        // ЗАКАЗЫ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Загрузить список заказов
         */
        async loadOrders() {
            if (!state.client.isAuthenticated) return;

            setState(s => ({
                ...s,
                orders: { ...s.orders, isLoading: true, error: null }
            }));

            try {
                const orders = await CabinetAPI.getOrders();
                setState(s => ({
                    ...s,
                    orders: { 
                        ...s.orders, 
                        list: orders || [], 
                        isLoading: false 
                    }
                }));
            } catch (error) {
                console.error('[CabinetStore] Load orders error:', error);
                setState(s => ({
                    ...s,
                    orders: { ...s.orders, isLoading: false, error: error.message }
                }));
            }
        },

        /**
         * Сохранить черновик заказа из корзины
         * Вызывается при событии cart:submit-order
         */
        saveDraftOrder(orderData) {
            const draftOrder = {
                id: `draft_${Date.now()}`,
                items: orderData.items || [],
                createdAt: new Date().toISOString(),
                status: 'draft'
            };

            setState(s => ({
                ...s,
                orders: { ...s.orders, draftOrder },
                system: { 
                    ...s.system, 
                    showContinueOrder: !s.client.isAuthenticated,
                    activeSection: 'orders'
                }
            }));

            // Если авторизован — сразу создаём заказ
            if (state.client.isAuthenticated) {
                this.createOrderFromDraft();
            }
        },

        /**
         * Создать заказ из черновика
         */
        async createOrderFromDraft() {
            const draft = state.orders.draftOrder;
            if (!draft) return;

            try {
                const order = await CabinetAPI.createOrder({
                    items: draft.items,
                    status: 'pending_approval'
                });

                setState(s => ({
                    ...s,
                    orders: {
                        ...s.orders,
                        list: [order, ...s.orders.list],
                        draftOrder: null
                    },
                    system: { ...s.system, showContinueOrder: false }
                }));

                emitEvent(EVENTS.ORDER_SUBMITTED, { orderId: order.id });
            } catch (error) {
                console.error('[CabinetStore] Create order error:', error);
            }
        },

        // ─────────────────────────────────────────────────────────────────────────
        // ЧАТ (постоянный, не зависит от заказов)
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Загрузить историю чата
         */
        async loadChatHistory() {
            if (!state.client.isAuthenticated) return;

            try {
                const messages = await CabinetAPI.getChatHistory();
                setState(s => ({
                    ...s,
                    chat: { 
                        ...s.chat, 
                        messages: messages || [],
                        lastMessageAt: messages?.length 
                            ? messages[messages.length - 1].createdAt 
                            : null
                    }
                }));
            } catch (error) {
                console.error('[CabinetStore] Load chat history error:', error);
            }
        },

        /**
         * Активировать чат (клиент нажал "Связаться с менеджером")
         * @param {string|null} orderId — ID заказа для обсуждения (может быть null)
         */
        async activateChat(orderId = null) {
            setState(s => ({
                ...s,
                chat: { 
                    ...s.chat, 
                    isActive: true,
                    activeOrderId: orderId
                },
                system: { ...s.system, activeSection: 'chat' }
            }));

            // Добавляем системное сообщение
            this.addChatMessage({
                id: `system_${Date.now()}`,
                sender: 'system',
                text: '⏳ Ожидайте, сейчас подключится менеджер',
                createdAt: new Date().toISOString()
            });

            // Уведомляем backend → Telegram
            try {
                await CabinetAPI.notifyTelegram({
                    type: 'CHAT_ACTIVATED',
                    clientId: state.client.clientId,
                    clientName: state.client.name,
                    clientEmail: state.client.email,
                    orderId: orderId,
                    orderItems: orderId 
                        ? state.orders.list.find(o => o.id === orderId)?.items 
                        : null
                });
            } catch (error) {
                console.error('[CabinetStore] Notify telegram error:', error);
            }
        },

        /**
         * Менеджер подключился (событие из backend/Telegram)
         */
        managerConnected() {
            setState(s => ({
                ...s,
                chat: {
                    ...s.chat,
                    managerConnected: true,
                    isTyping: true
                }
            }));

            // Добавляем системное сообщение
            this.addChatMessage({
                id: `system_connected_${Date.now()}`,
                sender: 'system',
                text: '✅ К разговору подключился менеджер',
                createdAt: new Date().toISOString()
            });

            // Авто-приветствие (с задержкой для реализма)
            setTimeout(() => {
                setState(s => ({
                    ...s,
                    chat: { ...s.chat, isTyping: false }
                }));
                
                this.addChatMessage({
                    id: `auto_greeting_${Date.now()}`,
                    sender: 'manager',
                    text: 'Здравствуйте! Я менеджер. Сейчас уточню наличие и условия по вашему заказу.',
                    createdAt: new Date().toISOString()
                });
            }, 1500);
        },

        /**
         * Менеджер печатает (индикатор)
         */
        setManagerTyping(isTyping) {
            setState(s => ({
                ...s,
                chat: { ...s.chat, isTyping }
            }));
        },

        /**
         * Добавить сообщение в чат
         * @param {Object} message — данные сообщения
         * @param {string} message.status — 'pending' | 'delivered' | 'failed' (для клиентских)
         */
        addChatMessage(message) {
            const newMessage = {
                id: message.id || `msg_${Date.now()}`,
                sender: message.sender,           // 'client' | 'manager' | 'system'
                text: message.text,
                createdAt: message.createdAt || new Date().toISOString(),
                orderId: message.orderId || state.chat.activeOrderId,
                // Статус доставки (только для клиентских сообщений)
                status: message.sender === 'client' ? (message.status || 'pending') : 'delivered'
            };

            setState(s => ({
                ...s,
                chat: {
                    ...s.chat,
                    messages: [...s.chat.messages, newMessage],
                    lastMessageAt: newMessage.createdAt,
                    // Если сообщение от менеджера — обновляем время активности
                    lastManagerActivityAt: message.sender === 'manager' 
                        ? newMessage.createdAt 
                        : s.chat.lastManagerActivityAt,
                    unreadCount: message.sender === 'manager' 
                        ? s.chat.unreadCount + 1 
                        : s.chat.unreadCount
                }
            }));
        },

        /**
         * Получено сообщение от менеджера (из Telegram)
         */
        receiveManagerMessage(message) {
            this.addChatMessage({
                ...message,
                sender: 'manager'
            });
        },

        /**
         * Отправить сообщение (клиент → менеджер)
         * @param {string} text — текст сообщения
         * @param {string|null} retryMessageId — ID сообщения для повторной отправки
         */
        async sendMessage(text, retryMessageId = null) {
            if (!text.trim()) return;

            const messageId = retryMessageId || `client_${Date.now()}`;
            
            // Если повтор — обновляем статус существующего сообщения
            if (retryMessageId) {
                this._updateMessageStatus(retryMessageId, 'pending');
            } else {
                // Новое сообщение — сразу показываем в UI со статусом pending
                const message = {
                    id: messageId,
                    sender: 'client',
                    text: text.trim(),
                    createdAt: new Date().toISOString(),
                    orderId: state.chat.activeOrderId,
                    status: 'pending'
                };
                this.addChatMessage(message);
            }

            // Отправляем в backend → Telegram
            try {
                await CabinetAPI.sendChatMessage({
                    clientId: state.client.clientId,
                    clientName: state.client.name,
                    clientCity: state.client.city,
                    clientEmail: state.client.email,
                    text: text.trim(),
                    orderId: state.chat.activeOrderId,
                    activeOrdersCount: state.orders.list.filter(o => o.status !== 'Исполнен' && o.status !== 'Отменён').length
                });

                // Успешно — меняем статус на delivered
                this._updateMessageStatus(messageId, 'delivered');
                emitEvent(EVENTS.CHAT_MESSAGE_SENT, { messageId });
            } catch (error) {
                console.error('[CabinetStore] Send message error:', error);
                // Ошибка — меняем статус на failed
                this._updateMessageStatus(messageId, 'failed');
            }
        },

        /**
         * Повторить отправку сообщения
         * @param {string} messageId — ID сообщения со статусом failed
         */
        async retryMessage(messageId) {
            const message = state.chat.messages.find(m => m.id === messageId);
            if (!message || message.status !== 'failed') return;
            
            await this.sendMessage(message.text, messageId);
        },

        /**
         * Обновить статус сообщения
         * @private
         */
        _updateMessageStatus(messageId, status) {
            setState(s => ({
                ...s,
                chat: {
                    ...s.chat,
                    messages: s.chat.messages.map(m => 
                        m.id === messageId ? { ...m, status } : m
                    )
                }
            }));
        },

        /**
         * Пометить сообщения как прочитанные
         */
        markChatAsRead() {
            setState(s => ({
                ...s,
                chat: { ...s.chat, unreadCount: 0 }
            }));
        },

        // ─────────────────────────────────────────────────────────────────────────
        // РЕКВИЗИТЫ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Загрузить реквизиты
         */
        async loadRequisites() {
            if (!state.client.isAuthenticated) return;

            setState(s => ({
                ...s,
                requisites: { ...s.requisites, isLoading: true, error: null }
            }));

            try {
                const data = await CabinetAPI.getRequisites();
                setState(s => ({
                    ...s,
                    requisites: {
                        ...s.requisites,
                        data: data || null,
                        lastUpdatedAt: data?.updatedAt || null,
                        isLoading: false
                    }
                }));
            } catch (error) {
                console.error('[CabinetStore] Load requisites error:', error);
                setState(s => ({
                    ...s,
                    requisites: { ...s.requisites, isLoading: false, error: error.message }
                }));
            }
        },

        /**
         * Сохранить реквизиты
         */
        async saveRequisites(data) {
            setState(s => ({
                ...s,
                requisites: { ...s.requisites, isSaving: true, error: null }
            }));

            try {
                const result = await CabinetAPI.saveRequisites(data);
                
                setState(s => ({
                    ...s,
                    requisites: {
                        ...s.requisites,
                        data: result,
                        lastUpdatedAt: new Date().toISOString(),
                        isSaving: false
                    }
                }));

                // Уведомляем backend → Telegram
                await CabinetAPI.notifyTelegram({
                    type: 'REQUISITES_FILLED',
                    clientId: state.client.clientId,
                    clientName: state.client.name,
                    requisites: result
                });

                emitEvent(EVENTS.REQUISITES_SAVED, { requisites: result });
                
                return result;
            } catch (error) {
                console.error('[CabinetStore] Save requisites error:', error);
                setState(s => ({
                    ...s,
                    requisites: { ...s.requisites, isSaving: false, error: error.message }
                }));
                throw error;
            }
        },

        // ─────────────────────────────────────────────────────────────────────────
        // ПРОФИЛЬ
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Обновить профиль клиента
         */
        async updateProfile(data) {
            setState(s => ({
                ...s,
                system: { ...s.system, isLoading: true, error: null }
            }));

            try {
                const result = await CabinetAPI.updateProfile(data);
                
                setState(s => ({
                    ...s,
                    client: {
                        ...s.client,
                        name: result.name || s.client.name,
                        city: result.city || s.client.city,
                        phone: result.phone || s.client.phone
                    },
                    system: { ...s.system, isLoading: false }
                }));

                return result;
            } catch (error) {
                setState(s => ({
                    ...s,
                    system: { ...s.system, isLoading: false, error: error.message }
                }));
                throw error;
            }
        },

        // ─────────────────────────────────────────────────────────────────────────
        // UI / СИСТЕМА
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Переключить активный раздел
         */
        setActiveSection(section) {
            setState(s => ({
                ...s,
                system: { ...s.system, activeSection: section }
            }));

            // Если перешли в чат — помечаем как прочитанный
            if (section === 'chat') {
                this.markChatAsRead();
            }
        },

        /**
         * Переключить режим авторизации
         */
        setAuthMode(mode) {
            setState(s => ({
                ...s,
                system: { ...s.system, authMode: mode, error: null }
            }));
        },

        /**
         * Закрыть onboarding
         */
        closeOnboarding() {
            setState(s => ({
                ...s,
                client: { ...s.client, isFirstLogin: false },
                system: { ...s.system, showOnboarding: false }
            }));

            // Сохраняем флаг на backend
            CabinetAPI.updateProfile({ isFirstLogin: false }).catch(console.error);
        },

        /**
         * Очистить ошибку
         */
        clearError() {
            setState(s => ({
                ...s,
                system: { ...s.system, error: null },
                orders: { ...s.orders, error: null },
                requisites: { ...s.requisites, error: null }
            }));
        },

        /**
         * Установить системное состояние (для внутреннего использования)
         */
        setSystem(updates) {
            setState(s => ({
                ...s,
                system: { ...s.system, ...updates }
            }));
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ПОДПИСКА НА ИЗМЕНЕНИЯ
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Подписаться на изменения состояния
     * @param {Function} callback — (newState, prevState) => void
     * @returns {Function} unsubscribe
     */
    function subscribe(callback) {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // СЛУШАТЕЛИ ВНЕШНИХ СОБЫТИЙ
    // ═══════════════════════════════════════════════════════════════════════════

    // Событие от корзины: отправить заказ на согласование
    window.addEventListener(EVENTS.CART_SUBMIT, (event) => {
        actions.saveDraftOrder(event.detail);
    });

    // Событие: сообщение от менеджера (из backend/WebSocket)
    window.addEventListener(EVENTS.MANAGER_MESSAGE, (event) => {
        actions.receiveManagerMessage(event.detail);
    });

    // Событие: менеджер подключился
    window.addEventListener(EVENTS.MANAGER_CONNECTED, () => {
        actions.managerConnected();
    });

    // Событие: менеджер печатает
    window.addEventListener(EVENTS.MANAGER_TYPING, (event) => {
        actions.setManagerTyping(event.detail?.isTyping ?? true);
    });

    // Событие: истечение JWT токена (401 от API) - КРИТИЧНО ДЛЯ UX
    window.addEventListener('cabinet:auth-expired', () => {
        setState(s => ({
            ...s,
            client: { ...initialState.client },
            system: { ...s.system, error: 'Сессия истекла. Войдите снова.' }
        }));
        emitEvent(EVENTS.AUTH_CHANGED, { isAuthenticated: false });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ПУБЛИЧНЫЙ API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        // Константы
        EVENTS,
        
        // Селекторы (только чтение)
        selectors,
        
        // Actions (изменение состояния)
        actions,
        
        // Подписка
        subscribe,
        
        // Для отладки
        _getState: () => JSON.parse(JSON.stringify(state)),
        _reset: () => { state = JSON.parse(JSON.stringify(initialState)); }
    };
})();

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CabinetStore;
}
