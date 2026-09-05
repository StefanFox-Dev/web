# Розгортання на Ubuntu 24.04 LTS (Systemd + Nginx)

## 1. Автоматичне встановлення скриптом

```bash
chmod +x /var/www/aezamine/INSTALL_UBUNTU.sh
sudo /var/www/aezamine/INSTALL_UBUNTU.sh
```

---

## 2. Ручне покрокове розгортання

### Крок 1: Оновлення пакетів та встановлення залежностей

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential
```

### Крок 2: Встановлення Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### Крок 3: Підготовка каталогів

```bash
sudo mkdir -p /var/www/aezamine
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/aezamine
```

### Крок 4: Збірка бекенду та фронтенду

```bash
cd /var/www/aezamine/backend
npm install
npm run build
npm test

cd /var/www/aezamine/frontend
npm run build

sudo cp -r /var/www/aezamine/site/* /var/www/html/
```

### Крок 5: Створення сервісу Systemd

Файл `/etc/systemd/system/aezamine-web.service`:

```ini
[Unit]
Description=AézaMine Web Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/aezamine/backend
ExecStart=/usr/bin/node dist/src/app.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=BEDROCK_HOST=aezamine.com
Environment=BEDROCK_PORT=19132
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Команди запуску сервісу:

```bash
sudo systemctl daemon-reload
sudo systemctl enable aezamine-web
sudo systemctl start aezamine-web
sudo systemctl status aezamine-web
```

### Крок 6: Налаштування Nginx та SSL сертифікатів

```bash
sudo cp /var/www/aezamine/nginx/aezamine.conf /etc/nginx/sites-available/aezamine.com
sudo ln -sf /etc/nginx/sites-available/aezamine.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo certbot --nginx -d aezamine.com -d my.aezamine.com
sudo nginx -t
sudo systemctl reload nginx
```
