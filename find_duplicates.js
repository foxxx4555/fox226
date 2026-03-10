const fs = require('fs');
const path = require('path');

function findDuplicates(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const keys = new Map();
    const duplicates = [];

    // Simple regex to find keys like '  key: "value",' or '  key: 'value','
    const keyRegex = /^\s*([a-zA-Z0-9_]+)\s*:/;

    lines.forEach((line, index) => {
        const match = line.match(keyRegex);
        if (match) {
            const key = match[1];
            if (keys.has(key)) {
                duplicates.push({ key, first: keys.get(key), second: index + 1 });
            } else {
                keys.set(key, index + 1);
            }
        }
    });

    return duplicates;
}

const arPath = 'd:\\Fox3-main\\src\\i18n\\ar.ts';
const enPath = 'd:\\Fox3-main\\src\\i18n\\en.ts';

console.log('--- Arabic Duplicates ---');
console.log(JSON.stringify(findDuplicates(arPath), null, 2));

console.log('--- English Duplicates ---');
console.log(JSON.stringify(findDuplicates(enPath), null, 2));
