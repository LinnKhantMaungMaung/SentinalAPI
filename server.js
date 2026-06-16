const express = require('express');
const https = require('https');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const TOKEN_HOST = 'hcsntl1-iqfleet-iqops.eu1.mindsphere.io';
const GATEWAY = 'hcsntl1-iqfleet-iqops.eu1.mindsphere.io';

function makeRequest(hostname, reqPath, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      path: reqPath,
      method: 'GET',
      headers: token
        ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

app.get('/api/token', async (req, res) => {
  try {
    const apiKey = process.env.DTA_API_KEY;
    const result = await makeRequest(
      TOKEN_HOST,
      '/public/iqtoken/token?key=' + apiKey
    );
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/siemens/*', async (req, res) => {
  try {
    const apiKey = process.env.DTA_API_KEY;

    const tokenResult = await makeRequest(
      TOKEN_HOST,
      '/public/iqtoken/token?key=' + apiKey
    );

    console.log('Token response status:', tokenResult.status);
    console.log('Token response body:', JSON.stringify(tokenResult.body));

    const token = tokenResult.body.access_token;
    if (!token) {
      return res.status(401).json({ error: 'No token', detail: tokenResult.body });
    }

    const siemensPath = req.url.replace('/api/siemens', '');
    console.log('Proxying to:', siemensPath);

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