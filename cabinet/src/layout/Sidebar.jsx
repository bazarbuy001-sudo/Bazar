export default function Sidebar() {
    return (
      <aside style={{
        width: '220px',
        background: '#f5f5f5',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <nav>
          <div>📦 Мои заказы</div>
          <div>🧾 Документы</div>
          <div>👤 Профиль</div>
          <div>💬 Чат с менеджером</div>
        </nav>
      </aside>
    );
  }
  