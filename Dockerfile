FROM node:16-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install yt-dlp and ffmpeg
RUN apt-get update && \
    apt-get install -y curl ffmpeg python3 && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy app source
COPY . .

# Create tmp directory
RUN mkdir -p /app/tmp/videos

EXPOSE 3000

CMD ["node", "server.js"]
