#!/bin/bash
set -euo pipefail

echo "Updating nginx config for lencondb.ru..."

# Backup existing config
sudo cp /etc/nginx/sites-available/lencondb.ru /etc/nginx/sites-available/lencondb.ru.bak 2>/dev/null || true

# Check if SSL certs exist
if [ ! -f /etc/letsencrypt/live/lencondb.ru/fullchain.pem ]; then
  echo "SSL certificates not found. Setting up HTTP-only config and obtaining certs..."

  # Write temporary HTTP-only config for ACME challenge
  sudo tee /etc/nginx/sites-available/lencondb.ru > /dev/null << 'HTTPEOF'
server {
    listen 80;
    server_name lencondb.ru www.lencondb.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
HTTPEOF

  sudo ln -sf /etc/nginx/sites-available/lencondb.ru /etc/nginx/sites-enabled/lencondb.ru
  sudo nginx -t && sudo systemctl reload nginx

  # Obtain certificate
  sudo mkdir -p /var/www/certbot
  sudo certbot certonly --webroot -w /var/www/certbot \
    -d lencondb.ru -d www.lencondb.ru \
    --non-interactive --agree-tos --email admin@lencondb.ru

  echo "SSL certificates obtained."
fi

# Now write the full HTTPS config
sudo tee /etc/nginx/sites-available/lencondb.ru > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name lencondb.ru www.lencondb.ru;

    location / {
        return 301 https://$server_name$request_uri;
    }

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl http2;
    server_name lencondb.ru www.lencondb.ru;

    ssl_certificate /etc/letsencrypt/live/lencondb.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lencondb.ru/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        client_max_body_size 50M;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}
NGINXEOF

# Enable site if not already linked
if [ ! -L /etc/nginx/sites-enabled/lencondb.ru ]; then
  sudo ln -sf /etc/nginx/sites-available/lencondb.ru /etc/nginx/sites-enabled/lencondb.ru
fi

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
echo "Nginx updated and reloaded."
