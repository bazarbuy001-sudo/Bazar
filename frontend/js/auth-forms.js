/**
 * AUTH FORMS COMPONENT
 * UI компонент для форм входа и регистрации
 */

const AuthForms = (function() {
  'use strict';

  let currentContainer = null;

  // ============================================
  // HTML TEMPLATES
  // ============================================

  function getLoginFormHTML() {
    return `
      <div class="auth-form-container">
        <div class="auth-form-header">
          <h2>Вход в личный кабинет</h2>
          <p>Войдите в свой аккаунт для управления заказами</p>
        </div>
        
        <form class="auth-form" id="loginForm">
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" name="email" required 
                   placeholder="example@company.com">
          </div>
          
          <div class="form-group">
            <label for="loginPassword">Пароль</label>
            <input type="password" id="loginPassword" name="password" required 
                   placeholder="Введите пароль">
          </div>
          
          <button type="submit" class="auth-btn auth-btn--primary" id="loginSubmit">
            <span class="btn-text">Войти</span>
            <span class="btn-loader" style="display: none;">⏳</span>
          </button>
          
          <div class="auth-form-footer">
            <p>Нет аккаунта? <a href="#" id="showRegisterForm">Зарегистрироваться</a></p>
          </div>
        </form>
        
        <div class="auth-error" id="loginError" style="display: none;"></div>
      </div>
    `;
  }

  function getRegisterFormHTML() {
    return `
      <div class="auth-form-container">
        <div class="auth-form-header">
          <h2>Регистрация</h2>
          <p>Создайте аккаунт для работы с нашим каталогом</p>
        </div>
        
        <form class="auth-form" id="registerForm">
          <div class="form-group">
            <label for="registerName">Имя / Название компании *</label>
            <input type="text" id="registerName" name="name" required 
                   placeholder="ООО Текстильная компания">
          </div>
          
          <div class="form-group">
            <label for="registerEmail">Email *</label>
            <input type="email" id="registerEmail" name="email" required 
                   placeholder="director@company.com">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="registerPassword">Пароль *</label>
              <input type="password" id="registerPassword" name="password" required 
                     placeholder="Минимум 8 символов">
            </div>
            
            <div class="form-group">
              <label for="registerPasswordConfirm">Подтвердите пароль *</label>
              <input type="password" id="registerPasswordConfirm" name="passwordConfirm" required 
                     placeholder="Повторите пароль">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="registerPhone">Телефон</label>
              <input type="tel" id="registerPhone" name="phone" 
                     placeholder="+7 999 123-45-67">
            </div>
            
            <div class="form-group">
              <label for="registerCity">Город</label>
              <input type="text" id="registerCity" name="city" 
                     placeholder="Москва">
            </div>
          </div>
          
          <div class="form-group">
            <label for="registerInn">ИНН</label>
            <input type="text" id="registerInn" name="inn" 
                   placeholder="1234567890" maxlength="12">
          </div>
          
          <button type="submit" class="auth-btn auth-btn--primary" id="registerSubmit">
            <span class="btn-text">Зарегистрироваться</span>
            <span class="btn-loader" style="display: none;">⏳</span>
          </button>
          
          <div class="auth-form-footer">
            <p>Уже есть аккаунт? <a href="#" id="showLoginForm">Войти</a></p>
          </div>
        </form>
        
        <div class="auth-error" id="registerError" style="display: none;"></div>
      </div>
    `;
  }

  function getAuthFormsCSS() {
    return `
      <style>
        .auth-form-container {
          max-width: 500px;
          margin: 40px auto;
          padding: 40px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .auth-form-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .auth-form-header h2 {
          color: #1a1a2e;
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .auth-form-header p {
          color: #6c757d;
          font-size: 16px;
          margin: 0;
        }
        
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-group label {
          color: #1a1a2e;
          font-weight: 500;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .form-group input {
          padding: 12px 16px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #C8A882;
          box-shadow: 0 0 0 3px rgba(200, 168, 130, 0.1);
        }
        
        .form-group input::placeholder {
          color: #adb5bd;
        }
        
        .auth-btn {
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .auth-btn--primary {
          background: #C8A882;
          color: white;
        }
        
        .auth-btn--primary:hover:not(:disabled) {
          background: #b8966f;
          transform: translateY(-1px);
        }
        
        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .auth-form-footer {
          text-align: center;
          margin-top: 24px;
        }
        
        .auth-form-footer p {
          color: #6c757d;
          margin: 0;
        }
        
        .auth-form-footer a {
          color: #C8A882;
          text-decoration: none;
          font-weight: 500;
        }
        
        .auth-form-footer a:hover {
          text-decoration: underline;
        }
        
        .auth-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          padding: 12px 16px;
          margin-top: 16px;
          font-size: 14px;
        }
        
        @media (max-width: 600px) {
          .auth-form-container {
            margin: 20px;
            padding: 24px;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .auth-form-header h2 {
            font-size: 24px;
          }
        }
      </style>
    `;
  }

  // ============================================
  // FORM HANDLERS
  // ============================================

  function showError(formType, message) {
    const errorEl = document.getElementById(`${formType}Error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  function hideError(formType) {
    const errorEl = document.getElementById(`${formType}Error`);
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function setFormLoading(formType, loading) {
    const form = document.getElementById(`${formType}Form`);
    const submitBtn = document.getElementById(`${formType}Submit`);
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    if (loading) {
      form.style.opacity = '0.7';
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline';
    } else {
      form.style.opacity = '1';
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
    }
  }

  async function handleLogin(formData) {
    const email = formData.get('email');
    const password = formData.get('password');

    hideError('login');
    setFormLoading('login', true);

    try {
      const result = await Auth.login({ email, password });

      if (result.success) {
        console.log('[AuthForms] Успешный вход');
        // Форма будет скрыта автоматически через событие auth:login
      } else {
        showError('login', result.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('[AuthForms] Ошибка входа:', error);
      showError('login', 'Произошла ошибка. Попробуйте еще раз.');
    } finally {
      setFormLoading('login', false);
    }
  }

  async function handleRegister(formData) {
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const passwordConfirm = formData.get('passwordConfirm');
    const phone = formData.get('phone');
    const city = formData.get('city');
    const inn = formData.get('inn');

    hideError('register');

    // Валидация
    if (password !== passwordConfirm) {
      showError('register', 'Пароли не совпадают');
      return;
    }

    if (!Auth.isValidEmail(email)) {
      showError('register', 'Некорректный email');
      return;
    }

    const passwordValidation = Auth.validatePassword(password);
    if (!passwordValidation.valid) {
      showError('register', 'Пароль: ' + passwordValidation.errors.join(', '));
      return;
    }

    setFormLoading('register', true);

    try {
      const result = await Auth.register({
        name,
        email,
        password,
        phone,
        city,
        inn
      });

      if (result.success) {
        console.log('[AuthForms] Успешная регистрация');
        // Форма будет скрыта автоматически через событие auth:login
      } else {
        showError('register', result.error || 'Ошибка регистрации');
      }
    } catch (error) {
      console.error('[AuthForms] Ошибка регистрации:', error);
      showError('register', 'Произошла ошибка. Попробуйте еще раз.');
    } finally {
      setFormLoading('register', false);
    }
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Показать форму входа
   * @param {HTMLElement} container - Контейнер для рендера
   */
  function showLoginForm(container) {
    if (!container) return;
    
    currentContainer = container;
    container.innerHTML = getAuthFormsCSS() + getLoginFormHTML();

    // Привязываем обработчики
    const loginForm = document.getElementById('loginForm');
    const showRegisterLink = document.getElementById('showRegisterForm');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await handleLogin(formData);
      });
    }

    if (showRegisterLink) {
      showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm(container);
      });
    }
  }

  /**
   * Показать форму регистрации
   * @param {HTMLElement} container - Контейнер для рендера
   */
  function showRegisterForm(container) {
    if (!container) return;
    
    currentContainer = container;
    container.innerHTML = getAuthFormsCSS() + getRegisterFormHTML();

    // Привязываем обработчики
    const registerForm = document.getElementById('registerForm');
    const showLoginLink = document.getElementById('showLoginForm');

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await handleRegister(formData);
      });
    }

    if (showLoginLink) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm(container);
      });
    }
  }

  /**
   * Скрыть формы авторизации
   */
  function hideForms() {
    if (currentContainer) {
      currentContainer.innerHTML = '';
      currentContainer = null;
    }
  }

  // ============================================
  // EVENTS
  // ============================================

  // Слушаем события авторизации
  window.addEventListener('auth:login', () => {
    hideForms();
  });

  window.addEventListener('auth:logout', () => {
    // Не показываем формы автоматически, это должен делать кабинет
  });

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    showLoginForm,
    showRegisterForm,
    hideForms
  };

})();

// Export
if (typeof window !== 'undefined') {
  window.AuthForms = AuthForms;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthForms;
}