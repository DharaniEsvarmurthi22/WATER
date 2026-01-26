const http = require('http');
const fs = require('fs');
const path = require('path');

// Allow overriding the port via environment variable for easier local testing
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // Strip query string from URL
    const urlPath = req.url.split('?')[0];

    // Handle root path
    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err);
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end(`File not found: ${req.url}\n`);
            } else {
                res.writeHead(500);
                res.end(`Server error: ${err.code}\n`);
            }
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Current directory: ${__dirname}`);
    console.log('Available files:');
    fs.readdirSync(__dirname)
        .filter(file => !file.startsWith('.'))
        .forEach(file => console.log(`- ${file}`));
});
