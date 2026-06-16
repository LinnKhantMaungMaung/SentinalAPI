const express = require('express');
const https = require('https');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const TOKEN_HOST = 'gateway.eu1.mindsphere.io';
const TOKEN_PATH = '/api/technicaltokenmanager/v3/oauth/token';
const GATEWAY = 'hcsntl1-iqfleet-iqops.eu1.mindsphere.io';

function makeRequest(hostname, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, body: body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

app.get('/api/token', async (req, res) => {
  try {
    const result = await makeRequest(
      TOKEN_HOST,
      TOKEN_PATH + '?key=' + process.env.DTA_API_KEY
    );
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/siemens/*', async (req, res) => {
  try {
    const tokenResult = await makeRequest(
      TOKEN_HOST,
      TOKEN_PATH + '?key=' + process.env.DTA_API_KEY
    );
    const token = tokenResult.body.access_token;
    if (!token) {
      return res.status(401).json({ error: 'No token', detail: tokenResult.body });
    }
    const siemensPath = req.url.replace('/api/siemens', '');
    console.log('Proxying to: ' + siemensPath);
    const result = await makeRequest(GATEWAY, siemensPath, token);
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});