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
});

function check() {
    console.log("Checking...");

    const fileContent = editor.value;

    console.log(fileContent);

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
                errors.value = data;
            } else {
                editor.value = data;
                errors.textContent = 'Formatting applied successfully';
            }
        })
        .catch(error => {
            errors.textContent = `An error occurred: ${error.message}`;
        });
}
