import fs from 'fs';

let content = fs.readFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', 'utf8');

const rOriginal = `            } else {
                inputHtml = \`<input type="\\$\\{f.type}" id="dyn_\\$\\{f.name}" \\$\\{f.required ? 'required' : ''} placeholder="\\$\\{f.placeholder}" oninput="dynamicData['\\$\\{f.name}'] = this.value" class="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">\`;
            }`;

const rNew = `            } else {
                let defVal = "";
                let valAttr = "";
                if (f.name === "cabang") {
                    defVal = dynamicData[f.name] || "Bandung";
                    dynamicData[f.name] = defVal;
                }
                if (defVal) {
                    valAttr = \` value="\\$\\{defVal}"\`;
                }
                inputHtml = \`<input type="\\$\\{f.type}" id="dyn_\\$\\{f.name}" \\$\\{f.required ? 'required' : ''}\\$\\{valAttr} placeholder="\\$\\{f.placeholder}" oninput="dynamicData['\\$\\{f.name}'] = this.value" class="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">\`;
            }`;

if (content.includes(rOriginal)) {
    content = content.replace(rOriginal, rNew);
    
    // Also inject reset for cabang!
    const oReset = `document.getElementById('surveyForm').reset();`;
    const nReset = `document.getElementById('surveyForm').reset();
            if (document.getElementById('fm_cabang')) document.getElementById('fm_cabang').value = 'Bandung';`;
    content = content.replace(oReset, nReset);
    
    fs.writeFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', content);
    console.log("REPLACED SUCCESS");
} else {
    console.log("NOT FOUND. Let's dump the surrounding lines to see exactly the bytes.");
    const pos = content.indexOf(`type="\\$\\{f.type}" id="dyn_\\$\\{f.name}"`);
    console.log(content.substring(pos - 100, pos + 250));
}
