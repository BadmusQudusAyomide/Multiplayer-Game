# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm i
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
