-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Создание таблиц для диалогов и прочтений (расширенная модель)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Назначение: Расширенная модель для управления диалогами и отслеживания прочтений
-- Версия: 2.0.0
-- Дата: 2026-01-XX
--
-- ⚠️ ВАЖНО:
-- - Замените `wp_` на ваш префикс таблиц WordPress перед выполнением
-- - Выполняйте миграцию только после создания таблицы wp_bazarbuy_chat_messages
-- - Создайте резервную копию БД перед выполнением
--
-- ═══════════════════════════════════════════════════════════════════════════

-- Таблица диалогов (threads)
CREATE TABLE IF NOT EXISTS `wp_bazarbuy_chat_threads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID клиента (пользователя WordPress)',
    `manager_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID менеджера, назначенного на диалог',
    `order_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID заказа (если диалог связан с заказом)',
    `status` ENUM('open', 'closed', 'archived') NOT NULL DEFAULT 'open' COMMENT 'Статус диалога',
    `last_message_at` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего сообщения',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата создания диалога',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Дата обновления',
    
    PRIMARY KEY (`id`),
    INDEX `idx_client_id` (`client_id`),
    INDEX `idx_manager_id` (`manager_id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_last_message_at` (`last_message_at`),
    INDEX `idx_client_status` (`client_id`, `status`),
    
    CONSTRAINT `fk_thread_client`
        FOREIGN KEY (`client_id`) 
        REFERENCES `wp_users`(`ID`) 
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT `fk_thread_manager`
        FOREIGN KEY (`manager_id`) 
        REFERENCES `wp_users`(`ID`) 
        ON DELETE SET NULL
        ON UPDATE CASCADE
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Диалоги между клиентами и менеджерами';

-- Таблица прочтений сообщений
CREATE TABLE IF NOT EXISTS `wp_bazarbuy_chat_reads` (
    `message_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID сообщения',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID пользователя, который прочитал',
    `read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата прочтения',
    
    PRIMARY KEY (`message_id`, `user_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_message_id` (`message_id`),
    INDEX `idx_read_at` (`read_at`),
    
    CONSTRAINT `fk_read_message`
        FOREIGN KEY (`message_id`) 
        REFERENCES `wp_bazarbuy_chat_messages`(`id`) 
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT `fk_read_user`
        FOREIGN KEY (`user_id`) 
        REFERENCES `wp_users`(`ID`) 
        ON DELETE CASCADE
        ON UPDATE CASCADE
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Отметки прочтения сообщений пользователями';

-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ ДАННЫХ (опционально)
-- ═══════════════════════════════════════════════════════════════════════════

-- Создание диалогов из существующих сообщений (если таблица messages уже содержит данные)
INSERT INTO `wp_bazarbuy_chat_threads` (`client_id`, `order_id`, `status`, `last_message_at`, `created_at`)
SELECT DISTINCT
    `user_id` as `client_id`,
    `order_id`,
    'open' as `status`,
    MAX(`created_at`) as `last_message_at`,
    MIN(`created_at`) as `created_at`
FROM `wp_bazarbuy_chat_messages`
WHERE NOT EXISTS (
    SELECT 1 FROM `wp_bazarbuy_chat_threads` t 
    WHERE t.client_id = `wp_bazarbuy_chat_messages`.`user_id`
    AND (t.order_id = `wp_bazarbuy_chat_messages`.`order_id` OR (t.order_id IS NULL AND `wp_bazarbuy_chat_messages`.`order_id` IS NULL))
)
GROUP BY `user_id`, `order_id`;

-- ═══════════════════════════════════════════════════════════════════════════
-- ПРИМЕЧАНИЯ:
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. FOREIGN KEY:
--    - Убедитесь, что таблица wp_bazarbuy_chat_messages существует
--    - Убедитесь, что таблица wp_users существует
--    - При необходимости удалите FOREIGN KEY для order_id (если нет таблицы заказов)
--
-- 2. Префикс таблиц:
--    - Замените `wp_` на ваш префикс (например, `wpabc_`)
--    - Проверьте в wp-config.php: $table_prefix
--
-- 3. Индексы:
--    - idx_client_status — для быстрого поиска активных диалогов клиента
--    - idx_last_message_at — для сортировки по последнему сообщению
--
-- 4. Статусы диалогов:
--    - 'open' — активный диалог
--    - 'closed' — закрытый (завершённый) диалог
--    - 'archived' — архивный диалог
--
-- ═══════════════════════════════════════════════════════════════════════════


