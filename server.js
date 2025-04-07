const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable JSON body parsing and CORS
app.use(express.json());
app.use(cors());

// Create videos directory
const downloadDir = path.join('/tmp', 'videos');
fs.mkdirSync(downloadDir, { recursive: true });

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'YT-DLP API is running' });
});

app.post('/download', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  // Generate unique filename
  const timestamp = Date.now();
  const outputPath = path.join(downloadDir, `video_${timestamp}.mp4`);
  
  console.log(`Starting download from: ${url}`);
  
  // Use spawn instead of exec for better process control
  const ytDlp = spawn('yt-dlp', [
    '-f', 'best[ext=mp4]/best',
    url,
    '-o', outputPath,
    '--no-playlist'
  ]);
  
  let stdoutData = '';
  let stderrData = '';
  
  ytDlp.stdout.on('data', (data) => {
    stdoutData += data.toString();
    console.log(`stdout: ${data}`);
  });
  
  ytDlp.stderr.on('data', (data) => {
    stderrData += data.toString();
    console.error(`stderr: ${data}`);
  });
  
  ytDlp.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
    
    if (code !== 0) {
      return res.status(500).json({
        success: false,
        error: `Process exited with code ${code}`,
        stderr: stderrData
      });
    }
    
    try {
      // Check if file exists and has size
      const stats = fs.statSync(outputPath);
      
      if (stats.size === 0) {
        return res.status(500).json({
          success: false,
          error: 'Downloaded file is empty'
        });
      }
      
      // Send the file
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="video_${timestamp}.mp4"`);
      
      const fileStream = fs.createReadStream(outputPath);
      fileStream.pipe(res);
      
      // Clean up file after sending
      fileStream.on('end', () => {
        fs.unlink(outputPath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });
  
  ytDlp.on('error', (err) => {
    res.status(500).json({
      success: false,
      error: err.message
    });
  });
});

app.listen(port, () => {
  console.log(`YT-DLP API server running on port ${port}`);
});
