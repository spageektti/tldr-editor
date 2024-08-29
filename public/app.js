function updateLineNumbers() {
    const textarea = document.getElementById("editor");
    const lineNumbers = document.getElementById("line-numbers");

    const lines = textarea.value.split("\n").length;

    lineNumbers.innerHTML = '';
    for (let i = 1; i <= lines; i++) {
        const lineNumber = document.createElement("div");
        lineNumber.textContent = i;
        lineNumbers.appendChild(lineNumber);
    }
}

function syncScroll() {
    const textarea = document.getElementById("editor");
    const lineNumbers = document.getElementById("line-numbers");
    lineNumbers.scrollTop = textarea.scrollTop;
}

updateLineNumbers();

async function getPageContent(page_url) {
    const response = await fetch(page_url);
    if (!response.ok) {
        return '';
    }
    const text = await response.text();
    return text;
}

const currentUrl = window.location.href;
const url = new URL(currentUrl);
const params = new URLSearchParams(url.search);

const lang = params.get('lang');
const platform = params.get('platform');
const page = params.get('page');

let converted_lang;
if (lang === 'en') {
    converted_lang = '';
} else {
    converted_lang = '.' + lang;
}

const path = 'pages' + converted_lang + '/' + platform + '/' + page + '.md';
console.log('Editing file ' + path);

const page_url = 'https://raw.githubusercontent.com/tldr-pages/tldr/main/' + path;

const editor = document.getElementById('editor');
const errors = document.getElementById('errors');

getPageContent(page_url).then(page_content => {
    editor.value = page_content;
    updateLineNumbers();
});

function check() {
    console.log("Checking...");

    const fileContent = editor.value;
    const encodedContent = encodeURIComponent(fileContent);
    const checkUrl = `../check/${encodedContent}`;

    fetch(checkUrl)
        .then(response => response.text())
        .then(data => {
            errors.textContent = data;
        })
        .catch(error => {
            errors.textContent = `An error occurred: ${error.message}`;
        });
}

function format() {
    console.log("Formatting...");
    const fileContent = editor.value;
    const encodedContent = encodeURIComponent(fileContent);
    const formatUrl = `../format/${encodedContent}`;

    fetch(formatUrl)
        .then(response => response.text())
        .then(data => {
            if (data.startsWith('Formatting error:')) {
                errors.textContent = data;
            } else {
                editor.value = data;
                errors.textContent = 'Formatting applied successfully';
            }
        })
        .catch(error => {
            errors.textContent = `An error occurred: ${error.message}`;
        });
}

async function checkLoginStatus() {
    try {
        const response = await fetch('../auth/status');
        if (response.ok) {
            const status = await response.json();
            console.log(status);
            console.log(status.loggedIn);
            return status.loggedIn;
        }
        return false;
    } catch (error) {
        console.error('Failed to check login status', error);
        return false;
    }
}

async function commit() {
    if (checkLoginStatus() == true) {
        console.log("Committing...");
    }
    else {
        console.log("Not logged in to GitHub");
    }
}
