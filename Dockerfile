# Use Node.js base image
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm config set legacy-peer-deps true
RUN npm install
COPY .env .env
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
