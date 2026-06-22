import fs from 'fs';

let content = fs.readFileSync('src/restore.html', 'utf8');

// The original file looks like:
/*
export const buildSurveyChannelHtml = (SUPABASE_URL: string, SUPABASE_KEY: string, formFields: any[]) => {
  const htmlContent = `[RESTORED_HTML]`;
  return htmlContent;
};
*/

// Wait, the HTML inside `dist` ends with </html>. Let's make sure it doesn't have ``;` at the end inside the dist bundle.
let html = content.trim();

// Unpack the escaped interpolation, for example: \${SUPABASE_URL}
// If we look at grep output above: `\${SUPABASE_URL}` exists exactly like that in the string! Which means the template literal in the minified js already escaped `\${` because when it's stringified it gets escaped! So in my typescript it should also just be `\${`!
// Let's replace any `\${` with just `\${` ... wait. It's already `\${` in `restore.html`.
// Let's create the TS file.
let ts = `export const buildSurveyChannelHtml = (SUPABASE_URL: string, SUPABASE_KEY: string, formFields: any[]) => {
  const htmlContent = \`\n${html}\n\`;
  return htmlContent;
};`;

fs.writeFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', ts);
console.log("RESTORED!");
