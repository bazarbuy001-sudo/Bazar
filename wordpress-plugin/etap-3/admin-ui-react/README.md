# React Admin UI для админ-чата

**Минимальный, production-ready скелет** для админ-чата на React

---

## 📋 СТРУКТУРА

```
admin-ui-react/
├── src/
│   ├── App.jsx                  # Главный компонент
│   ├── api.js                   # API клиент
│   └── components/
│       ├── ThreadList.jsx       # Список диалогов
│       ├── ChatWindow.jsx       # Окно чата
│       └── Message.jsx          # Компонент сообщения
├── package.json
└── README.md
```

---

## 🚀 УСТАНОВКА

### 1. Создать React приложение:

```bash
npx create-react-app admin-ui-react
cd admin-ui-react
```

### 2. Установить зависимости:

```bash
npm install
```

### 3. Скопировать файлы:

- `src/App.jsx`
- `src/api.js`
- `src/components/ThreadList.jsx`
- `src/components/ChatWindow.jsx`
- `src/components/Message.jsx`

### 4. Собрать production bundle:

```bash
npm run build
```

### 5. Интегрировать в WordPress:

```php
// В функции админ-страницы
function bazarbuy_chat_admin_page() {
    ?>
    <div id="bazarbuy-chat-react-root"></div>
    <script src="<?php echo plugin_dir_url(__FILE__) . 'admin-ui-react/build/static/js/main.js'; ?>"></script>
    <?php
}
```

---

## 📦 package.json

```json
{
  "name": "bazarbuy-admin-chat",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

---

## ✅ ОСОБЕННОСТИ

- ✅ **Polling** каждые 3 секунды
- ✅ **Поиск** по диалогам
- ✅ **Сортировка** (непрочитанные первыми)
- ✅ **Автопрокрутка** к новым сообщениям
- ✅ **Обработка ошибок**
- ✅ **Индикаторы загрузки**
- ✅ **Статусы сообщений**

---

## 🔄 МИГРАЦИЯ С VANILLA JS

Если нужно заменить существующий `admin-chat.js`:

1. Собрать React bundle
2. Заменить подключение скрипта в `bazarbuy-cabinet.php`
3. Обновить контейнер: `<div id="bazarbuy-chat-react-root"></div>`

---

## 📝 ИТОГ

**Готовый React компонент** для админ-чата, который можно использовать вместо vanilla JS или параллельно.


