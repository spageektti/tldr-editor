const express = require('express');
const cors = require('cors');
const linter = require('./tldr-lint.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configure session middleware
app.use(session({
    secret: 'your_secret_key',  // Change this to a secure key in production
    resave: false,
    saveUninitialized: true
}));

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REPO = process.env.GITHUB_REPO;
const redirectUri = 'http://localhost:3000/auth/callback';

app.get('/copyright', (req, res) => {
    console.log('GET /copyright endpoint hit');
    res.send('tldr-lint API<br>Copyright (c) 2024 spageektti<br><br>' +
        'tldr-lint<br>Copyright (c) 2016 Ruben Vereecken<br>' +
        'Copyright(c) 2016 - present The tldr-pages team and contributors');
});

app.get('/auth/status', (req, res) => {
    console.log('GET /auth/status endpoint hit');
    const loggedIn = req.session && req.session.token;
    console.log('User logged in:', !!loggedIn);
    res.json({ loggedIn: !!loggedIn });
});

app.get('/auth/login', (req, res) => {
    console.log('GET /auth/login endpoint hit');
    const scope = 'repo';
    console.log(`Redirecting to GitHub for authorization with client_id=${GITHUB_CLIENT_ID}`);
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`);
});

app.get('/auth/callback', async (req, res) => {
    console.log('GET /auth/callback endpoint hit');
    const code = req.query.code;
    console.log('Authorization code received:', code);

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri
            })
        });

        const data = await response.json();
        console.log('GitHub OAuth response:', data);
        const token = data.access_token;

        if (token) {
            req.session.token = token;  // Save token to session
            console.log('Authentication successful. Redirecting to editor.');
            res.redirect('/');
        } else {
            console.error('Failed to authenticate. No access token received.');
            res.status(500).send('Failed to authenticate');
        }
    } catch (error) {
        console.error('Error during authentication:', error.message);
        res.status(500).send(`Authentication error: ${error.message}`);
    }
});

app.post('/commit', async (req, res) => {
    console.log('POST /commit endpoint hit');
    const { fileContent, message } = req.body;
    console.log('Received file content and commit message:', message);

    const token = req.session && req.session.token;

    if (!token) {
        console.error('Unauthorized. No token found in session.');
        return res.status(401).send('Unauthorized');
    }

    try {
        const filePath = 'pages/linux/flatpak.md';
        console.log('File path for commit:', filePath);

        console.log('Creating blob...');
        const blobResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/blobs`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: fileContent,
                encoding: 'utf-8'
            })
        });
        const blobData = await blobResponse.json();
        console.log('Blob creation response:', blobData);
        const blobSha = blobData.sha;

        console.log('Getting current tree...');
        const treeResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/trees/HEAD`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const treeData = await treeResponse.json();
        console.log('Current tree response:', treeData);
        const treeSha = treeData.sha;

        console.log('Creating new tree...');
        const newTreeResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/trees`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                base_tree: treeSha,
                tree: [
                    {
                        path: filePath,
                        mode: '100644',
                        type: 'blob',
                        sha: blobSha
                    }
                ]
            })
        });
        const newTreeData = await newTreeResponse.json();
        console.log('New tree response:', newTreeData);
        const newTreeSha = newTreeData.sha;

        console.log('Creating new commit...');
        const commitResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/commits`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                tree: newTreeSha,
                parents: [treeData.sha]
            })
        });
        const commitData = await commitResponse.json();
        console.log('Commit response:', commitData);
        const commitSha = commitData.sha;

        console.log('Updating reference...');
        await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/main`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sha: commitSha
            })
        });

        res.send('Commit successful');
    } catch (error) {
        console.error('Commit error:', error.message);
        res.status(500).send(`Commit error: ${error.message}`);
    }
});

app.get('/check/:fileContent', (req, res) => {
    console.log('GET /check/:fileContent endpoint hit');
    const fileContent = decodeURIComponent(req.params.fileContent);
    console.log('Received file content for checking.');

    try {
        const tempFilePath = path.join(os.tmpdir(), 'temp-file.md');
        fs.writeFileSync(tempFilePath, fileContent);

        console.log('Running linter...');
        const linterResult = linter.processFile(tempFilePath, true, false, false);
        fs.unlinkSync(tempFilePath);

        if (linterResult.errors.length > 0) {
            const errorsText = linterResult.errors.map(error => {
                return `Line ${error.locinfo.first_line || error.locinfo.last_line - 1}: ${error.code} - ${error.description}`;
            }).join('\n');
            res.send(errorsText);
        } else {
            res.send('No errors found');
        }
    } catch (error) {
        console.error('Error during check:', error.message);
        res.status(500).send(`An error occurred: ${error.message}`);
    }
});

app.get('/format/:fileContent', (req, res) => {
    console.log('GET /format/:fileContent endpoint hit');
    const fileContent = decodeURIComponent(req.params.fileContent);
    console.log('Received file content for formatting.');

    try {
        const tempFilePath = path.join(os.tmpdir(), 'temp-file.md');
        fs.writeFileSync(tempFilePath, fileContent);

        console.log('Running formatter...');
        const linterResult = linter.processFile(tempFilePath, true, true, false);

        if (linterResult.formatted) {
            res.send(linterResult.formatted);
        } else {
            res.status(500).send('Formatting error: No formatted content available.');
        }
    } catch (error) {
        console.error('Error during formatting:', error.message);
        res.status(500).send(`An error occurred: ${error.message}`);
    }
});
