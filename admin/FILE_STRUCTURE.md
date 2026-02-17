# 📁 Admin Panel - File Structure & Purpose

## Overview

```
/admin/
├── 📄 index.html                    # Main entry point
├── 📋 README.md                     # Complete documentation
├── 🚀 QUICKSTART.md                 # 5-minute setup guide
├── 📋 BACKEND_API_CONTRACT.md       # API specification (23 endpoints)
├── 📋 HANDOFF_DOCUMENT.md           # Project handoff & summary
├── 📄 FILE_STRUCTURE.md             # This file
├── 📂 css/
│   └── 🎨 admin-styles.css          # All CSS styles & layouts
└── 📂 js/
    ├── 🔌 api-client.js             # HTTP client
    ├── 🔐 auth.js                   # Authentication & sessions
    ├── 📊 dashboard.js              # Dashboard & navigation
    ├── 📦 products-management.js    # Products CRUD
    ├── 📋 orders-management.js      # Orders management
    ├── 👥 clients-management.js     # Clients management
    └── 💬 messages-chat.js          # Messages & chat
```

---

## 📄 Main Files

### index.html (15 KB)
**Purpose:** Main application file containing:
- Login page HTML
- Dashboard layout & navigation
- All modal windows
- All view containers
- HTML form structures

**Contains:**
- Login form (email + password)
- Sidebar navigation (6 links)
- Header with user info
- 7 different views (hidden by default)
- 3 modal windows
- Toast notifications container

**Loads:** All CSS and JS files

**Entry Point:** Open this in browser

---

### 📋 Documentation Files

#### README.md (8 KB)
**For:** Everyone (complete reference)
**Contains:**
- Feature overview
- Full module descriptions
- API endpoints reference
- Configuration guide
- Deployment instructions
- FAQ & troubleshooting

**Read this first if you:**
- Want complete understanding
- Need to customize something
- Have general questions

---

#### QUICKSTART.md (5 KB)
**For:** Quick setup & testing
**Contains:**
- 5-step quick start
- Backend setup checklist
- Common issues & solutions
- Production checklist

**Read this if you:**
- Want to get running in 5 minutes
- Have setup issues
- Need debugging help

---

#### BACKEND_API_CONTRACT.md (11 KB)
**For:** Backend developers
**Contains:**
- All 23 endpoints specification
- Request/response examples
- Error handling rules
- HTTP headers format
- Developer notes

**Read this if you:**
- Are implementing backend
- Need exact API format
- Have questions about data structure

---

#### HANDOFF_DOCUMENT.md (10 KB)
**For:** Project managers & stakeholders
**Contains:**
- Project summary
- What was delivered
- Features implemented
- Implementation checklist
- Timeline estimates
- Pre-launch checklist

**Read this if you:**
- Need project status
- Want to understand deliverables
- Need to plan next steps

---

#### FILE_STRUCTURE.md (This file)
**For:** Understanding the codebase
**Contains:**
- File purposes
- Module descriptions
- Key components
- Dependencies between files

---

## 🎨 CSS File

### css/admin-styles.css (13 KB)

**Purpose:** All styling for admin panel (no external CSS frameworks)

**Contains:**
- CSS variables for colors/sizing
- Layout system (flexbox, grid)
- Component styles:
  - Buttons (primary, secondary, danger, etc)
  - Forms and inputs
  - Tables and lists
  - Cards and panels
  - Modals and dialogs
  - Badges and status indicators
  - Toast notifications
  - Responsive breakpoints

**Key Classes:**
- `.admin-container` - Main flex layout
- `.admin-sidebar` - Left navigation
- `.admin-header` - Top bar
- `.admin-content` - Main content area
- `.view` - Content view (hidden by default)
- `.btn` - Button styling
- `.modal` - Modal dialogs
- `.card` - Content cards
- `.table-container` - Table wrapper
- `.badge` - Status badges
- `.toast` - Notifications

**Responsive:**
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: <768px

---

## 🚀 JavaScript Modules

### js/api-client.js (5 KB)

**Purpose:** HTTP client for all API communication

**Key Features:**
- Centralized API calls
- Automatic error handling
- JWT token management
- Request/response logging
- Automatic 401 redirect

**Main Methods:**
```javascript
// Auth
apiClient.login(email, password)
apiClient.logout()

// Products
apiClient.getProducts(filters)
apiClient.getProductById(id)
apiClient.createProduct(data)
apiClient.updateProduct(id, data)
apiClient.deleteProduct(id)
apiClient.importProducts(format, file)

// Orders
apiClient.getOrders(filters)
apiClient.getOrderById(id)
apiClient.updateOrderStatus(id, status)

// Clients
apiClient.getClients(filters)
apiClient.getClientById(id)
apiClient.updateClient(id, data)
apiClient.blockClient(id, reason)
apiClient.unblockClient(id)
apiClient.getClientOrders(clientId)

// Dashboard
apiClient.getDashboard()

// Messages
apiClient.getChats(filters)
apiClient.getChatMessages(chatId)
apiClient.sendMessage(chatId, data)
```

**Configuration:**
- Edit `baseURL` on line ~1 to change API server

**Dependencies:** None (uses native Fetch API)

---

### js/auth.js (3 KB)

**Purpose:** Authentication and session management

**Key Features:**
- Login/logout
- Token management (localStorage)
- Auto-refresh tokens
- Role checking
- Protected routes

**Main Methods:**
```javascript
auth.login(email, password)           // Login user
auth.logout()                         // Logout & clear session
auth.isAuthenticated()                // Check if logged in
auth.getCurrentUser()                 // Get current user
auth.refreshToken()                   // Refresh JWT token
auth.hasRole(role)                    // Check role
auth.isSuperAdmin()                   // Check if superadmin
auth.isAdmin()                        // Check if admin
auth.requireAuth()                    // Redirect if not auth
```

**Token Management:**
- Tokens stored in localStorage under key `admin_token`
- Auto-refresh every 55 minutes
- Clear on logout

**User Data:**
- Stored in localStorage under key `admin_user`
- Contains: id, email, first_name, last_name, role

**Roles:**
- `superadmin` - Full access
- `admin` - Full access
- `manager` - Limited access

---

### js/dashboard.js (9 KB)

**Purpose:** Dashboard, navigation, and main app logic

**Key Features:**
- Login/logout handlers
- View switching
- Navigation management
- Dashboard data loading
- Metrics calculations
- Toast notifications

**Main Methods:**
```javascript
dashboardManager.showLoginPage()      // Show login form
dashboardManager.showDashboard()      // Show main dashboard
dashboardManager.switchView(name)     // Switch to view
dashboardManager.loadDashboardData()  // Load metrics
dashboardManager.loadRecentOrders()   // Load last 5 orders
dashboardManager.showToast(msg, type) // Show notification
```

**Utility Methods:**
- `formatPrice()` - Format numbers as currency
- `formatDate()` - Format dates
- `formatStatus()` - Translate status names
- `truncate()` - Shorten text

**Views Available:**
- `dashboard` - Main dashboard
- `products` - Products management
- `orders` - Orders management
- `clients` - Clients management
- `messages` - Messages & chat
- `settings` - Settings (future)

---

### js/products-management.js (9 KB)

**Purpose:** Products CRUD operations

**Key Features:**
- Load and display products table
- Search and filter products
- Add new product (modal)
- Edit existing product
- Delete product
- Import products (JSON/CSV)
- Category filtering

**Main Methods:**
```javascript
productsManager.loadProducts()        // Load all products
productsManager.renderProductsTable() // Render table
productsManager.filterProducts()      // Apply filters
productsManager.openProductModal()    // Open add/edit modal
productsManager.editProduct(id)       // Load product for editing
productsManager.saveProduct()         // Save changes
productsManager.deleteProduct(id)     // Delete product
productsManager.showImportDialog()    // Show import dialog
```

**Data Fields:**
- name, description, price, old_price
- category, colors (array)
- image_url, created_at, updated_at

**UI Components:**
- Search box with real-time filtering
- Category dropdown filter
- Products table with pagination
- Edit/delete action buttons
- Modal for add/edit form
- Import button

---

### js/orders-management.js (11 KB)

**Purpose:** Orders management and tracking

**Key Features:**
- Load and display orders table
- Search and filter orders
- View order details (modal)
- Change order status
- Print invoice (PDF in browser)
- Status tracking

**Main Methods:**
```javascript
ordersManager.loadOrders()             // Load all orders
ordersManager.renderOrdersTable()      // Render table
ordersManager.filterOrders()           // Apply filters
ordersManager.viewOrder(id)            // Open order details
ordersManager.changeStatus(id)         // Change status (prompt)
ordersManager.printInvoice()           // Print/download invoice
```

**Order Statuses:**
- `pending` - На обработку (yellow)
- `confirmed` - Подтверждены (blue)
- `processing` - На отправку (blue)
- `shipped` - Отправлены (blue)
- `delivered` - Доставлены (green)

**Data Fields:**
- public_id, client_name, status
- total_amount, currency
- shipping_address, notes
- items (array of products ordered)
- created_at, updated_at

**UI Components:**
- Search with order ID/client name
- Status filter dropdown
- Orders table with actions
- Order details modal
- Print invoice button

---

### js/clients-management.js (10 KB)

**Purpose:** Client management and profiling

**Key Features:**
- Load and display clients list
- Search clients
- View client profile (modal)
- View client order history
- View client statistics
- Block/unblock clients

**Main Methods:**
```javascript
clientsManager.loadClients()           // Load all clients
clientsManager.renderClientsTable()    // Render table
clientsManager.filterClients()         // Apply filters
clientsManager.viewClient(id)          // Open profile modal
clientsManager.blockClient(id)         // Block client (with reason)
clientsManager.unblockClient(id)       // Unblock client
```

**Client Data:**
- public_id, name (company name)
- email, phone, city
- inn (company tax number)
- is_active status

**Statistics:**
- Total orders
- Total amount spent
- Average order size

**UI Components:**
- Search box (company name, email, etc)
- Clients table
- Profile modal with:
  - Company info
  - Order history table
  - Statistics section
- Block/Unblock buttons

---

### js/messages-chat.js (5 KB)

**Purpose:** Chat between admin and clients

**Key Features:**
- Load active chats list
- View chat messages
- Send messages to clients
- Message timestamps
- Chat list with last message preview

**Main Methods:**
```javascript
messagesManager.loadChats()            // Load chat list
messagesManager.renderChatsList()      // Render chat items
messagesManager.selectChat(id)         // Select and open chat
messagesManager.renderMessages()       // Render message history
messagesManager.sendMessage()          // Send new message
```

**Message Fields:**
- message_id, chat_id
- sender_id, sender_type (admin/client)
- text, created_at

**UI Components:**
- Chat list (left sidebar)
- Messages area (main)
- Message input box
- Send button
- Auto-scroll to latest message

---

## 🔄 Dependencies Between Modules

```
index.html
    ├── css/admin-styles.css (loaded in <head>)
    │
    └── js/
        ├── api-client.js (first - defines global apiClient)
        ├── auth.js (depends on: apiClient)
        ├── dashboard.js (depends on: api-client, auth)
        │   └── uses other managers: products, orders, clients, messages
        ├── products-management.js (depends on: apiClient, dashboard)
        ├── orders-management.js (depends on: apiClient, dashboard)
        ├── clients-management.js (depends on: apiClient, dashboard)
        └── messages-chat.js (depends on: apiClient, dashboard)
```

**Load Order (important!):**
1. api-client.js - defines `apiClient` global
2. auth.js - defines `auth` global, uses apiClient
3. dashboard.js - defines `dashboardManager` global
4. Other modules - define their managers

---

## 🎯 How to Add New Features

### Example: Add a new admin page

1. **Create HTML container** in `index.html`:
```html
<div id="view-reports" class="view hidden">
  <!-- Your content -->
</div>
```

2. **Create JS module** `admin/js/reports.js`:
```javascript
class ReportsManager {
  constructor() { this.init(); }
  init() { /* setup */ }
  loadReports() { /* load data */ }
  // ... other methods
}
document.addEventListener('DOMContentLoaded', () => {
  window.reportsManager = new ReportsManager();
});
```

3. **Add navigation link** in `index.html` sidebar:
```html
<li><a href="#reports" class="nav-link">📊 Отчеты</a></li>
```

4. **Add to dashboard.js** loadViewData():
```javascript
case 'reports':
  reportsManager?.loadReports();
  break;
```

5. **Include script** in `index.html`:
```html
<script src="/admin/js/reports.js"></script>
```

Done! New page is ready.

---

## 📊 Code Statistics

| File | Lines | Size | Purpose |
|------|-------|------|---------|
| index.html | ~400 | 15 KB | Main HTML |
| admin-styles.css | ~700 | 13 KB | Styling |
| api-client.js | ~180 | 5 KB | HTTP client |
| auth.js | ~120 | 3 KB | Authentication |
| dashboard.js | ~250 | 9 KB | Main logic |
| products-management.js | ~250 | 9 KB | Products |
| orders-management.js | ~320 | 11 KB | Orders |
| clients-management.js | ~280 | 10 KB | Clients |
| messages-chat.js | ~150 | 5 KB | Messages |
| **TOTAL** | **~2,450** | **~80 KB** | |

---

## ✅ Quality Checklist

- ✅ No external dependencies
- ✅ All modules self-contained
- ✅ Clear separation of concerns
- ✅ Consistent naming conventions
- ✅ Comments on complex logic
- ✅ Error handling throughout
- ✅ Responsive design
- ✅ Accessible HTML
- ✅ Cross-browser compatible
- ✅ Performance optimized

---

## 🔧 Maintenance Notes

**If you need to:**
- Change colors → Edit `admin-styles.css` CSS variables
- Change API URL → Edit `api-client.js` line ~1
- Add translations → Edit all `.textContent` in JS files
- Extend features → Follow patterns in `dashboard.js`
- Debug issues → Check Console (F12) and Network tab

---

**Generated:** 2026-02-15  
**Status:** ✅ Complete & Ready  
**Questions:** See README.md
