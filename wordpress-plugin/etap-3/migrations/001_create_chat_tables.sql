-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Создание таблицы для чата
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Назначение: Хранение сообщений чата между клиентами и менеджерами
-- Версия: 1.0.0
-- Дата: 2026-01-XX
--
-- ⚠️ ВАЖНО:
-- - Замените `wp_` на ваш префикс таблиц WordPress перед выполнением
-- - Выполняйте миграцию только в продакшн режиме (когда BAZARBUY_CHAT_USE_DB = true)
-- - Создайте резервную копию БД перед выполнением
--
-- ═══════════════════════════════════════════════════════════════════════════

-- Таблица сообщений чата
CREATE TABLE IF NOT EXISTS `wp_bazarbuy_chat_messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID пользователя WordPress',
    `order_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID заказа (если сообщение связано с заказом)',
    `sender` ENUM('client', 'manager', 'system') NOT NULL DEFAULT 'client' COMMENT 'Отправитель сообщения',
    `message` TEXT NOT NULL COMMENT 'Текст сообщения',
    `status` ENUM('pending', 'sent', 'delivered', 'failed', 'read') NOT NULL DEFAULT 'pending' COMMENT 'Статус сообщения',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата создания',
    `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Дата обновления',
    
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_sender` (`sender`),
    INDEX `idx_status` (`status`),
    
    FOREIGN KEY (`user_id`) 
        REFERENCES `wp_users`(`ID`) 
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    FOREIGN KEY (`order_id`) 
        REFERENCES `wp_posts`(`ID`) 
        ON DELETE SET NULL
        ON UPDATE CASCADE
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Сообщения чата между клиентами и менеджерами';

-- ═══════════════════════════════════════════════════════════════════════════
-- ПРИМЕЧАНИЯ:
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. FOREIGN KEY на wp_users и wp_posts:
--    - Убедитесь, что таблицы wp_users и wp_posts существуют
--    - Если у вас кастомные post types для заказов, замените wp_posts на вашу таблицу
--    - Или удалите FOREIGN KEY, если он не нужен:
--
--      -- Удалить FOREIGN KEY для order_id:
--      ALTER TABLE `wp_bazarbuy_chat_messages` 
--      DROP FOREIGN KEY `wp_bazarbuy_chat_messages_ibfk_2`;
--
-- 2. Префикс таблиц:
--    - Замените `wp_` на ваш префикс (например, `wpabc_`)
--    - Проверьте в wp-config.php: $table_prefix
--
-- 3. Индексы:
--    - idx_user_id — для быстрого поиска по пользователю
--    - idx_order_id — для фильтрации по заказу
--    - idx_created_at — для сортировки по дате
--    - idx_sender — для фильтрации по отправителю
--    - idx_status — для фильтрации по статусу
--
-- 4. Миграция данных из mock хранилища:
--    - Если использовался mock режим (transients), создайте скрипт миграции
--    - Пример см. в ETAP_3_INSTALLATION_GUIDE.md
--
-- ═══════════════════════════════════════════════════════════════════════════


