FROM node:18-slim

# Install system dependencies required by Chromium
RUN apt-get update && apt-get install -y \
  libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 \
  libnss3 libxrandr2 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libgbm1 libgtk-3-0 libpango-1.0-0 libxss1 fonts-liberation \
  xdg-utils wget curl --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Install Node.js dependencies
RUN npm install

# Prevent Puppeteer from downloading Chromium again
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Expose port 3001
EXPOSE 3001

# Start app
CMD ["npm", "start"]
