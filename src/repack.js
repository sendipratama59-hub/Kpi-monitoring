import fs from 'fs';

let content = fs.readFileSync('src/restore.html', 'utf8');

// Replace minified things or escaped slashes:
content = content.replace(/<\/script>/g, '</script>');

// Wait, the variables inside the string are literal JS concatenations in Vite minified or template literals.
// `\${var}` gets compiled to `${var}` in the dist, or `" + var + "`.
// Let's check how `${supbase_url}` is represented.
