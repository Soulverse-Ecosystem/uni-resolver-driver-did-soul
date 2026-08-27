# NOTE: this image cannot build while @soulverse/did-soul-core is a file: dependency,
# because ../did-soul-backend is outside the build context. Publish that package to a
# registry and change the dependency to a version range before building here. Everything
# else in this driver is ready.
FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/main.js"]
