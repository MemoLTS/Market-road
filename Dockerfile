# Etapa 1: Compilación de TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build || npx tsc

# Etapa 2: Servidor Web Nginx Estándar
FROM nginx:alpine

# Copiar todo el contenido estático del proyecto al directorio público de Nginx
COPY . /usr/share/nginx/html/

# Reemplazar la carpeta Js/ servida por las páginas con el JavaScript compilado
COPY --from=build /app/Js /usr/share/nginx/html/Js

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
