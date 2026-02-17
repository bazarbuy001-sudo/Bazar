/**
 * Orders Management Module
 */

class OrdersManager {
  constructor() {
    this.orders = [];
    this.currentOrder = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Search and filter
    document.getElementById('orders-search')?.addEventListener('keyup', () => {
      this.filterOrders();
    });

    document.getElementById('orders-status-filter')?.addEventListener('change', () => {
      this.filterOrders();
    });

    // Modal actions
    const modal = document.getElementById('order-modal');
    modal?.querySelector('.modal-close')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    document.getElementById('order-modal-close')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    document.getElementById('btn-print-invoice')?.addEventListener('click', () => {
      this.printInvoice();
    });

    // Close modal on overlay click
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  async loadOrders() {
    try {
      const response = await apiClient.getOrders();
      this.orders = response.orders || [];
      this.renderOrdersTable();
    } catch (error) {
      console.error('Failed to load orders:', error);
      dashboardManager.showToast('Ошибка загрузки заказов', 'error');
    }
  }

  renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');

    if (this.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Заказы не найдены</td></tr>';
      return;
    }

    tbody.innerHTML = this.orders.map(order => `
      <tr>
        <td>
          <a href="#" onclick="ordersManager.viewOrder('${order.id}'); return false;">
            ${this.truncate(order.public_id, 12)}
          </a>
        </td>
        <td>${order.client_name || 'Unknown'}</td>
        <td>
          <span class="badge badge-${this.getStatusBadgeClass(order.status)}">
            ${dashboardManager.formatStatus(order.status)}
          </span>
        </td>
        <td>${dashboardManager.formatPrice(order.total_amount)}</td>
        <td>${dashboardManager.formatDate(order.created_at)}</td>
        <td>
          <button class="btn btn-primary btn-small" onclick="ordersManager.viewOrder('${order.id}')">
            Детали
          </button>
          <button class="btn btn-secondary btn-small" onclick="ordersManager.changeStatus('${order.id}')">
            Статус
          </button>
        </td>
      </tr>
    `).join('');
  }

  filterOrders() {
    const search = document.getElementById('orders-search')?.value.toLowerCase() || '';
    const status = document.getElementById('orders-status-filter')?.value || '';

    const filtered = this.orders.filter(order => {
      const matchSearch = 
        order.public_id.toLowerCase().includes(search) ||
        (order.client_name && order.client_name.toLowerCase().includes(search));
      const matchStatus = !status || order.status === status;
      return matchSearch && matchStatus;
    });

    // Render filtered orders
    const tbody = document.getElementById('orders-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Заказы не найдены</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(order => `
      <tr>
        <td>
          <a href="#" onclick="ordersManager.viewOrder('${order.id}'); return false;">
            ${this.truncate(order.public_id, 12)}
          </a>
        </td>
        <td>${order.client_name || 'Unknown'}</td>
        <td>
          <span class="badge badge-${this.getStatusBadgeClass(order.status)}">
            ${dashboardManager.formatStatus(order.status)}
          </span>
        </td>
        <td>${dashboardManager.formatPrice(order.total_amount)}</td>
        <td>${dashboardManager.formatDate(order.created_at)}</td>
        <td>
          <button class="btn btn-primary btn-small" onclick="ordersManager.viewOrder('${order.id}')">
            Детали
          </button>
          <button class="btn btn-secondary btn-small" onclick="ordersManager.changeStatus('${order.id}')">
            Статус
          </button>
        </td>
      </tr>
    `).join('');
  }

  async viewOrder(orderId) {
    try {
      const order = await apiClient.getOrderById(orderId);
      this.currentOrder = order;

      const content = document.getElementById('order-modal-content');
      const items = order.items || [];

      content.innerHTML = `
        <div class="card">
          <div class="card-header">Информация о заказе</div>
          <div style="padding: 15px;">
            <p><strong>ID:</strong> ${order.public_id}</p>
            <p><strong>Клиент:</strong> ${order.client_name}</p>
            <p><strong>Статус:</strong> 
              <span class="badge badge-${this.getStatusBadgeClass(order.status)}">
                ${dashboardManager.formatStatus(order.status)}
              </span>
            </p>
            <p><strong>Сумма:</strong> ${dashboardManager.formatPrice(order.total_amount)}</p>
            <p><strong>Дата:</strong> ${dashboardManager.formatDate(order.created_at)}</p>
            <p><strong>Адрес доставки:</strong> ${order.shipping_address || 'Не указан'}</p>
            ${order.notes ? `<p><strong>Примечания:</strong> ${order.notes}</p>` : ''}
          </div>
        </div>

        <div class="card" style="margin-top: 15px;">
          <div class="card-header">Товары в заказе</div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f5f5f5;">
              <tr>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">Товар</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">Количество</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">Цена</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">Итого</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                    ${item.product_name || 'Unknown'} (${item.color || 'N/A'})
                  </td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                    ${item.requested_meters || item.quantity} ${item.unit || 'м'}
                  </td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                    ${dashboardManager.formatPrice(item.unit_price_per_meter || item.price)}
                  </td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                    ${dashboardManager.formatPrice(item.total_price)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      document.getElementById('order-modal').classList.add('active');
    } catch (error) {
      console.error('Failed to load order:', error);
      dashboardManager.showToast('Ошибка загрузки заказа', 'error');
    }
  }

  async changeStatus(orderId) {
    const newStatus = prompt(
      'Введите новый статус:\npending - На обработку\nconfirmed - Подтвержден\nprocessing - На отправку\nshipped - Отправлен\ndelivered - Доставлен'
    );

    if (!newStatus) return;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    if (!validStatuses.includes(newStatus)) {
      dashboardManager.showToast('Неверный статус', 'error');
      return;
    }

    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      dashboardManager.showToast('Статус обновлён', 'success');
      this.loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      dashboardManager.showToast('Ошибка обновления статуса', 'error');
    }
  }

  printInvoice() {
    if (!this.currentOrder) return;

    const order = this.currentOrder;
    const items = order.items || [];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Счёт ${order.public_id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>СЧЁТ-ФАКТУРА</h1>
          <p>№ ${order.public_id}</p>
          <p>Дата: ${dashboardManager.formatDate(order.created_at)}</p>
        </div>

        <h3>Клиент:</h3>
        <p>
          <strong>${order.client_name}</strong><br>
          ${order.shipping_address || ''}
        </p>

        <h3>Товары:</h3>
        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Количество</th>
              <th>Цена</th>
              <th>Итого</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.product_name || 'Unknown'} (${item.color || 'N/A'})</td>
                <td>${item.requested_meters || item.quantity} ${item.unit || 'м'}</td>
                <td>${dashboardManager.formatPrice(item.unit_price_per_meter || item.price)}</td>
                <td>${dashboardManager.formatPrice(item.total_price)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          ИТОГО: ${dashboardManager.formatPrice(order.total_amount)}
        </div>

        <div class="footer">
          <p>Статус: ${dashboardManager.formatStatus(order.status)}</p>
          ${order.notes ? `<p>Примечания: ${order.notes}</p>` : ''}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  getStatusBadgeClass(status) {
    return dashboardManager.getStatusBadgeClass(status);
  }

  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.ordersManager = new OrdersManager();
});
