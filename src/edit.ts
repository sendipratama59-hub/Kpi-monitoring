import fs from 'fs';
let content = fs.readFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', 'utf8');

const arr = content.split('} else {');
let matched = false;
for (let i = 0; i < arr.length; i++) {
    if (arr[i].includes('inputHtml') && arr[i].includes('f.type') && arr[i].includes('focus:ring-2')) {
        console.log("FOUND IT!");
        arr[i] = `
               let defVal = '';
               if (f.name === 'cabang') {
                   defVal = dynamicData[f.name] || 'Bandung';
                   dynamicData[f.name] = defVal;
               }
               let valAttr = defVal ? \` value="\${defVal}"\` : \`\`;
               inputHtml = \`<input type="\${f.type}" id="dyn_\${f.name}" \${f.required ? 'required' : ''}\${valAttr} placeholder="\${f.placeholder}" oninput="dynamicData['\${f.name}'] = this.value" class="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">\`;
            }`;
        matched = true;
    }
}

if (matched) {
    fs.writeFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', arr.join('} else {'));
    console.log('REPLACED');
} else {
    console.log('FAILED');
}
