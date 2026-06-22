import fs from 'fs';

const path = 'src/components/features/MapsAnalyzer/index.tsx';
let data = fs.readFileSync(path, 'utf8');

const target1 = `          const res = await fetch(\`\${SUPABASE_URL}/rest/v1/salesman_customer?salesman_code=eq.\${encodeURIComponent(code)}&select=salesman_code,nama_salesman&limit=1\`, {`;
const fix1 = `          const res = await fetch(\\\`\\\${SUPABASE_URL}/rest/v1/salesman_customer?salesman_code=eq.\\\${encodeURIComponent(code)}&select=salesman_code,nama_salesman&limit=1\\\`, {`;
data = data.replace(target1, fix1);

const target2 = `             headers: { 'apikey': SUPABASE_KEY, 'Authorization': \`Bearer \${SUPABASE_KEY}\` }`;
const fix2 = `             headers: { 'apikey': SUPABASE_KEY, 'Authorization': \\\`Bearer \\\${SUPABASE_KEY}\\\` }`;
data = data.replace(target2, fix2);

const target3 = "              const surveyorLabel = ls && ls.nama_salesman ? `<div class=\"mt-2 text-xs bg-slate-100 text-slate-600 py-1.5 px-2 rounded-lg border border-slate-200\"><i class=\"fa-solid fa-user-check text-emerald-500 mr-1\"></i> Disurvey oleh: <b>${ls.nama_salesman}</b></div>` : '';";
const fix3 = "              const surveyorLabel = ls && ls.nama_salesman ? `\\<div class=\"mt-2 text-xs bg-slate-100 text-slate-600 py-1.5 px-2 rounded-lg border border-slate-200\"\\>\\<i class=\"fa-solid fa-user-check text-emerald-500 mr-1\"\\>\\</i\\> Disurvey oleh: \\<b\\>\\${ls.nama_salesman}\\</b\\>\\</div\\>` : '';";

// Actually the above might fail if not exactly matched. Let's just use Regex
data = data.replace(/await fetch\(`\$\{SUPABASE_URL\}\/rest\/v1\/salesman_customer\?salesman_code=eq\.\$\{encodeURIComponent\(code\)\}&select=salesman_code,nama_salesman&limit=1`, \{/, 
  "await fetch(`\\${SUPABASE_URL}/rest/v1/salesman_customer?salesman_code=eq.\\${encodeURIComponent(code)}&select=salesman_code,nama_salesman&limit=1`, {");
  
data = data.replace(/'Authorization': `Bearer \$\{SUPABASE_KEY\}` \}/, 
  "'Authorization': `Bearer \\${SUPABASE_KEY}` }");

data = data.replace(/const surveyorLabel = ls && ls\.nama_salesman \? `<div class="mt-2 text-xs bg-slate-100 text-slate-600 py-1\.5 px-2 rounded-lg border border-slate-200"><i class="fa-solid fa-user-check text-emerald-500 mr-1"><\/i> Disurvey oleh: <b>\$\{ls\.nama_salesman\}<\/b><\/div>` : '';/,
  "const surveyorLabel = ls && ls.nama_salesman ? `\\<div class=\"mt-2 text-xs bg-slate-100 text-slate-600 py-1.5 px-2 rounded-lg border border-slate-200\"\\>\\<i class=\"fa-solid fa-user-check text-emerald-500 mr-1\"\\>\\</i\\> Disurvey oleh: \\<b\\>\\${ls.nama_salesman}\\</b\\>\\</div\\>` : '';");

fs.writeFileSync(path, data);
console.log('done syntax fix');
