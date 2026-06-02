FROM node:20-alpine
WORKDIR /app
COPY wizard/package*.json ./
RUN npm install --production
COPY wizard/ .
EXPOSE 8080
CMD ["node", "server.js"]
