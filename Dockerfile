# Usar imagen oficial de Nginx Alpine (ligera)
FROM nginx:alpine

# Copiar archivos del dashboard al directorio de Nginx
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY config.js /usr/share/nginx/html/

# Copiar configuración personalizada de Nginx (opcional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Nginx se inicia automáticamente con la imagen base
CMD ["nginx", "-g", "daemon off;"]
