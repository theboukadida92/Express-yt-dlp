app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    console.log(`Processing URL: ${url}`);
    
    // Create a unique filename
    const outputFile = path.join(__dirname, 'tmp', 'videos', `video-${Date.now()}.mp4`);
    
    // Special handling for Instagram
    let ytDlpOptions = [];
    if (url.includes('instagram.com')) {
      console.log('Instagram URL detected, using special options');
      ytDlpOptions = [
        '--no-warnings',
        '--no-check-certificate',
        '--no-call-home',
        '--geo-bypass',
        '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
        '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '--add-header', 'Accept-Language:en-US,en;q=0.5',
        '--add-header', 'Accept-Charset:ISO-8859-1,utf-8;q=0.7,*;q=0.7',
        '--add-header', 'Origin:https://www.instagram.com',
        '--add-header', 'Referer:https://www.instagram.com/',
        '-o', outputFile
      ];
    } else {
      ytDlpOptions = ['-o', outputFile];
    }
    
    // Execute yt-dlp
    const ytDlpProcess = spawn('yt-dlp', [...ytDlpOptions, url]);
    
    let stderr = '';
    ytDlpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`yt-dlp stderr: ${data}`);
    });
    
    ytDlpProcess.stdout.on('data', (data) => {
      console.log(`yt-dlp stdout: ${data}`);
    });
    
    ytDlpProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`yt-dlp process exited with code ${code}`);
        return res.status(500).json({ success: false, error: `Process exited with code ${code}`, stderr });
      }
      
      // Check if file exists
      if (!fs.existsSync(outputFile)) {
        return res.status(500).json({ 
          success: false, 
          error: 'File was not downloaded properly',
          stderr
        });
      }
      
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
