document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('productContainer');
  
    // Получаем id товара из URL
    const params = new URLSearchParams(window.location.search);
    const productId = Number(params.get('id'));
  
    if (!productId) {
      container.innerHTML = '<p>Товар не найден.</p>';
      return;
    }
  
    try {
      // Загружаем товары
      const response = await fetch('/frontend/data/products.json');
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
  
      const products = await response.json();
      const product = products.find(p => p.id === productId);
  
      if (!product) {
        container.innerHTML = '<p>Товар не найден.</p>';
        return;
      }
  
      const priceText =
        product.price === null
          ? 'Цена по запросу'
          : product.price + ' ₽ / м';
  
      // Рендерим карточку товара
      container.innerHTML = `
        <div class="product-page">
          <div class="product-image">
            <img src="${product.image}" alt="${product.name}">
          </div>
  
          <div class="product-details">
            <h1>${product.name}</h1>
            <p><strong>Категория:</strong> ${product.category}</p>
            <p class="product-price">${priceText}</p>
            <button class="request-btn">Запросить цену</button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error(error);
      container.innerHTML =
        '<p>Ошибка загрузки товара. Пожалуйста, обновите страницу.</p>';
    }
  });
  