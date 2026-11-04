
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build || npx tsc

FROM nginx:alpine

COPY . /usr/share/nginx/html/

COPY --from=build /app/Js /usr/share/nginx/html/Js

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
