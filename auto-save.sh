#!/bin/bash

# Автосохранение проекта Bazar Buy
# Выполняется каждые 10 минут через cron

PROJECT_DIR="/Users/bazarbuy/Desktop/fabric-store"
LOG_FILE="$PROJECT_DIR/auto-save.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Функция логирования
log() {
    echo "[$DATE] $1" >> "$LOG_FILE"
}

# Переход в папку проекта
cd "$PROJECT_DIR" || {
    log "ERROR: Не удалось перейти в $PROJECT_DIR"
    exit 1
}

# Проверка статуса git
if ! git status &>/dev/null; then
    log "ERROR: Не git репозиторий"
    exit 1
fi

# Проверка на изменения
if git diff --quiet && git diff --cached --quiet; then
    log "INFO: Нет изменений для сохранения"
    exit 0
fi

# Получение списка изменённых файлов для коммита
CHANGED_FILES=$(git status --porcelain | wc -l | xargs)
MODIFIED_FILES=$(git status --porcelain | head -5)

# Добавление всех изменений
git add . >> "$LOG_FILE" 2>&1

# Создание коммита с информативным сообщением
COMMIT_MSG="🤖 Auto-save: $CHANGED_FILES files at $(date '+%H:%M')

Modified files:
$MODIFIED_FILES"

git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "SUCCESS: Коммит создан ($CHANGED_FILES файлов)"
    
    # Попытка пуша (если есть интернет)
    if git push origin main >> "$LOG_FILE" 2>&1; then
        log "SUCCESS: Изменения запушены на GitHub"
    else
        log "WARNING: Не удалось запушить (нет интернета?)"
    fi
else
    log "ERROR: Ошибка при создании коммита"
    exit 1
fi

# Очистка старых логов (оставляем только последние 100 строк)
tail -n 100 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"

log "INFO: Автосохранение завершено успешно"