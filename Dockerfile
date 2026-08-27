FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/main.js"]
