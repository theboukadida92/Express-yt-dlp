const express = require('express');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Initialize Express app
const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON bodies
app.use(express.json());

// Create temp directory if it doesn't exist
const tempDir = path.join(os.tmpdir(), 'yt-dlp-videos');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Retrieve Instagram credentials from environment variables
const instagramUsername = process.env.INSTAGRAM_USERNAME;
const instagramPassword = process.env.INSTAGRAM_PASSWORD;

// Basic route for testing
app.get('/', (req, res) => {
  res.send('yt-dlp API is running');
});

// Download endpoint
app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    console.log(`Processing URL: ${url}`);

    // Create a unique filename in the system temp directory
    const outputFile = path.join(tempDir, `video-${Date.now()}.mp4`);
    console.log(`Output file: ${outputFile}`);

    // Check if yt-dlp is available
    try {
      const version = execSync('yt-dlp --version').toString().trim();
      console.log(`yt-dlp version: ${version}`);
    } catch (error) {
      console.error('yt-dlp not found:', error);
      return res.status(500).json({ success: false, error: 'yt-dlp not installed properly' });
    }

    // For Instagram specifically
    if (url.includes('instagram.com')) {
      console.log('Instagram URL detected, using instaloader as fallback');
      try {
        // Try to install instaloader if not already installed
        execSync('pip3 install instaloader');

        // Extract the shortcode from the URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const shortcode = pathParts[1]; // Assuming URL format like /reel/SHORTCODE/

        if (!shortcode) {
          return res.status(400).json({ success: false, error: 'Could not extract Instagram shortcode' });
        }

        console.log(`Extracted shortcode: ${shortcode}`);

        // Use instaloader to download the post
        const instaCmd = `instaloader --login=${instagramUsername} --password=${instagramPassword} --filename-pattern=${outputFile} -- -${shortcode}`;
        execSync(instaCmd);

        // Check if file exists
        if (fs.existsSync(outputFile)) {
          return res.sendFile(outputFile, (err) => {
            if (err) {
              console.error('Error sending file:', err);
            }
            // Delete file after sending
            fs.unlink(outputFile, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
          });
        }
      } catch (error) {
        console.error('Instaloader error:', error);
        // Fall back to yt-dlp if instaloader fails
      }
    }

    // Try yt-dlp with debug info
    console.log('Attempting download with yt-dlp...');

    // Output debug info to see what's happening
    const debugOptions = [
      '--verbose',
      '--dump-json',
      url
    ];

    try {
      const debugInfo = execSync(`yt-dlp ${debugOptions.join(' ')}`).toString();
      console.log('Debug info:', debugInfo);
    } catch (error) {
      console.error('yt-dlp debug error:', error.message);
    }

    // Try with more options for Instagram
    const ytDlpOptions = [
      '--verbose',
      '--no-warnings',
      '--ignore-errors',
      '--no-check-certificate',
      '--prefer-insecure',
      '--format', 'best',
      '--force-overwrites',
      '--no-call-home',
      '--geo-bypass',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
      '--referer', 'https://www.instagram.com/',
      '--cookies-from-browser', 'chrome',
      '-o', outputFile
    ];

    // Execute yt-dlp
    const ytDlpProcess = spawn('yt-dlp', [...ytDlpOptions, url]);

    let stderr = '';
    ytDlpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`yt-dlp stderr: ${data}`);
    });

    let stdout = '';
    ytDlpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`yt-dlp stdout: ${data}`);
    });

    ytDlpProcess.on('close', (code) => {
      console.log(`yt-dlp process exited with code ${code}`);
      console.log(`Checking if file exists at ${outputFile}`);

      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: `Process exited with code ${code}`,
          stderr,
          stdout
        });
      }

      // Check if file exists
      if (!fs.existsSync(outputFile)) {
        console.error('File not found after download');
        return res.status(500).json({
          success: false,
          error: 'File was not downloaded properly',
          stderr,
          stdout
        });
      }

      console.log(`File exists, size: ${fs.statSync(outputFile).size} bytes`);

      // Send file
      res.sendFile(outputFile, (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Delete file after sending
        fs.unlink(outputFile, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Temporary directory: ${tempDir}`);
});
