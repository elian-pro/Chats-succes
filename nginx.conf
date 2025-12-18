server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Habilitar CORS para los webhooks de n8n
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type' always;

    # Cache para archivos estáticos
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg)$ {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # HTML sin cache
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Compresión gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
}
