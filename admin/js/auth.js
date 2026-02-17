/**
 * Authentication Module for Admin Panel
 * Handles login, logout, session management, and JWT tokens
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('admin_token');
    this.refreshTokenInterval = null;
  }

  isAuthenticated() {
    return !!this.token;
  }

  async login(email, password) {
    try {
      const response = await apiClient.login(email, password);
      
      if (response.token) {
        this.token = response.token;
        this.currentUser = response.user;
        apiClient.setToken(this.token);
        localStorage.setItem('admin_user', JSON.stringify(response.user));
        
        this.startRefreshTimer();
        return { success: true, user: response.user };
      }
      
      return { success: false, error: response.message || 'Login failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      this.currentUser = null;
      apiClient.clearToken();
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      
      if (this.refreshTokenInterval) {
        clearInterval(this.refreshTokenInterval);
      }
      
      window.location.href = '/admin/index.html';
    }
  }

  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    const stored = localStorage.getItem('admin_user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }
    
    return null;
  }

  startRefreshTimer() {
    // Refresh token every 55 minutes (assuming 1 hour expiration)
    this.refreshTokenInterval = setInterval(() => {
      this.refreshToken();
    }, 55 * 60 * 1000);
  }

  async refreshToken() {
    try {
      // This endpoint should refresh the token
      const response = await apiClient.request('POST', '/refresh-token');
      if (response.token) {
        this.token = response.token;
        apiClient.setToken(this.token);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/admin/index.html';
      throw new Error('Not authenticated');
    }
  }

  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  }

  hasAnyRole(...roles) {
    const user = this.getCurrentUser();
    return user && roles.includes(user.role);
  }

  isSuperAdmin() {
    return this.hasRole('superadmin');
  }

  isAdmin() {
    return this.hasAnyRole('admin', 'superadmin');
  }

  isManager() {
    return this.hasAnyRole('manager', 'admin', 'superadmin');
  }
}

// Create global auth instance
const auth = new AuthManager();

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname;
  
  // If on login page, don't require auth
  if (currentPage.includes('index.html') || currentPage === '/admin/') {
    return;
  }
  
  // Otherwise, require authentication
  auth.requireAuth();
});
