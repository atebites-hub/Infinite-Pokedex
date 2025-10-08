# Infinite Pokédex - Crawler Docker Container
FROM node:18-slim

# Install Chromium for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY source/server ./source/server
COPY source/backend ./source/backend

# Create data directories
RUN mkdir -p /app/data/cache /app/data/output

# Set environment variables
ENV NODE_ENV=production \
    LOG_LEVEL=info

# Expose port for health checks
EXPOSE 3000

# Run the crawler
CMD ["node", "source/server/index.js"]
