import fs from 'fs';

let bundled = fs.readFileSync('dist/assets/index-CWzNZKsb.js', 'utf8');

// The exported function string will start near "export const buildSurveyChannelHtml" or similar.
// Let's find the start of the HTML string.
let idx = bundled.indexOf('<!DOCTYPE html>');
if (idx > -1) {
    let startFn = bundled.lastIndexOf('const ', idx);
    if (startFn === -1) startFn = bundled.lastIndexOf('function', idx);
    
    // We want specifically the html string returned by buildSurveyChannelHtml
    // In minified code, it's returning a literal string or building it. 
    // Let's just find `<!DOCTYPE html>`
    let endIdx = bundled.indexOf('</html>', idx);
    if (endIdx > -1) {
        let text = bundled.substring(idx, endIdx + 7);
        // It's inside a string. Usually \n are literal \n if it's a template literal.
        // It might be a template literal in the minified output too: `<!DOCTYPE html>...`
        fs.writeFileSync('src/restore.html', text);
        console.log("RESTORED HTML TO src/restore.html");
    } else {
        console.log("NO END");
    }

} else {
    console.log("NO DOCTYPE");
}
