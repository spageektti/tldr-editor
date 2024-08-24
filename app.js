async function getPageContent(page_url) {
    try {
        const response = await fetch(page_url);
        if (!response.ok) {
            throw new Error('error');
        }
        const text = await response.text();
        return text;
    } catch (error) {
        console.error(error);
        return '';
    }
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

getPageContent(page_url).then(page_content => {
    editor.textContent = page_content;
});