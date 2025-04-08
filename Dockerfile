FROM node:16-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install Python 3.8+ and other dependencies
RUN apt-get update && \
    apt-get install -y curl ffmpeg python3-pip && \
    pip3 install --upgrade pip && \
    pip3 install --no-cache-dir yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Python version and yt-dlp installation
RUN python3 --version && \
    yt-dlp --version

# Copy app source
COPY . .

# Create tmp directory with appropriate permissions
RUN mkdir -p /app/tmp/videos && \
    chmod -R 777 /app/tmp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Command to run the application
CMD ["node", "server.js"]
