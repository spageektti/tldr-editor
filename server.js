const express = require('express');
const cors = require('cors');
const linter = require('./tldr-lint.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const GITHUB_CLIENT_ID = 'CLIENT_ID';
const GITHUB_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const GITHUB_OWNER = 'spageektti';
const GITHUB_REPO = GITHUB_OWNER + '/tldr';

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

app.get('/copyright', (req, res) => {
    res.send('tldr-lint API<br>Copyright (c) 2024 spageektti<br><br>' +
        'tldr-lint<br>Copyright (c) 2016 Ruben Vereecken<br>' +
        'Copyright(c) 2016 - present The tldr-pages team and contributors');
});

app.get('/auth/status', (req, res) => {
    const loggedIn = req.session && req.session.token;
    res.json({ loggedIn: !!loggedIn });
});

app.get('/auth/login', (req, res) => {
    const redirectUri = 'http://localhost:3000/auth/callback';
    const scope = 'repo';
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`);
});

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    const redirectUri = 'http://localhost:3000/auth/callback';

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
    const token = data.access_token;

    if (token) {
        req.session = { token };
        res.redirect('/');
    } else {
        res.status(500).send('Failed to authenticate');
    }
});

app.post('/commit', async (req, res) => {
    const { fileContent, message } = req.body;

    const token = req.session && req.session.token;

    if (!token) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const filePath = 'path/to/file.md';

        const blobResponse = await fetch('https://api.github.com/repos/' + GITHUB_REPO + '/git/blobs', {
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
        const blobSha = blobData.sha;

        const treeResponse = await fetch('https://api.github.com/repos/' + GITHUB_REPO + '/git/trees/HEAD', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const treeData = await treeResponse.json();
        const treeSha = treeData.sha;

        const newTreeResponse = await fetch('https://api.github.com/repos/' + GITHUB_REPO + '/git/trees', {
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
        const newTreeSha = newTreeData.sha;

        const commitResponse = await fetch('https://api.github.com/repos/' + GITHUB_REPO + '/git/commits', {
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
        const commitSha = commitData.sha;

        await fetch('https://api.github.com/repos/' + GITHUB_REPO + '/git/refs/heads/main', {
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
        res.status(500).send(`Commit error: ${error.message}`);
    }
});
