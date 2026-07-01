/* Zero-dependency Static File HTTP Server in Node.js */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Resolve path (prioritize serving from compiled 'dist' folder)
  let relativePath = req.url === '/' ? 'index.html' : req.url.split('?')[0];
  let filePath = path.join(__dirname, 'dist', relativePath);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, relativePath);
  }
  
  // Safe path check (prevent traversing out of directory)
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Access Forbidden');
    return;
  }
  
  const ext = path.extname(filePath);
  let contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Page not found
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>404 Not Found</h1>');
      } else {
        // Server error
        res.statusCode = 500;
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
