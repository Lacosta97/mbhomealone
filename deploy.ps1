# ===== MBHA Auto Deploy Script =====

Write-Host "🚀 MBHA: Deploy started..." -ForegroundColor Cyan

# Проверка наличия git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git не найден. Установи Git и попробуй снова." -ForegroundColor Red
    exit
}

# Проверяем есть ли изменения
$changes = git status --porcelain

if (-not $changes) {
    Write-Host "ℹ️ Нет изменений — пушить нечего." -ForegroundColor Yellow
    exit
}

# Просим комментарий
$message = Read-Host "Комментарий к коммиту"

if (-not $message) { $message = "update" }

# Добавляем файлы
git add .

# Создаём коммит
git commit -m "$message"

# Отправляем
git push

Write-Host "✅ Готово! Изменения отправлены." -ForegroundColor Green
Write-Host "🌐 Сайт обновится через 5–20 секунд."
