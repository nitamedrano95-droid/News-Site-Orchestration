FROM node:20-alpine
WORKDIR /app

ARG CMS_NAME=cms-originaux
ENV CMS_NAME=${CMS_NAME}

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install Node dependencies
COPY adapter-package.json package.json
RUN npm install --production

# The actual CMS source is bind-mounted via docker-compose volumes
# These dirs will be populated at runtime from the mounted volumes
RUN mkdir -p src migrations data

EXPOSE 3000
CMD ["node", "adapter.js"]
