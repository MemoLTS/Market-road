
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend-react/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend-react/ ./
ARG VITE_API_URL=/api/v1
ARG VITE_USAR_MOCK=false
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_USAR_MOCK=${VITE_USAR_MOCK}
RUN npm run build

FROM nginx:alpine
COPY frontend-react/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

