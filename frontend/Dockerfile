# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the application from a lightweight web server
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
