FROM nginxinc/nginx-unprivileged:alpine

# Actualizar paquetes de seguridad
USER root
RUN apk update && apk upgrade --no-cache
USER 101

# Copiar archivos estáticos
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./css /usr/share/nginx/html/css
COPY ./js /usr/share/nginx/html/js
COPY ./Assets /usr/share/nginx/html/Assets

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]