#!/usr/bin/env bash
set -e

sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo mkdir -p /var/www/aezamine
sudo mkdir -p /var/www/html

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp -r "$SCRIPT_DIR/backend" /var/www/aezamine/
sudo cp -r "$SCRIPT_DIR/frontend" /var/www/aezamine/
sudo cp -r "$SCRIPT_DIR/site" /var/www/aezamine/
sudo cp -r "$SCRIPT_DIR/nginx" /var/www/aezamine/

sudo chown -R $USER:$USER /var/www/aezamine

cd /var/www/aezamine/backend
npm install
npm run build
npm test

cd /var/www/aezamine/frontend
npm run build

sudo cp -r /var/www/aezamine/site/* /var/www/html/

sudo tee /etc/systemd/system/aezamine-web.service > /dev/null <<EOF
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
EOF

sudo systemctl daemon-reload
sudo systemctl enable aezamine-web
sudo systemctl restart aezamine-web

sudo cp /var/www/aezamine/nginx/aezamine.conf /etc/nginx/sites-available/aezamine.com
sudo ln -sf /etc/nginx/sites-available/aezamine.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo certbot --nginx -d aezamine.com -d my.aezamine.com --non-interactive --agree-tos -m admin@aezamine.com || true

sudo nginx -t
sudo systemctl reload nginx

echo "SUCCESS: AézaMine deployed and running."
