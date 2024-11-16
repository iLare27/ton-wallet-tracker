require('dotenv').config();
const { TonClient } = require('@ton/ton');
const { Telegraf } = require('telegraf');
const fs = require('fs');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const TONCENTER_API_ENDPOINT = process.env.TONCENTER_API_ENDPOINT;
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '15') * 60 * 1000;

const TRACKED_WALLETS_FILE = 'wallets.json';
const LOG_FILE = 'tracker.log';

const client = new TonClient({ endpoint: TONCENTER_API_ENDPOINT, apiKey: TONCENTER_API_KEY });
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

let wallets = {};

if (fs.existsSync(TRACKED_WALLETS_FILE)) {
    try {
        wallets = JSON.parse(fs.readFileSync(TRACKED_WALLETS_FILE, 'utf8'));
        console.log('Loaded wallets:', wallets);
    } catch (error) {
        console.error('Ошибка при загрузке wallets.json:', error.message);
        wallets = {};
    }
}

const log = (message) => {
    const logEntry = `[${new Date().toISOString()}] ${message}`;
    fs.appendFileSync(LOG_FILE, logEntry + '\n');
    console.log(logEntry);
};

const retry = async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            log(`Retrying... Attempt ${attempt} failed: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
};

const checkBalances = async () => {
    for (const [address, prevBalance] of Object.entries(wallets)) {
        try {
            const response = await retry(() => client.getBalance(address), 3, 2000);

            console.log(`Raw balance for ${address}:`, response);

            if (typeof response !== 'bigint') {
                log(`Error: Unexpected balance type for address ${address}. Received: ${typeof response}`);
                continue;
            }

            const balance = Number(response) / 1e9;

            if (isNaN(balance)) {
                log(`Error: Balance for address ${address} is NaN. Raw response: ${response}`);
                continue;
            }

            if (balance !== prevBalance) {
                const change = balance - prevBalance;
                wallets[address] = balance;

                const message = `🟢 Обновление баланса TON кошелька!\n\nАдрес: ${address}\nИзменение: ${change > 0 ? '+' : ''}${change.toFixed(6)} TON\nНовый баланс: ${balance.toFixed(6)} TON`;
                bot.telegram.sendMessage(CHAT_ID, message);
                log(`Notification sent for ${address}: ${message}`);
            }
        } catch (error) {
            log(`Error checking wallet ${address}: ${error.message}`);
        }
    }

    try {
        fs.writeFileSync(TRACKED_WALLETS_FILE, JSON.stringify(wallets, null, 2));
    } catch (error) {
        log(`Error saving wallets to file: ${error.message}`);
    }
};

setInterval(checkBalances, CHECK_INTERVAL);

bot.command('add', (ctx) => {
    const address = ctx.message.text.split(' ')[1]?.trim();
    if (address && !wallets[address]) {
        wallets[address] = 0;
        try {
            fs.writeFileSync(TRACKED_WALLETS_FILE, JSON.stringify(wallets, null, 2));
            ctx.reply(`Кошелек ${address} добавлен для отслеживания.`);
            log(`Added wallet ${address}`);
        } catch (error) {
            ctx.reply(`Ошибка при добавлении кошелька ${address}.`);
            log(`Failed to add wallet ${address}: ${error.message}`);
        }
    } else {
        ctx.reply(`Кошелек ${address} уже добавлен или некорректный.`);
    }
});

bot.command('remove', (ctx) => {
    const address = ctx.message.text.split(' ')[1]?.trim();
    console.log('Attempting to remove address:', address);
    console.log('Current wallets:', wallets);

    if (address && Object.keys(wallets).includes(address)) {
        delete wallets[address];
        try {
            fs.writeFileSync(TRACKED_WALLETS_FILE, JSON.stringify(wallets, null, 2));
            ctx.reply(`Кошелек ${address} успешно удален из отслеживания.`);
            log(`Removed wallet ${address}`);
        } catch (error) {
            ctx.reply(`Ошибка при удалении кошелька ${address}.`);
            log(`Failed to remove wallet ${address}: ${error.message}`);
        }
    } else {
        ctx.reply(`Кошелек ${address} не найден в списке отслеживания.`);
        log(`Attempted to remove non-existent wallet: ${address}`);
    }

    console.log('Current wallets after removal:', wallets);
});


bot.launch();
log('Bot started.');