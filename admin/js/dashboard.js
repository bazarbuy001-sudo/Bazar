/**
 * Dashboard Module
 * Handles dashboard initialization, navigation, and metrics
 */

class DashboardManager {
  constructor() {
    this.currentView = 'dashboard';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthAndRender();
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Logout buttons
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
    });

    document.getElementById('logout-btn-header')?.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
    });

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => this.handleNavigation(e));
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.remove('active');
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }

  checkAuthAndRender() {
    if (auth.isAuthenticated()) {
      this.showDashboard();
      this.loadDashboardData();
      this.setupUserInfo();
    } else {
      this.showLoginPage();
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const errorMessage = document.getElementById('error-message');

    try {
      errorDiv.classList.add('hidden');
      const result = await auth.login(email, password);

      if (result.success) {
        this.showDashboard();
        this.loadDashboardData();
        this.setupUserInfo();
        document.getElementById('login-form').reset();
      } else {
        errorMessage.textContent = result.error || 'Ошибка входа';
        errorDiv.classList.remove('hidden');
      }
    } catch (error) {
      errorMessage.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');
  }

  showDashboard() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
  }

  setupUserInfo() {
    const user = auth.getCurrentUser();
    if (user) {
      const avatar = document.getElementById('user-avatar');
      const nameEl = document.getElementById('user-name');
      const roleEl = document.getElementById('user-role');

      const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
      avatar.textContent = initials || 'A';
      nameEl.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin';
      roleEl.textContent = this.getRoleLabel(user.role);
    }
  }

  getRoleLabel(role) {
    const roles = {
      'superadmin': 'Суперадministrator',
      'admin': 'Администратор',
      'manager': 'Менеджер',
    };
    return roles[role] || role;
  }

  handleNavigation(e) {
    e.preventDefault();

    const href = e.currentTarget.getAttribute('href');
    if (!href) return;

    const viewName = href.substring(1);
    this.switchView(viewName);

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
  }

  switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.add('hidden');
    });

    // Show selected view
    const view = document.getElementById(`view-${viewName}`);
    if (view) {
      view.classList.remove('hidden');
      this.currentView = viewName;

      // Update page title
      const titles = {
        dashboard: '📊 Дашборд',
        products: '📦 Товары',
        orders: '📋 Заказы',
        clients: '👥 Клиенты',
        messages: '💬 Сообщения',
        settings: '⚙️ Настройки',
      };
      document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';

      // Load data for view
      this.loadViewData(viewName);
    }
  }

  loadViewData(viewName) {
    switch (viewName) {
      case 'dashboard':
        this.loadDashboardData();
        break;
      case 'products':
        productsManager?.loadProducts();
        break;
      case 'orders':
        ordersManager?.loadOrders();
        break;
      case 'clients':
        clientsManager?.loadClients();
        break;
      case 'messages':
        messagesManager?.loadChats();
        break;
    }
  }

  async loadDashboardData() {
    try {
      const data = await apiClient.getDashboard();

      // Update metrics
      document.getElementById('metric-total-orders').textContent = data.total_orders || 0;
      document.getElementById('metric-total-revenue').textContent = this.formatPrice(data.total_revenue || 0);
      document.getElementById('metric-new-clients').textContent = data.new_clients || 0;
      document.getElementById('metric-avg-order').textContent = this.formatPrice(data.average_order || 0);

      // Update status counts
      const statuses = {
        pending: data.order_status_pending || 0,
        confirmed: data.order_status_confirmed || 0,
        processing: data.order_status_processing || 0,
        shipped: data.order_status_shipped || 0,
        delivered: data.order_status_delivered || 0,
      };

      Object.entries(statuses).forEach(([key, value]) => {
        const el = document.getElementById(`status-${key}`);
        if (el) el.textContent = value;
      });

      // Load recent orders
      this.loadRecentOrders();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.showToast('Ошибка загрузки данных', 'error');
    }
  }

  async loadRecentOrders() {
    try {
      const data = await apiClient.getOrders({ limit: 5, sort: '-created_at' });
      const tbody = document.querySelector('#dashboard-recent-orders tbody');

      if (!data.orders || data.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Нет заказов</td></tr>';
        return;
      }

      tbody.innerHTML = data.orders.map(order => `
        <tr>
          <td>${this.truncate(order.public_id, 10)}</td>
          <td>${order.client_name || 'Unknown'}</td>
          <td><span class="badge badge-${this.getStatusBadgeClass(order.status)}">${this.formatStatus(order.status)}</span></td>
          <td>${this.formatPrice(order.total_amount)}</td>
          <td>${this.formatDate(order.created_at)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Failed to load recent orders:', error);
    }
  }

  // Utility methods
  formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price || 0);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  }

  formatStatus(status) {
    const statuses = {
      'pending': 'На обработку',
      'confirmed': 'Подтвержден',
      'processing': 'На отправку',
      'shipped': 'Отправлен',
      'delivered': 'Доставлен',
      'cancelled': 'Отменен',
    };
    return statuses[status] || status;
  }

  getStatusBadgeClass(status) {
    const classes = {
      'pending': 'warning',
      'confirmed': 'info',
      'processing': 'info',
      'shipped': 'primary',
      'delivered': 'success',
      'cancelled': 'danger',
    };
    return classes[status] || 'secondary';
  }

  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardManager = new DashboardManager();
});
