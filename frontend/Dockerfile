# Dockerfile

# Stage 1: Build the Application (AS build)
FROM node:22-alpine AS build

# default in case not provided
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json ./
RUN npm ci 
COPY . .
RUN npm run build

FROM nginx:1.31.8-alpine AS prod

# Nginx config
RUN rm /etc/nginx/nginx.conf
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/

# 2. Grant Non-Root User Permissions (CRITICAL for security & stability)
RUN mkdir -p /var/run/nginx \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/run/nginx

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

USER nginx

CMD ["nginx", "-g", "daemon off;"]