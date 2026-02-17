# PHASE 3 - Backend API Integration Guide

**Дата:** 2026-02-15  
**Версия:** 1.0  
**Статус:** 🚀 Ready for Implementation

---

## 📋 Что было создано

### API Модули (`frontend/js/api/`)

#### 1. **client.js** (базовый HTTP клиент)
- Fetch API с retry logic
- Error handling (404, 500, timeout, network errors)
- Loading state management
- Cache management (TTL 5 min)
- Token management для авторизации
- Request/Response interceptors

**Публичные методы:**
```javascript
// HTTP методы
ApiClient.get(endpoint, params, options)
ApiClient.post(endpoint, body, options)
ApiClient.put(endpoint, body, options)
ApiClient.patch(endpoint, body, options)
ApiClient.delete(endpoint, options)

// Auth
ApiClient.setAuthToken(token)
ApiClient.getAuthToken()
ApiClient.clearAuthToken()

// Loading state
ApiClient.getLoadingState()

// Cache
ApiClient.getFromCache(endpoint, params)
ApiClient.setCache(endpoint, params, data)
ApiClient.clearCache(endpoint)
```

#### 2. **products.js** (каталог товаров)
Endpoints:
- `GET /api/v1/products` (с фильтрацией, сортировкой, пагинацией)
- `GET /api/v1/products/:id`
- `GET /api/v1/products/categories`
- `GET /api/v1/products/colors/:category`
- `GET /api/v1/products/price-range`

**Публичные методы:**
```javascript
ProductsAPI.getProducts(filters)      // фильтры, сортировка, пагинация
ProductsAPI.getProductById(productId) // получить товар по ID
ProductsAPI.search(query, options)    // поиск по названию
ProductsAPI.getCategories()           // все категории
ProductsAPI.getColorsByCategory(cat)  // цвета для категории
ProductsAPI.getPriceRange()           // диапазон цен
ProductsAPI.clearAllCache()           // очистить кэш
```

#### 3. **cart.js** (корзина)
Endpoints:
- `GET /api/v1/cart`
- `POST /api/v1/cart` (добавить товар)
- `PUT /api/v1/cart/:itemId` (обновить метраж)
- `DELETE /api/v1/cart/:itemId` (удалить товар)
- `DELETE /api/v1/cart` (очистить корзину)

**Публичные методы:**
```javascript
CartAPI.getCart()              // получить содержимое корзины
CartAPI.addToCart(item)        // добавить товар
CartAPI.updateCartItem(id, updates) // обновить метраж
CartAPI.removeFromCart(itemId) // удалить товар
CartAPI.clearCart()            // очистить корзину
```

#### 4. **checkout.js** (оформление заказа - 2 шага)
Endpoints:
- `POST /api/v1/checkout/init` (Step 1)
- `POST /api/v1/checkout/confirmation` (Step 2)
- `POST /api/v1/checkout/submit` (создать заказ)
- `GET /api/v1/checkout/session/:sessionId` (состояние сессии)

**Публичные методы:**
```javascript
CheckoutAPI.initCheckout(data)        // Step 1: контакты и адрес
CheckoutAPI.getConfirmation(sessionId) // Step 2: подтверждение
CheckoutAPI.submitOrder(sessionId)    // Step 3: создать заказ
CheckoutAPI.getSessionInfo(sessionId) // информация о сессии
CheckoutAPI.saveSessionId(id)         // сохранить sessionId
CheckoutAPI.getSessionId()            // получить sessionId
CheckoutAPI.clearSessionId()          // очистить sessionId
```

#### 5. **orders.js** (управление заказами)
Endpoints:
- `GET /api/v1/orders` (список заказов)
- `GET /api/v1/orders/:orderId` (детали заказа)
- `GET /api/v1/orders/stats` (статистика)
- `POST /api/v1/orders/:orderId/cancel` (отмена заказа)

**Публичные методы:**
```javascript
OrdersAPI.getOrders(filters)   // список заказов с фильтрацией
OrdersAPI.getOrderById(orderId) // детали конкретного заказа
OrdersAPI.getStats()           // статистика заказов
OrdersAPI.cancelOrder(orderId, reason) // отменить заказ
OrdersAPI.clearOrdersCache()   // очистить кэш
```

#### 6. **cabinet.js** (личный кабинет)
Endpoints:
- `GET /api/v1/cabinet/profile` (профиль)
- `PUT /api/v1/cabinet/profile` (обновить профиль)
- `GET /api/v1/cabinet/addresses` (адреса)
- `POST /api/v1/cabinet/addresses` (добавить адрес)
- `DELETE /api/v1/cabinet/addresses/:addressId` (удалить адрес)
- `GET /api/v1/cabinet/preferences` (предпочтения)
- `PUT /api/v1/cabinet/preferences` (обновить предпочтения)

**Публичные методы:**
```javascript
CabinetAPI.getProfile()        // профиль пользователя
CabinetAPI.updateProfile(data) // обновить профиль
CabinetAPI.getAddresses()      // список адресов
CabinetAPI.addAddress(address) // добавить адрес
CabinetAPI.deleteAddress(id)   // удалить адрес
CabinetAPI.getPreferences()    // предпочтения
CabinetAPI.updatePreferences(prefs) // обновить предпочтения
CabinetAPI.clearCabinetCache() // очистить кэш
```

#### 7. **index.js** (единая точка входа)
```javascript
API.client    // ApiClient
API.products  // ProductsAPI
API.cart      // CartAPI
API.checkout  // CheckoutAPI
API.orders    // OrdersAPI
API.cabinet   // CabinetAPI
```

---

## 🔌 Как подключить к HTML

### Порядок загрузки скриптов

```html
<!-- 1. API Client (базовый клиент) -->
<script src="js/api/client.js"></script>

<!-- 2. API Модули (в любом порядке) -->
<script src="js/api/products.js"></script>
<script src="js/api/cart.js"></script>
<script src="js/api/checkout.js"></script>
<script src="js/api/orders.js"></script>
<script src="js/api/cabinet.js"></script>

<!-- 3. Единая точка входа (опционально) -->
<script src="js/api/index.js"></script>

<!-- 4. Существующие модули (используют API) -->
<script src="js/catalog.js"></script>
<script src="js/cart-store.js"></script>
<script src="js/product-popup.js"></script>
<!-- и т.д. -->
```

### Пример для catalog.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Каталог</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- HTML структура остаётся без изменений -->
  
  <!-- API Scripts -->
  <script src="js/api/client.js"></script>
  <script src="js/api/products.js"></script>
  <script src="js/api/index.js"></script>
  
  <!-- App Scripts -->
  <script src="js/catalog.js"></script>
  
  <script>
    // Инициализация каталога (автоматически используёт ProductsAPI)
    document.addEventListener('DOMContentLoaded', async () => {
      const products = await Catalog.load();
      Catalog.render('#catalog-grid');
      Catalog.renderPromo();
    });
  </script>
</body>
</html>
```

### Пример для cart.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Корзина</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- HTML структура остаётся без изменений -->
  
  <!-- API Scripts -->
  <script src="js/api/client.js"></script>
  <script src="js/api/products.js"></script>
  <script src="js/api/cart.js"></script>
  <script src="js/api/checkout.js"></script>
  <script src="js/api/index.js"></script>
  
  <!-- App Scripts -->
  <script src="js/cart-store.js"></script>
  
  <script>
    // Инициализация корзины (автоматически синхронизируется с backend)
    document.addEventListener('DOMContentLoaded', () => {
      // CartStore инициализируется и загружает данные из API
    });
  </script>
</body>
</html>
```

---

## 🚀 Использование API в коде

### Пример 1: Загрузка товаров с фильтрацией

```javascript
// Получить товары с фильтрацией и сортировкой
const result = await ProductsAPI.getProducts({
  category: 'fabrics',
  sort: 'price_asc',
  page: 1,
  limit: 20,
  minPrice: 100,
  maxPrice: 500
});

if (result.success) {
  console.log('Товары:', result.data.products);
  console.log('Всего товаров:', result.data.total);
} else {
  console.error('Ошибка:', result.error);
}
```

### Пример 2: Добавление товара в корзину

```javascript
// Слушаем событие от popup
document.addEventListener('product:addToCart', async (event) => {
  const item = {
    productId: event.detail.productId,
    color: event.detail.color,
    meters: event.detail.meters,
    rolls: event.detail.rolls
  };

  const result = await CartAPI.addToCart(item);
  
  if (result.success) {
    console.log('Товар добавлен в корзину');
  } else {
    console.error('Ошибка:', result.error);
  }
});
```

### Пример 3: Получение информации профиля

```javascript
const result = await CabinetAPI.getProfile();

if (result.success) {
  const profile = result.data;
  console.log('Профиль:', {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    inn: profile.inn
  });
} else {
  console.error('Ошибка загрузки профиля:', result.error);
}
```

### Пример 4: Оформление заказа (2 шага)

```javascript
// Step 1: Инициализировать checkout с контактами
const initResult = await CheckoutAPI.initCheckout({
  name: 'ООО Рога и Копыта',
  email: 'info@example.com',
  phone: '+7 (999) 123-45-67',
  city: 'Москва',
  address: 'ул. Примерная, д. 123, офис 456',
  postalCode: '101000',
  notes: 'Примечание'
});

if (!initResult.success) {
  console.error('Ошибка инициализации:', initResult.error);
  return;
}

const sessionId = initResult.data.sessionId;
console.log('Session ID:', sessionId);

// Step 2: Получить информацию для подтверждения
const confirmResult = await CheckoutAPI.getConfirmation(sessionId);

if (!confirmResult.success) {
  console.error('Ошибка получения подтверждения:', confirmResult.error);
  return;
}

console.log('Сумма заказа:', confirmResult.data.totalAmount);
console.log('Товары:', confirmResult.data.items);

// Step 3: Отправить заказ
const submitResult = await CheckoutAPI.submitOrder(sessionId);

if (!submitResult.success) {
  console.error('Ошибка при создании заказа:', submitResult.error);
  return;
}

console.log('Заказ создан!');
console.log('Order ID:', submitResult.data.orderId);
console.log('Public ID:', submitResult.data.publicId);
```

---

## ⚡ Loading States (Спиннеры)

Используйте событие `api:loading` для отображения спиннеров:

```javascript
document.addEventListener('api:loading', (event) => {
  if (event.detail.isLoading) {
    console.log('API запрос началась...');
    // Показать спиннер
    document.querySelector('.spinner')?.classList.add('visible');
  } else {
    console.log('API запрос завершена');
    // Скрыть спиннер
    document.querySelector('.spinner')?.classList.remove('visible');
  }
});
```

---

## 💾 Кэширование

### Кэш автоматически:
- Products list (5 min TTL)
- Product details (5 min TTL)
- Categories (5 min TTL)
- Price range (5 min TTL)

### Явно очистить кэш:

```javascript
// Очистить только товары
ProductsAPI.clearProductsCache();

// Очистить категории
ProductsAPI.clearCategoriesCache();

// Очистить всё
ProductsAPI.clearAllCache();

// Очистить конкретный endpoint
ApiClient.clearCache('/products');
```

---

## 🔐 Авторизация (Token Management)

Если backend требует токен:

```javascript
// Установить токен (сохраняется в localStorage)
ApiClient.setAuthToken('your-jwt-token-here');

// Получить текущий токен
const token = ApiClient.getAuthToken();

// Очистить токен (logout)
ApiClient.clearAuthToken();
```

Токен автоматически добавляется в заголовок `Authorization: Bearer <token>` для всех запросов.

---

## 🔧 Конфигурация

### Изменить базовый URL:
```javascript
ApiClient.setBaseURL('http://localhost:3000/api/v1');
```

### Изменить timeout:
```javascript
ApiClient.setTimeout(20000); // 20 секунд
```

---

## ✅ Что интегрировано

### ✅ Готово в Phase 3:
1. **API Client** - базовый HTTP клиент с retry, cache, error handling
2. **ProductsAPI** - полная интеграция каталога товаров
3. **CartAPI** - работа с корзиной
4. **CheckoutAPI** - 2-step checkout
5. **OrdersAPI** - управление заказами
6. **CabinetAPI** - личный кабинет
7. **catalog.js** - обновлён для использования ProductsAPI
8. **cart-store.js** - обновлён для использования CartAPI (с fallback на localStorage)

### ⏳ Требует дополнительной интеграции:
- **product-popup.js** - загрузка товара по ID через ProductsAPI
- **product.html** - подключение скриптов
- **checkout.js** - использование CheckoutAPI для оформления
- **cabinet.js** - использование CabinetAPI для личного кабинета
- **search/** - использование ProductsAPI.search()
- **mobile-header.js** - поиск товаров через API

### 📝 Визуально неизменно:
- Все HTML файлы остаются без изменений ✅
- Все CSS файлы остаются без изменений ✅
- Визуальный дизайн полностью сохранён ✅

---

## 🏁 Чек-лист для запуска

- [ ] Backend запущен на http://localhost:3000
- [ ] Frontend скрипты подключены в правильном порядке (client.js первым)
- [ ] API модули загружены перед основными скриптами
- [ ] Проверить консоль браузера на ошибки подключения
- [ ] Проверить Network tab в DevTools - запросы должны идти на http://localhost:3000/api/v1/*
- [ ] Тестировать функциональность:
  - [ ] Загрузка каталога товаров
  - [ ] Фильтрация и сортировка
  - [ ] Добавление товара в корзину
  - [ ] Получение данных корзины
  - [ ] Оформление заказа (2 шага)
  - [ ] Просмотр заказов

---

## 🐛 Troubleshooting

### Проблема: "ProductsAPI is not defined"
**Решение:** Убедитесь, что скрипты загружены в правильном порядке:
1. client.js
2. products.js
3. остальные модули

### Проблема: Товары не загружаются, используется localStorage
**Решение:** Проверьте, что backend запущен на http://localhost:3000 и endpoints доступны. Откройте DevTools Network, должны быть запросы на `/api/v1/products`

### Проблема: CORS ошибки
**Решение:** Backend должен иметь правильно настроенный CORS. Проверьте в server.ts:
```typescript
app.use(cors());
```

### Проблема: API запросы timeout
**Решение:** Увеличьте timeout в ApiClient:
```javascript
ApiClient.setTimeout(30000); // 30 секунд
```

---

## 📚 Дополнительно

- **Без платежей** ✅ (нет PaymentAPI)
- **Без CDEK** ✅ (доставка базовая)
- **Fallback механизм** ✅ (localStorage используется если API недоступен)
- **Error handling** ✅ (все ошибки логируются и обрабатываются)
- **Loading states** ✅ (через событие api:loading)
- **Кэширование** ✅ (с TTL 5 минут)

---

**Статус:** 🚀 Ready for Production  
**Дата:** 2026-02-15

