/**
 * Clients Management Module
 */

class ClientsManager {
  constructor() {
    this.clients = [];
    this.currentClient = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Search
    document.getElementById('clients-search')?.addEventListener('keyup', () => {
      this.filterClients();
    });

    document.querySelector('[onclick*="clients-search"]')?.addEventListener('click', () => {
      this.filterClients();
    });
  }

  async loadClients() {
    try {
      const response = await apiClient.getClients();
      this.clients = response.clients || [];
      this.renderClientsTable();
    } catch (error) {
      console.error('Failed to load clients:', error);
      dashboardManager.showToast('Ошибка загрузки клиентов', 'error');
    }
  }

  renderClientsTable() {
    const tbody = document.getElementById('clients-tbody');

    if (this.clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Клиенты не найдены</td></tr>';
      return;
    }

    tbody.innerHTML = this.clients.map(client => `
      <tr>
        <td>${this.truncate(client.public_id, 10)}</td>
        <td>${client.name}</td>
        <td>${client.email}</td>
        <td>${client.phone || '—'}</td>
        <td>${client.city || '—'}</td>
        <td>
          <span class="badge ${client.is_active ? 'badge-success' : 'badge-danger'}">
            ${client.is_active ? 'Активен' : 'Заблокирован'}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-small" onclick="clientsManager.viewClient('${client.id}')">
            Профиль
          </button>
          ${client.is_active ? `
            <button class="btn btn-danger btn-small" onclick="clientsManager.blockClient('${client.id}')">
              Блокировать
            </button>
          ` : `
            <button class="btn btn-success btn-small" onclick="clientsManager.unblockClient('${client.id}')">
              Разблокировать
            </button>
          `}
        </td>
      </tr>
    `).join('');
  }

  filterClients() {
    const search = document.getElementById('clients-search')?.value.toLowerCase() || '';

    const filtered = this.clients.filter(client => {
      return (
        client.name.toLowerCase().includes(search) ||
        client.email.toLowerCase().includes(search) ||
        client.public_id.toLowerCase().includes(search) ||
        (client.phone && client.phone.includes(search))
      );
    });

    const tbody = document.getElementById('clients-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Клиенты не найдены</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(client => `
      <tr>
        <td>${this.truncate(client.public_id, 10)}</td>
        <td>${client.name}</td>
        <td>${client.email}</td>
        <td>${client.phone || '—'}</td>
        <td>${client.city || '—'}</td>
        <td>
          <span class="badge ${client.is_active ? 'badge-success' : 'badge-danger'}">
            ${client.is_active ? 'Активен' : 'Заблокирован'}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-small" onclick="clientsManager.viewClient('${client.id}')">
            Профиль
          </button>
          ${client.is_active ? `
            <button class="btn btn-danger btn-small" onclick="clientsManager.blockClient('${client.id}')">
              Блокировать
            </button>
          ` : `
            <button class="btn btn-success btn-small" onclick="clientsManager.unblockClient('${client.id}')">
              Разблокировать
            </button>
          `}
        </td>
      </tr>
    `).join('');
  }

  async viewClient(clientId) {
    try {
      const client = await apiClient.getClientById(clientId);
      const orders = await apiClient.getClientOrders(clientId);

      this.currentClient = client;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay active';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h2>${client.name}</h2>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="card">
              <div class="card-header">Информация о компании</div>
              <div style="padding: 15px;">
                <p><strong>ID:</strong> ${client.public_id}</p>
                <p><strong>Email:</strong> ${client.email}</p>
                <p><strong>Телефон:</strong> ${client.phone || '—'}</p>
                <p><strong>Город:</strong> ${client.city || '—'}</p>
                <p><strong>ИНН:</strong> ${client.inn || '—'}</p>
                <p><strong>Статус:</strong> 
                  <span class="badge ${client.is_active ? 'badge-success' : 'badge-danger'}">
                    ${client.is_active ? 'Активен' : 'Заблокирован'}
                  </span>
                </p>
              </div>
            </div>

            <div class="card" style="margin-top: 15px;">
              <div class="card-header">История заказов</div>
              ${orders.orders && orders.orders.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse;">
                  <thead style="background: #f5f5f5;">
                    <tr>
                      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">ID</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">Статус</th>
                      <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">Сумма</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orders.orders.map(order => `
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                          ${this.truncate(order.public_id, 10)}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                          <span class="badge badge-${this.getStatusBadgeClass(order.status)}">
                            ${dashboardManager.formatStatus(order.status)}
                          </span>
                        </td>
                        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                          ${dashboardManager.formatPrice(order.total_amount)}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                          ${dashboardManager.formatDate(order.created_at)}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div style="padding: 15px; text-align: center; color: #999;">
                  Нет заказов
                </div>
              `}
            </div>

            <div class="card" style="margin-top: 15px;">
              <div class="card-header">Статистика</div>
              <div style="padding: 15px;">
                <p><strong>Всего заказов:</strong> ${orders.stats?.total_orders || 0}</p>
                <p><strong>Общая сумма:</strong> ${dashboardManager.formatPrice(orders.stats?.total_amount || 0)}</p>
                <p><strong>Средний заказ:</strong> ${dashboardManager.formatPrice(orders.stats?.average_order || 0)}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-close-btn">Закрыть</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
      });

      document.getElementById('modal-close-btn').addEventListener('click', () => {
        modal.remove();
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    } catch (error) {
      console.error('Failed to load client:', error);
      dashboardManager.showToast('Ошибка загрузки профиля', 'error');
    }
  }

  async blockClient(clientId) {
    const reason = prompt('Введите причину блокировки:');
    if (reason === null) return;

    try {
      await apiClient.blockClient(clientId, reason);
      dashboardManager.showToast('Клиент заблокирован', 'success');
      this.loadClients();
    } catch (error) {
      console.error('Failed to block client:', error);
      dashboardManager.showToast('Ошибка блокировки', 'error');
    }
  }

  async unblockClient(clientId) {
    if (!confirm('Вы уверены?')) return;

    try {
      await apiClient.unblockClient(clientId);
      dashboardManager.showToast('Клиент разблокирован', 'success');
      this.loadClients();
    } catch (error) {
      console.error('Failed to unblock client:', error);
      dashboardManager.showToast('Ошибка разблокировки', 'error');
    }
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
  window.clientsManager = new ClientsManager();
});
