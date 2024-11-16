# TON Wallet Tracker

Мониторинг баланса кошельков в телеграм боте

---

## Функционал

- **Мониторинг балансов TON-кошельков:**
  - Периодическая проверка баланса через [Toncenter API](https://toncenter.com/).
  - Уведомления в Telegram о любых изменениях баланса.

- **Telegram-уведомления:**
  - Содержат адрес кошелька, изменение баланса и новый баланс.

- **Управление через Telegram:**
  - Добавление кошельков для отслеживания (`/add <адрес>`).
  - Удаление кошельков (`/remove <адрес>`).

- **Обработка ошибок:**
  - Повторные попытки при ошибках связи с Toncenter API.

---

## Установка и запуск

### 1. Клонирование репозитория
```bash
git clone git@github.com:yourusername/ton-wallet-tracker.git
cd ton-wallet-tracker
```
### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка .env
Создайте файл .env в корне проекта и добавьте:
```bash
TELEGRAM_BOT_TOKEN=BOT_TOKEN
TELEGRAM_CHAT_ID=CHAT_ID
TONCENTER_API_KEY=API_KEY
TONCENTER_API_ENDPOINT=https://toncenter.com/api/v2/jsonRPC
CHECK_INTERVAL=15
```

### 4. Запуск
```bash
node index.js
```
