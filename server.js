const express = require('express');
const cors = require('cors');
const linter = require('./tldr-lint.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

app.get('/copyright', (req, res) => {
    res.send('tldr-lint API<br>Copyright (c) 2024 spageektti<br><br>' +
        'tldr-lint<br>Copyright (c) 2016 Ruben Vereecken<br>' +
        'Copyright(c) 2016 - present The tldr-pages team and contributors');
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
