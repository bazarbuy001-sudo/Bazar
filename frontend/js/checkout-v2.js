/**
 * Checkout Handler v2
 * Работает с новым API для создания заказов
 */

class CheckoutV2 {
  constructor() {
    this.cartStore = window.CartStore;
    this.ordersAPI = window.ordersAPI;
  }

  /**
   * Создать заказ из корзины
   * @param {Object} clientData - Данные клиента {name, email, phone, city, address}
   */
  async submitOrder(clientData) {
    try {
      // Получить товары из корзины
      const cartItems = this.cartStore?.getCart?.() || JSON.parse(localStorage.getItem('cart') || '[]');

      if (!cartItems || cartItems.length === 0) {
        throw new Error('Корзина пуста. Добавьте товары перед оформлением.');
      }

      // Валидировать данные клиента
      if (!clientData || !clientData.email || !clientData.phone) {
        throw new Error('Заполните контактные данные');
      }

      // Преобразовать товары в формат для API
      const items = cartItems.map(item => ({
        productId: item.productId || item.id,
        color: item.color || '',
        meters: item.meters || 1,
        rolls: item.rolls || 0
      }));

      // Сконструировать адрес доставки
      const shippingAddress = {
        city: clientData.city || '',
        street: clientData.address || '',
        phone: clientData.phone,
        notes: clientData.notes || ''
      };

      // Отправить на backend
      console.log('📦 Создание заказа...', { items, shippingAddress });

      const response = await this.ordersAPI.createOrder(items, shippingAddress);

      if (!response.success) {
        throw new Error(response.error || 'Ошибка при создании заказа');
      }

      // Успех
      console.log('✅ Заказ создан!', response.data);

      // Очистить корзину
      this.cartStore?.clearCart?.();
      localStorage.removeItem('cart');

      // Сохранить информацию о заказе
      localStorage.setItem('last_order_id', response.data.orderId);
      localStorage.setItem('last_order_public_id', response.data.publicId);
      localStorage.setItem('last_chat_id', response.data.chatId);

      return {
        success: true,
        orderId: response.data.orderId,
        publicId: response.data.publicId,
        chatId: response.data.chatId,
        totalAmount: response.data.totalAmount
      };
    } catch (error) {
      console.error('❌ Ошибка при создании заказа:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Показать подтверждение заказа перед отправкой
   */
  async getOrderConfirmation() {
    const cartItems = this.cartStore?.getCart?.() || JSON.parse(localStorage.getItem('cart') || '[]');
    
    let totalAmount = 0;
    const itemsWithPrice = [];

    // Получить информацию о товарах (нужна цена)
    for (const item of cartItems) {
      // TODO: получить цену товара из API
      const price = item.price || 0;
      const itemTotal = price * (item.meters || 1);
      totalAmount += itemTotal;

      itemsWithPrice.push({
        ...item,
        itemTotal
      });
    }

    return {
      items: itemsWithPrice,
      totalAmount
    };
  }
}

// Create global instance
const checkoutV2 = new CheckoutV2();
