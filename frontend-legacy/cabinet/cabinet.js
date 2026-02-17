/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CABINET.JS — UI логика и рендеринг Личного кабинета
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CabinetUI = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // ИКОНКИ (SVG)
    // ═══════════════════════════════════════════════════════════════════════════

    const ICONS = {
        orders: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
        requisites: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        profile: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        chat: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        logout: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
        google: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
        vk: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#4680C2" d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.712-1.033-1.033-1.49-1.173-1.744-1.173-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.716 4 8.236c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.015-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.475-.085.72-.576.72z"/></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        send: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
        spinner: `<svg class="cabinet-spinner" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════════════════════

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getInitials(name) {
        if (!name) return '?';
        return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatTime(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDateTime(dateString) {
        return `${formatDate(dateString)} ${formatTime(dateString)}`;
    }

    function formatPrice(amount) {
        if (amount === null || amount === undefined) return '';
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount);
    }

    const ORDER_STATUSES = {
        'draft': { label: 'Черновик', color: 'gray' },
        'pending_approval': { label: 'На согласовании', color: 'yellow' },
        'На согласовании': { label: 'На согласовании', color: 'yellow' },
        'В работе': { label: 'В работе', color: 'blue' },
        'Исполнен': { label: 'Исполнен', color: 'green' },
        'Отменён': { label: 'Отменён', color: 'red' }
    };

    function getStatusInfo(status) {
        return ORDER_STATUSES[status] || { label: status, color: 'gray' };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // РЕНДЕР-ФУНКЦИИ
    // ═══════════════════════════════════════════════════════════════════════════

    function renderHeaderButton(isAuthenticated) {
        return `<button class="cabinet-header-btn" data-action="open-cabinet">${ICONS.profile}<span>Личный кабинет</span></button>`;
    }

    function render(state) {
        const container = document.getElementById('cabinet-app');
        if (!container) return;

        if (state.system.isLoading && !state.system.isInitialized) {
            container.innerHTML = `<div class="cabinet-loading">${ICONS.spinner}<p>Загрузка...</p></div>`;
            return;
        }

        if (!state.client.isAuthenticated) {
            if (state.orders.draftOrder || state.system.showContinueOrder) {
                container.innerHTML = renderContinueOrderScreen(state);
            } else {
                container.innerHTML = renderAuthPage(state);
            }
            return;
        }

        container.innerHTML = renderCabinet(state);

        if (state.system.showOnboarding) {
            container.insertAdjacentHTML('beforeend', renderOnboardingOverlay());
        }

        if (state.system.activeSection === 'chat') {
            const chatMessages = container.querySelector('.cabinet-chat__messages');
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function renderAuthPage(state) {
        const { authMode, error } = state.system;
        const isLogin = authMode === 'login';

        return `
            <div class="cabinet-auth">
                <div class="cabinet-auth__card">
                    <h2 class="cabinet-auth__title">Личный кабинет</h2>
                    ${error ? `<div class="cabinet-alert cabinet-alert--error">${escapeHtml(error)}</div>` : ''}
                    <div class="cabinet-social">
                        <button class="cabinet-social__btn cabinet-social__btn--google" data-action="social-login" data-provider="google">${ICONS.google}<span>Войти через Google</span></button>
                        <button class="cabinet-social__btn cabinet-social__btn--vk" data-action="social-login" data-provider="vk">${ICONS.vk}<span>Войти через VK</span></button>
                    </div>
                    <div class="cabinet-social__divider"><span>или</span></div>
                    <form class="cabinet-form" data-form="${isLogin ? 'login' : 'register'}">
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Email</label>
                            <input type="email" name="email" class="cabinet-form__input" required placeholder="email@example.com">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Пароль</label>
                            <input type="password" name="password" class="cabinet-form__input" required placeholder="••••••••" minlength="6">
                        </div>
                        ${!isLogin ? `<div class="cabinet-form__group"><label class="cabinet-form__label">Имя / Компания</label><input type="text" name="name" class="cabinet-form__input" placeholder="ООО «Компания»"></div>` : ''}
                        <button type="submit" class="cabinet-btn cabinet-btn--primary cabinet-btn--full">${isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
                    </form>
                    <div class="cabinet-auth__switch">
                        ${isLogin 
                            ? `<p>Нет аккаунта? <a href="#" data-action="switch-auth" data-mode="register">Зарегистрироваться</a></p>`
                            : `<p>Уже есть аккаунт? <a href="#" data-action="switch-auth" data-mode="login">Войти</a></p>`}
                    </div>
                </div>
            </div>`;
    }

    function renderContinueOrderScreen(state) {
        const draft = state.orders.draftOrder;
        return `
            <div class="cabinet-auth">
                <div class="cabinet-auth__card cabinet-auth__card--wide">
                    <h2 class="cabinet-auth__title">📦 Продолжить оформление заказа</h2>
                    <p class="cabinet-auth__subtitle">Войдите удобным способом, чтобы отправить заявку на согласование.</p>
                    ${draft?.items?.length ? `<div class="cabinet-draft-summary"><h4>Состав заказа:</h4><ul>${draft.items.map(i => `<li>${escapeHtml(i.name || i.productId)} — ${escapeHtml(i.color)} — ${i.meters || i.rolls} ${i.meters ? 'м' : 'рулон(ов)'}</li>`).join('')}</ul></div>` : ''}
                    <div class="cabinet-social">
                        <button class="cabinet-social__btn cabinet-social__btn--google" data-action="social-login" data-provider="google">${ICONS.google}<span>Продолжить через Google</span></button>
                        <button class="cabinet-social__btn cabinet-social__btn--vk" data-action="social-login" data-provider="vk">${ICONS.vk}<span>Продолжить через VK</span></button>
                    </div>
                    <div class="cabinet-social__divider"><span>или</span></div>
                    <button class="cabinet-btn cabinet-btn--secondary cabinet-btn--full" data-action="show-email-auth">Войти по email</button>
                </div>
            </div>`;
    }

    function renderCabinet(state) {
        return `<div class="cabinet">${renderSidebar(state.client, state.chat, state.system.activeSection)}<main class="cabinet-content">${renderContent(state)}</main></div>`;
    }

    function renderSidebar(client, chat, activeSection) {
        const initials = getInitials(client?.name || client?.email);
        const badge = chat.unreadCount > 0 ? `<span class="cabinet-sidebar__badge">${chat.unreadCount}</span>` : '';
        
        const links = [
            { id: 'chat', icon: ICONS.chat, label: 'Чат с менеджером', extra: badge },
            { id: 'orders', icon: ICONS.orders, label: 'Мои заказы' },
            { id: 'requisites', icon: ICONS.requisites, label: 'Реквизиты' },
            { id: 'profile', icon: ICONS.profile, label: 'Профиль' }
        ];

        return `
            <aside class="cabinet-sidebar">
                <div class="cabinet-sidebar__user">
                    <div class="cabinet-sidebar__avatar">${initials}</div>
                    <p class="cabinet-sidebar__name">${escapeHtml(client?.name || 'Клиент')}</p>
                    <p class="cabinet-sidebar__id">ID: ${escapeHtml(client?.clientId || '')}</p>
                </div>
                <nav class="cabinet-sidebar__nav">
                    ${links.map(l => `<a href="#${l.id}" class="cabinet-sidebar__link ${activeSection === l.id ? 'cabinet-sidebar__link--active' : ''}" data-action="nav" data-section="${l.id}">${l.icon}<span>${l.label}</span>${l.extra || ''}</a>`).join('')}
                </nav>
                <div class="cabinet-sidebar__footer">
                    <button class="cabinet-sidebar__link cabinet-sidebar__link--logout" data-action="logout">${ICONS.logout}<span>Выйти</span></button>
                </div>
            </aside>`;
    }

    function renderContent(state) {
        switch (state.system.activeSection) {
            case 'chat': return renderChatSection(state);
            case 'orders': return renderOrdersSection(state);
            case 'requisites': return renderRequisitesSection(state);
            case 'profile': return renderProfileSection(state);
            default: return renderOrdersSection(state);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ЧАТ
    // ─────────────────────────────────────────────────────────────────────────────

    function renderChatSection(state) {
        const { chat, orders } = state;
        const activeOrder = chat.activeOrderId ? orders.list.find(o => o.id === chat.activeOrderId) : null;

        return `
            <div class="cabinet-content__header">
                <h2 class="cabinet-content__title">Чат с менеджером${activeOrder ? ` <span class="cabinet-chat__order-badge">Заказ №${activeOrder.id}</span>` : ''}</h2>
            </div>
            <div class="cabinet-content__body">
                <div class="cabinet-chat">${!chat.isActive ? renderChatInactive(state) : renderChatActive(state)}</div>
            </div>`;
    }

    function renderChatInactive(state) {
        const { orders, chat } = state;
        const hasMessages = chat.messages.length > 0;

        return `
            <div class="cabinet-chat__inactive">
                <div class="cabinet-chat__icon">${ICONS.chat}</div>
                <h3>Чат с менеджером</h3>
                <p>Здесь вы можете обсудить детали заказа, уточнить наличие и цены.</p>
                ${hasMessages ? `<div class="cabinet-chat__history-note"><p>📜 У вас есть история сообщений</p></div>` : ''}
                ${orders.list.length > 0 ? `
                    <div class="cabinet-chat__order-select">
                        <label>Выберите заказ для обсуждения:</label>
                        <select class="cabinet-form__select" id="chat-order-select">
                            <option value="">Общий вопрос</option>
                            ${orders.list.map(o => `<option value="${o.id}">Заказ №${o.id} — ${formatDate(o.createdAt)}</option>`).join('')}
                        </select>
                    </div>` : ''}
                <button class="cabinet-btn cabinet-btn--primary" data-action="activate-chat">${hasMessages ? 'Продолжить общение' : 'Начать общение'}</button>
            </div>`;
    }

    function renderChatActive(state) {
        const { chat } = state;
        const senderLabel = { 'client': 'Вы', 'manager': 'Менеджер', 'system': 'Система' };
        
        // Проверка офлайна менеджера (> 5 минут без активности)
        const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 минут
        const isManagerOffline = chat.managerConnected && chat.lastManagerActivityAt && 
            (Date.now() - new Date(chat.lastManagerActivityAt).getTime() > OFFLINE_THRESHOLD_MS);

        return `
            ${isManagerOffline ? `<div class="cabinet-chat__offline-notice">⏸ Менеджер сейчас офлайн, ответит позже</div>` : ''}
            <div class="cabinet-chat__messages" id="chat-messages">
                ${chat.messages.length === 0 ? `<div class="cabinet-chat__empty"><p>Начните диалог с менеджером</p></div>` : ''}
                ${chat.messages.map(msg => renderChatMessage(msg, senderLabel)).join('')}
                ${chat.isTyping ? `<div class="cabinet-chat__typing"><div class="cabinet-chat__typing-dots"><span></span><span></span><span></span></div><span>Менеджер печатает...</span></div>` : ''}
            </div>
            <div class="cabinet-chat__input">
                <textarea class="cabinet-form__input cabinet-form__textarea" id="chat-input" placeholder="Введите сообщение..." rows="2"></textarea>
                <button class="cabinet-btn cabinet-btn--primary cabinet-btn--icon" data-action="send-message">${ICONS.send}</button>
            </div>`;
    }

    /**
     * Рендер одного сообщения чата
     * Задача 1: статусы pending/delivered/failed + кнопка "Повторить"
     */
    function renderChatMessage(msg, senderLabel) {
        const statusIcon = msg.sender === 'client' ? getMessageStatusIcon(msg.status) : '';
        const retryBtn = msg.status === 'failed' 
            ? `<button class="cabinet-chat__retry-btn" data-action="retry-message" data-message-id="${msg.id}">↻ Повторить</button>` 
            : '';

        return `
            <div class="cabinet-chat__message cabinet-chat__message--${msg.sender} ${msg.status === 'failed' ? 'cabinet-chat__message--failed' : ''}">
                <div class="cabinet-chat__message-sender">${senderLabel[msg.sender] || msg.sender}</div>
                <div class="cabinet-chat__message-text">${escapeHtml(msg.text)}</div>
                <div class="cabinet-chat__message-footer">
                    <span class="cabinet-chat__message-time">${formatTime(msg.createdAt)}</span>
                    ${statusIcon}
                    ${retryBtn}
                </div>
            </div>`;
    }

    /**
     * Иконка статуса сообщения
     */
    function getMessageStatusIcon(status) {
        switch (status) {
            case 'pending': return `<span class="cabinet-chat__status cabinet-chat__status--pending" title="Отправляется">◯</span>`;
            case 'delivered': return `<span class="cabinet-chat__status cabinet-chat__status--delivered" title="Доставлено">✓</span>`;
            case 'failed': return `<span class="cabinet-chat__status cabinet-chat__status--failed" title="Не доставлено">✗</span>`;
            default: return '';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ЗАКАЗЫ
    // ─────────────────────────────────────────────────────────────────────────────

    function renderOrdersSection(state) {
        const { orders } = state;

        return `
            <div class="cabinet-content__header"><h2 class="cabinet-content__title">Мои заказы</h2></div>
            <div class="cabinet-content__body">
                ${orders.isLoading ? `<div class="cabinet-loading">${ICONS.spinner}</div>` : ''}
                ${orders.draftOrder ? renderDraftOrder(orders.draftOrder) : ''}
                ${!orders.isLoading && orders.list.length === 0 && !orders.draftOrder ? `
                    <div class="cabinet-empty">
                        <div class="cabinet-empty__icon">${ICONS.orders}</div>
                        <h3>Заказов пока нет</h3>
                        <p>Выберите товары в каталоге и оформите первый заказ</p>
                        <a href="/catalog" class="cabinet-btn cabinet-btn--primary">Перейти в каталог</a>
                    </div>` : ''}
                ${orders.list.length > 0 ? `<div class="cabinet-orders">${orders.list.map(o => renderOrderCard(o)).join('')}</div>` : ''}
            </div>`;
    }

    function renderDraftOrder(draft) {
        return `
            <div class="cabinet-order cabinet-order--draft">
                <div class="cabinet-order__header">
                    <div class="cabinet-order__info"><span class="cabinet-order__id">Новый заказ</span><span class="cabinet-order__date">${formatDateTime(draft.createdAt)}</span></div>
                    <span class="cabinet-order__status cabinet-order__status--yellow">На согласовании</span>
                </div>
                <div class="cabinet-order__items">${draft.items.map(i => `<div class="cabinet-order__item"><span class="cabinet-order__item-name">${escapeHtml(i.name || i.productId)}</span><span class="cabinet-order__item-details">${escapeHtml(i.color)} — ${i.meters || i.rolls} ${i.meters ? 'м' : 'рулон(ов)'}</span></div>`).join('')}</div>
                <div class="cabinet-order__actions"><button class="cabinet-btn cabinet-btn--primary" data-action="activate-chat">Связаться с менеджером</button></div>
                <p class="cabinet-order__hint">💡 Сейчас менеджер подключится и уточнит наличие, цену и условия.</p>
            </div>`;
    }

    function renderOrderCard(order) {
        const statusInfo = getStatusInfo(order.status);
        return `
            <div class="cabinet-order" data-order-id="${order.id}">
                <div class="cabinet-order__header">
                    <div class="cabinet-order__info"><span class="cabinet-order__id">Заказ №${escapeHtml(order.id)}</span><span class="cabinet-order__date">${formatDate(order.createdAt)}</span></div>
                    <span class="cabinet-order__status cabinet-order__status--${statusInfo.color}">${escapeHtml(statusInfo.label)}</span>
                </div>
                <div class="cabinet-order__items">${order.items.map(i => `<div class="cabinet-order__item"><span class="cabinet-order__item-name">${escapeHtml(i.name || i.productId)}</span><span class="cabinet-order__item-details">${escapeHtml(i.color)} — ${i.meters || i.rolls} ${i.meters ? 'м' : 'рулон(ов)'}</span>${i.price ? `<span class="cabinet-order__item-price">${formatPrice(i.price)}</span>` : ''}</div>`).join('')}</div>
                ${order.total ? `<div class="cabinet-order__total"><span>Итого:</span><strong>${formatPrice(order.total)}</strong></div>` : ''}
                ${order.delivery ? `<div class="cabinet-order__delivery"><p><strong>Доставка:</strong> ${escapeHtml(order.delivery.address)}</p>${order.delivery.deliveredAt ? `<p>Доставлено: ${formatDate(order.delivery.deliveredAt)}</p>` : ''}</div>` : ''}
                <div class="cabinet-order__actions"><button class="cabinet-btn cabinet-btn--secondary" data-action="discuss-order" data-order-id="${order.id}">Обсудить заказ</button></div>
            </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // РЕКВИЗИТЫ
    // ─────────────────────────────────────────────────────────────────────────────

    function renderRequisitesSection(state) {
        const { requisites } = state;
        const data = requisites.data || {};

        if (requisites.isLoading) return `<div class="cabinet-content__header"><h2 class="cabinet-content__title">Реквизиты</h2></div><div class="cabinet-content__body"><div class="cabinet-loading">${ICONS.spinner}</div></div>`;

        return `
            <div class="cabinet-content__header"><h2 class="cabinet-content__title">Реквизиты</h2></div>
            <div class="cabinet-content__body">
                <div class="cabinet-requisites">
                    <p class="cabinet-requisites__note">Эти данные используются для выставления счетов и оформления документов.</p>
                    <form class="cabinet-form" data-form="requisites">
                        <div class="cabinet-form__group cabinet-form__group--required">
                            <label class="cabinet-form__label">Наименование (ИП / компания / ФИО) *</label>
                            <input type="text" name="name" class="cabinet-form__input" required value="${escapeHtml(data.name || '')}" placeholder="ООО «Компания»">
                        </div>
                        <div class="cabinet-form__group cabinet-form__group--required">
                            <label class="cabinet-form__label">Валюта счёта *</label>
                            <select name="currency" class="cabinet-form__select" required>
                                <option value="">Выберите</option>
                                <option value="RUB" ${data.currency === 'RUB' ? 'selected' : ''}>RUB (₽)</option>
                                <option value="USD" ${data.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="EUR" ${data.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                                <option value="KZT" ${data.currency === 'KZT' ? 'selected' : ''}>KZT (₸)</option>
                            </select>
                        </div>
                        <div class="cabinet-form__group cabinet-form__group--required">
                            <label class="cabinet-form__label">Получатель *</label>
                            <input type="text" name="recipient" class="cabinet-form__input" required value="${escapeHtml(data.recipient || '')}" placeholder="ФИО получателя">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Email</label>
                            <input type="email" name="email" class="cabinet-form__input" value="${escapeHtml(data.email || '')}" placeholder="email@example.com">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Телефон</label>
                            <input type="tel" name="phone" class="cabinet-form__input" value="${escapeHtml(data.phone || '')}" placeholder="+7 (999) 123-45-67">
                        </div>
                        <div class="cabinet-form__divider"><span>Дополнительно (необязательно)</span></div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">ИИН / ИНН</label>
                            <input type="text" name="inn" class="cabinet-form__input" value="${escapeHtml(data.inn || '')}">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">ОГРНИП</label>
                            <input type="text" name="ogrnip" class="cabinet-form__input" value="${escapeHtml(data.ogrnip || '')}">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Регистрационный номер</label>
                            <input type="text" name="regNumber" class="cabinet-form__input" value="${escapeHtml(data.regNumber || '')}">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Юридический адрес</label>
                            <input type="text" name="legalAddress" class="cabinet-form__input" value="${escapeHtml(data.legalAddress || '')}">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Почтовый адрес</label>
                            <input type="text" name="postalAddress" class="cabinet-form__input" value="${escapeHtml(data.postalAddress || '')}">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Расчётный счёт</label>
                            <input type="text" name="account" class="cabinet-form__input" value="${escapeHtml(data.account || '')}">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Банк</label>
                            <input type="text" name="bank" class="cabinet-form__input" value="${escapeHtml(data.bank || '')}">
                        </div>
                        <div class="cabinet-form__group">
                            <label class="cabinet-form__label">Банк-корреспондент</label>
                            <input type="text" name="correspondentBank" class="cabinet-form__input" value="${escapeHtml(data.correspondentBank || '')}">
                        </div>
                        <div class="cabinet-form__actions">
                            <button type="submit" class="cabinet-btn cabinet-btn--primary" ${requisites.isSaving ? 'disabled' : ''}>${requisites.isSaving ? ICONS.spinner + ' Сохранение...' : 'Сохранить реквизиты'}</button>
                        </div>
                        ${requisites.lastUpdatedAt ? `<p class="cabinet-form__note">Последнее обновление: ${formatDateTime(requisites.lastUpdatedAt)}</p>` : ''}
                    </form>
                </div>
            </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ПРОФИЛЬ
    // ─────────────────────────────────────────────────────────────────────────────

    function renderProfileSection(state) {
        const { client } = state;
        const providerLabel = { google: 'Google', vk: 'VK', email: 'Email' };

        return `
            <div class="cabinet-content__header"><h2 class="cabinet-content__title">Профиль</h2></div>
            <div class="cabinet-content__body">
                <div class="cabinet-profile">
                    <form class="cabinet-form" data-form="profile">
                        <div class="cabinet-profile__info">
                            <div class="cabinet-profile__avatar">${getInitials(client.name || client.email)}</div>
                            <div class="cabinet-profile__meta">
                                <p class="cabinet-profile__id">ID: ${escapeHtml(client.clientId || '')}</p>
                                <p class="cabinet-profile__email">${escapeHtml(client.email || '')}</p>
                                <p class="cabinet-profile__provider">Вход через: ${providerLabel[client.authProvider] || client.authProvider}</p>
                            </div>
                        </div>
                        <div class="cabinet-form__group"><label class="cabinet-form__label">Имя / Название компании</label><input type="text" name="name" class="cabinet-form__input" value="${escapeHtml(client.name || '')}"></div>
                        <div class="cabinet-form__row cabinet-form__row--2col">
                            <div class="cabinet-form__group"><label class="cabinet-form__label">Телефон</label><input type="tel" name="phone" class="cabinet-form__input" value="${escapeHtml(client.phone || '')}" placeholder="+7 (999) 123-45-67"></div>
                            <div class="cabinet-form__group"><label class="cabinet-form__label">Город</label><input type="text" name="city" class="cabinet-form__input" value="${escapeHtml(client.city || '')}"></div>
                        </div>
                        <div class="cabinet-form__actions"><button type="submit" class="cabinet-btn cabinet-btn--primary">Сохранить изменения</button></div>
                        <p class="cabinet-profile__member-since">Клиент с ${formatDate(client.createdAt)}</p>
                    </form>
                </div>
            </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ONBOARDING
    // ─────────────────────────────────────────────────────────────────────────────

    function renderOnboardingOverlay() {
        return `
            <div class="cabinet-onboarding-overlay" data-action="close-onboarding"></div>
            <div class="cabinet-onboarding">
                <button class="cabinet-onboarding__close" data-action="close-onboarding">${ICONS.close}</button>
                <h3>👋 Добро пожаловать!</h3>
                <div class="cabinet-onboarding__steps">
                    <div class="cabinet-onboarding__step"><span class="cabinet-onboarding__step-icon">${ICONS.chat}</span><div><strong>Чат</strong><p>Обсудите детали заказа с менеджером.</p></div></div>
                    <div class="cabinet-onboarding__step"><span class="cabinet-onboarding__step-icon">${ICONS.orders}</span><div><strong>Заказы</strong><p>Все ваши заявки и статусы.</p></div></div>
                    <div class="cabinet-onboarding__step"><span class="cabinet-onboarding__step-icon">${ICONS.requisites}</span><div><strong>Реквизиты</strong><p>Для выставления счетов.</p></div></div>
                </div>
                <div class="cabinet-onboarding__action">
                    <button class="cabinet-btn cabinet-btn--primary cabinet-btn--full" data-action="close-onboarding">Понятно</button>
                    <button class="cabinet-btn cabinet-btn--link" data-action="never-show-onboarding">Больше не показывать</button>
                </div>
            </div>`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ОБРАБОТЧИКИ СОБЫТИЙ
    // ═══════════════════════════════════════════════════════════════════════════

    async function handleClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        e.preventDefault();

        const action = target.dataset.action;
        try {
            switch (action) {
                case 'nav': CabinetStore.actions.setActiveSection(target.dataset.section); break;
                case 'social-login': await CabinetStore.actions.socialLogin(target.dataset.provider); break;
                case 'switch-auth': CabinetStore.actions.setAuthMode(target.dataset.mode); break;
                case 'show-email-auth': CabinetStore.actions.setSystem({ showContinueOrder: false }); CabinetStore.actions.setAuthMode('login'); break;
                case 'logout': if (confirm('Вы уверены, что хотите выйти?')) await CabinetStore.actions.logout(); break;
                case 'activate-chat':
                    const orderSelect = document.getElementById('chat-order-select');
                    await CabinetStore.actions.activateChat(orderSelect?.value || null);
                    break;
                case 'send-message':
                    const textarea = document.getElementById('chat-input');
                    if (textarea?.value.trim()) { await CabinetStore.actions.sendMessage(textarea.value.trim()); textarea.value = ''; textarea.focus(); }
                    break;
                // Задача 1: Повтор отправки сообщения
                case 'retry-message':
                    await CabinetStore.actions.retryMessage(target.dataset.messageId);
                    break;
                case 'discuss-order': CabinetStore.actions.setActiveSection('chat'); await CabinetStore.actions.activateChat(target.dataset.orderId); break;
                case 'close-onboarding': CabinetStore.actions.closeOnboarding(); break;
                // Задача 4: Больше не показывать onboarding
                case 'never-show-onboarding': CabinetStore.actions.closeOnboarding(); break;
                case 'open-cabinet': 
                    const cabinetApp = document.getElementById('cabinet-app');
                    if (cabinetApp) {
                        cabinetApp.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        // Если #cabinet-app нет на странице, перенаправляем на страницу кабинета
                        window.location.href = 'cabinet/index.html';
                    }
                    break;
            }
        } catch (error) {
            // Задача 6: Тихая обработка ошибок — логируем, показываем общее сообщение
            console.error('[CabinetUI] Action error:', action, error);
            // Не показываем alert с техническими деталями
        }
    }

    async function handleSubmit(e) {
        const form = e.target.closest('[data-form]');
        if (!form) return;
        e.preventDefault();

        const formType = form.dataset.form;
        const data = Object.fromEntries(new FormData(form).entries());

        try {
            switch (formType) {
                case 'login': await CabinetStore.actions.login(data.email, data.password); break;
                case 'register': await CabinetStore.actions.register(data); break;
                case 'requisites': await CabinetStore.actions.saveRequisites(data); alert('Реквизиты сохранены!'); break;
                case 'profile': await CabinetStore.actions.updateProfile(data); alert('Профиль обновлён!'); break;
            }
        } catch (error) {
            // Задача 6: Тихая обработка ошибок — логируем, показываем общее сообщение
            console.error('[CabinetUI] Form error:', formType, error);
            alert('Что-то пошло не так. Попробуйте ещё раз.');
        }
    }

    function handleKeydown(e) {
        if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.querySelector('[data-action="send-message"]')?.click();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════════════════════

    function init(containerId = 'cabinet-app') {
        const container = document.getElementById(containerId);
        if (!container) { 
            console.error(`[CabinetUI] Container #${containerId} not found`); 
            return; 
        }

        if (!CabinetStore) {
            console.error('[CabinetUI] CabinetStore is not loaded');
            return;
        }

        CabinetStore.subscribe((state) => render(state));
        container.addEventListener('click', handleClick);
        container.addEventListener('submit', handleSubmit);
        container.addEventListener('keydown', handleKeydown);
        CabinetStore.actions.init();

        console.log('[CabinetUI] Initialized successfully');
    }

    return { init, render, renderHeaderButton, ICONS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CabinetUI;

// ═══════════════════════════════════════════════════════════════════════════
// АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ (совместимость со старым кабинетом)
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация страницы кабинета
    const cabinetApp = document.getElementById('cabinet-app');
    if (cabinetApp) {
        if (typeof CabinetUI !== 'undefined' && CabinetUI.init) {
            CabinetUI.init();
        } else {
            console.error('[CabinetUI] CabinetUI is not defined');
        }
    }
    
    // Автоматическая инициализация кнопки в header
    const headerBtn = document.getElementById('cabinet-header-btn');
    if (headerBtn) {
        if (typeof CabinetUI !== 'undefined' && CabinetUI.renderHeaderButton) {
            // Начальный рендер (проверяем авторизацию)
            const isAuth = (typeof CabinetStore !== 'undefined' && CabinetStore?.selectors?.isAuthenticated) 
                ? CabinetStore.selectors.isAuthenticated() 
                : false;
            headerBtn.innerHTML = CabinetUI.renderHeaderButton(isAuth);
            
            // Подписка на изменения авторизации
            window.addEventListener('cabinet:auth-changed', (e) => {
                if (typeof CabinetUI !== 'undefined' && CabinetUI.renderHeaderButton) {
                    headerBtn.innerHTML = CabinetUI.renderHeaderButton(e.detail.isAuthenticated);
                }
            });
            
            // Обработчик клика для кнопки в шапке (если #cabinet-app нет на странице)
            if (!cabinetApp) {
                headerBtn.addEventListener('click', (e) => {
                    const button = e.target.closest('[data-action="open-cabinet"]');
                    if (button) {
                        e.preventDefault();
                        window.location.href = 'cabinet/index.html';
                    }
                });
            }
        } else {
            console.error('[CabinetUI] CabinetUI.renderHeaderButton is not defined');
        }
    }
});
