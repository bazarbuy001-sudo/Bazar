/**
 * API INDEX
 * Экспорт всех API модулей для удобного подключения
 * 
 * Используется для загрузки всех API модулей одной строкой:
 * <script src="js/api/client.js"></script>
 * <script src="js/api/index.js"></script>
 */

// API клиент уже должен быть загружен перед этим файлом
if (typeof ApiClient === 'undefined') {
  console.error('[API] ApiClient не найден. Убедитесь, что client.js загружен первым.');
}

// Все модули должны быть загружены до этого файла
if (typeof ProductsAPI === 'undefined') {
  console.error('[API] ProductsAPI не найден');
}

if (typeof CartAPI === 'undefined') {
  console.error('[API] CartAPI не найден');
}

if (typeof CheckoutAPI === 'undefined') {
  console.error('[API] CheckoutAPI не найден');
}

if (typeof OrdersAPI === 'undefined') {
  console.error('[API] OrdersAPI не найден');
}

if (typeof CabinetAPI === 'undefined') {
  console.error('[API] CabinetAPI не найден');
}

// Единая точка входа для всех API
const API = {
  client: ApiClient,
  products: ProductsAPI,
  cart: CartAPI,
  checkout: CheckoutAPI,
  orders: OrdersAPI,
  cabinet: CabinetAPI
};

// Export
if (typeof window !== 'undefined') {
  window.API = API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}

// Логирование инициализации
console.log('[API] Инициализирован успешно:', API);
