FROM nikolaik/python-nodejs:python3.10-nodejs16-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install ffmpeg, yt-dlp, and instaloader with necessary dependencies for Instagram
RUN apt-get update && \
    apt-get install -y ffmpeg git && \
    pip3 install --no-cache-dir yt-dlp requests beautifulsoup4 instaloader && \
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
