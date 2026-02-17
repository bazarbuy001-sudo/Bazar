# Личный кабинет пользователя

**Модуль B2B личного кабинета** — вечная архитектура, готовая к интеграции с WordPress.

## Структура модуля

```
/frontend/cabinet/
├── index.html         # Страница кабинета
├── cabinet.js         # UI компоненты и события
├── cabinet-store.js   # Состояние (реактивный store)
├── cabinet-api.js     # API-адаптер (заглушка → WordPress)
├── cabinet.css        # Стили
└── README.md          # Документация
```

## Ключевые принципы

### 1. Кнопка "Личный кабинет"

Используется **ВСЕГДА** одно название: **"Личный кабинет"**

- ❌ НЕ "Войти"
- ❌ НЕ "Регистрация"

**Поведение:**
- Не авторизован → страница входа/регистрации
- Авторизован → личный кабинет

### 2. Кабинет ≠ Магазин

Личный кабинет — это **хранилище данных пользователя**, не каталог:
- Заказы (заявки)
- Чат с менеджером
- Профиль (Client)
- Реквизиты

**Цены и суммы приходят с backend** — фронт ничего не считает.

### 3. WordPress-Ready архитектура

```
┌─────────────────────────────────────────────────────────┐
│                     cabinet.js (UI)                     │
│                           │                             │
│                    cabinet-store.js                     │
│                           │                             │
│                    cabinet-api.js ◄── ЕДИНСТВЕННАЯ      │
│                           │          ТОЧКА ЗАМЕНЫ       │
│                    ───────┼───────                      │
│                           ▼                             │
│               WordPress REST API                        │
└─────────────────────────────────────────────────────────┘
```

Замена backend = замена **только** `cabinet-api.js`

## Авторизация

### Способы входа (один аккаунт):
1. Email + пароль (с подтверждением email)
2. Google OAuth
3. VK OAuth

**Текущий статус:** Frontend готовность (экраны, состояния, контракты API)

## Разделы кабинета

### Мои заказы

| Поле | Описание |
|------|----------|
| Дата | Дата создания заявки |
| Номер | Уникальный ID заказа |
| Статус | Статус обработки |
| Сумма | Приходит с backend (может быть null) |

**Карточка заказа:**
- Список товаров (productId, color, meters, rolls)
- Статус заявки
- Информация о доставке
- Кнопка "Связаться с менеджером" (открывает чат)

**Черновик заказа:**
- При отправке из корзины создаётся `draftOrder`
- Показывается экран "Продолжить оформление заказа"
- После авторизации создаётся полный Order

### Чат с менеджером

**Функции:**
- История сообщений
- Статусы доставки (pending/delivered/failed)
- Повторная отправка при ошибке
- Индикатор набора текста менеджером
- Привязка к конкретному заказу (опционально)
- Офлайн-индикатор менеджера
- Счётчик непрочитанных сообщений

**Принцип работы:**
- Чат принадлежит **клиенту**, а не заказу
- Можно обсуждать несколько заказов в одном чате
- Можно выбрать заказ для контекста обсуждения

### Профиль (Client)

**Архитектурное решение:** Используется единая сущность `Client`, объединяющая auth и profile:

- Идентификация (id, clientId)
- Данные авторизации (email, authProvider, emailVerified)
- Профиль (name, city, phone)
- Флаги (isAuthenticated, isFirstLogin)
- Метаданные (createdAt, lastLoginAt)

**При первом входе:** Показывается onboarding-экран с подсказками.

### Реквизиты

**Обязательные поля:**
- Наименование (ИП / компания / ФИО)
- Валюта счёта
- Получатель

**Опциональные поля:**
- ИИН
- Регистрационный номер
- Юридический адрес
- Почтовый адрес
- Банк
- Банк-корреспондент

**Из профиля (только отображение):**
- Телефон
- Email

## Контракты данных

### Client (клиент)

```javascript
{
  // Идентификация
  id: string,                    // Внутренний UUID (из backend)
  clientId: string,              // Публичный ID "CL-000124"
  
  // Данные авторизации
  email: string,
  authProvider: 'email' | 'google' | 'vk',
  emailVerified: boolean,
  
  // Профиль
  name: string,                  // ФИО или название компании
  city: string,
  phone: string,
  
  // Флаги
  isAuthenticated: boolean,
  isFirstLogin: boolean,
  
  // Мета
  createdAt: string,             // ISO date
  lastLoginAt: string            // ISO date
}
```

### Order (заявка)

```javascript
{
  id: string,
  items: [
    { 
      productId: string, 
      name?: string,             // Опционально (для отображения)
      color: string, 
      meters: number, 
      rolls: number,
      price?: number             // Опционально (для отображения)
    }
  ],
  status: string,                // 'draft' | 'pending_approval' | 'В работе' | 'Исполнен' | 'Отменён'
  total: number | null,          // приходит с backend
  createdAt: string,             // ISO date
  delivery: {
    address: string,
    deliveredAt: string          // ISO date
  } | null
}
```

### Chat (чат)

```javascript
{
  messages: [
    {
      id: string,
      sender: 'client' | 'manager' | 'system',
      text: string,
      createdAt: string,         // ISO date
      orderId: string | null,    // Привязка к заказу (опционально)
      status: 'pending' | 'delivered' | 'failed'  // Только для client
    }
  ],
  isActive: boolean,             // Чат открыт в UI
  managerConnected: boolean,     // Менеджер подключился
  isTyping: boolean,             // Индикатор "менеджер печатает"
  lastMessageAt: string | null,  // ISO date
  lastManagerActivityAt: string | null,  // ISO date (для офлайн-индикатора)
  unreadCount: number,
  activeOrderId: string | null   // Заказ, который обсуждается
}
```

### Requisites (реквизиты)

```javascript
{
  name: string,                  // обязательно
  currency: string,              // обязательно
  recipient: string,             // обязательно
  inn?: string,
  regNumber?: string,
  legalAddress?: string,
  postalAddress?: string,
  bank?: string,
  correspondentBank?: string,
  updatedAt?: string             // ISO date
}
```

## Интеграция с корзиной

Корзина отправляет заявку **через событие**:

```javascript
// В модуле корзины:
window.dispatchEvent(new CustomEvent('cart:submit-order', {
  detail: {
    items: [
      { 
        productId: 'prod_001', 
        name: 'Хлопок Premium',      // Опционально
        color: 'Белый', 
        meters: 150, 
        rolls: 3,
        price: 15000                  // Опционально
      }
    ]
  }
}));

// Кабинет подхватывает и:
// 1. Если не авторизован → создаёт draftOrder и показывает экран "Продолжить заказ"
// 2. Если авторизован → создаёт Order через API
```

**Слушать ответ:**

```javascript
window.addEventListener('cabinet:order-submitted', (e) => {
  const order = e.detail.order;
  console.log('Заказ создан:', order.id);
  
  // Очищаем корзину
  // Показываем уведомление
  // Перенаправляем в кабинет
});
```

## События

### Исходящие (ЛК → сайт):

| Событие | Данные | Описание |
|---------|--------|----------|
| `cabinet:auth-changed` | `{ isAuthenticated, user }` | Изменение авторизации |
| `cabinet:order-submitted` | `{ order }` | Создан новый заказ |
| `cabinet:state-change` | `{ state }` | Любое изменение состояния |
| `cabinet:requisites-saved` | `{ requisites }` | Реквизиты сохранены |
| `cabinet:chat-message-sent` | `{ message }` | Сообщение отправлено |

### Входящие (сайт → ЛК):

| Событие | Данные | Описание |
|---------|--------|----------|
| `cart:submit-order` | `{ items }` | Заявка из корзины |
| `cabinet:manager-message` | `{ id, sender: 'manager', text, createdAt, orderId? }` | Сообщение от менеджера |
| `cabinet:manager-connected` | `{}` | Менеджер подключился к чату |
| `cabinet:manager-typing` | `{}` | Менеджер печатает |

## Административный доступ (готовность)

API-адаптер готов к админ-функциям:

```javascript
// Поиск пользователей (по email, имени, компании)
CabinetAPI.admin.searchUsers('query');

// Получить все данные пользователя
CabinetAPI.admin.getUserData('user_id');
// → { client, orders, requisites, chat }
```

## Тестирование

**Тестовые данные для входа:**
- Email: `test@example.com`
- Password: `password123` или `123456`

Или зарегистрируйте нового пользователя.

**Тестовая панель:**
- Доступна в `index.html` (только для разработки)
- Быстрый вход/выход
- Симуляция событий
- Переключение разделов
- Скрывается по Ctrl+Shift+T

## Подключение WordPress

1. Включите `CONFIG.useMock = false` в `cabinet-api.js`
2. Настройте `CONFIG.baseURL` на ваш WordPress REST API
3. Реализуйте endpoints на стороне WordPress

**Endpoints для реализации:**

```
POST   /wp-json/cabinet/v1/auth/login
POST   /wp-json/cabinet/v1/auth/logout
POST   /wp-json/cabinet/v1/auth/register
POST   /wp-json/cabinet/v1/auth/social
GET    /wp-json/cabinet/v1/auth/check

GET    /wp-json/cabinet/v1/user/client
PUT    /wp-json/cabinet/v1/user/client

GET    /wp-json/cabinet/v1/orders
GET    /wp-json/cabinet/v1/orders/{id}
POST   /wp-json/cabinet/v1/orders

GET    /wp-json/cabinet/v1/user/requisites
PUT    /wp-json/cabinet/v1/user/requisites

GET    /wp-json/cabinet/v1/chat/history
POST   /wp-json/cabinet/v1/chat/send
POST   /wp-json/cabinet/v1/telegram/notify
```

## Запреты (строго соблюдать)

- ❌ НЕ писать backend в этом модуле
- ❌ НЕ подключать WordPress напрямую
- ❌ НЕ менять каталог / popup / корзину
- ❌ НЕ дублировать данные между модулями
- ❌ НЕ считать цены на фронте
- ❌ НЕ менять структуру состояния (client, chat, orders, requisites, system)
- ❌ НЕ менять имена событий (EVENTS константы)

## Архитектурные решения

### Client вместо Profile + Auth

**Причина:** Упрощение структуры состояния — один объект содержит всю информацию о клиенте (идентификация, авторизация, профиль).

**Преимущества:**
- Меньше вложенности
- Проще обновлять данные
- Логически объединённая сущность

### Чат принадлежит клиенту

**Принцип:** Чат не привязан к конкретному заказу, а принадлежит клиенту целиком.

**Преимущества:**
- Можно обсуждать несколько заказов в одном чате
- История не теряется при закрытии заказа
- Менеджер видит всю историю общения

**Контекст заказа:** Опциональная привязка через `activeOrderId` для контекста обсуждения.

### DraftOrder для интеграции с корзиной

**Принцип:** При отправке из корзины создаётся черновик, который сохраняется до авторизации.

**Преимущества:**
- Плавная интеграция с корзиной
- Не теряются данные при необходимости авторизации
- Удобный UX "Продолжить оформление"

## Лицензия

Proprietary. Все права защищены.
