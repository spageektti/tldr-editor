const express = require('express');
const cors = require('cors');
const linter = require('./tldr-lint.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

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
    //placeholder
    const loggedIn = false;
    res.json({ loggedIn });
});

app.get('/auth/login', (req, res) => {
    res.redirect('https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID');
});

app.get('/check/:fileContent', (req, res) => {
    try {
        const fileContent = decodeURIComponent(req.params.fileContent);
        const tempFilePath = path.join(os.tmpdir(), 'temp-file.md');
        fs.writeFileSync(tempFilePath, fileContent);

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
        res.status(500).send(`An error occurred: ${error.message}`);
    }
});

app.get('/format/:fileContent', (req, res) => {
    try {
        const fileContent = decodeURIComponent(req.params.fileContent);
        const tempFilePath = path.join(os.tmpdir(), 'temp-file.md');
        fs.writeFileSync(tempFilePath, fileContent);

        const linterResult = linter.processFile(tempFilePath, true, true, false);

        if (linterResult.formatted) {
            res.send(linterResult.formatted);
        } else {
            res.status(500).send('Formatting error: No formatted content available.');
        }
    } catch (error) {
        res.status(500).send(`An error occurred: ${error.message}`);
    }
});

app.post('/commit/:fileContent', (req, res) => {
    try {
        const fileContent = decodeURIComponent(req.body.fileContent);
        res.send('Commit successful');
    } catch (error) {
        res.status(500).send(`Commit error: ${error.message}`);
    }
});
