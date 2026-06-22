import fs from 'fs';

let content = fs.readFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', 'utf8');

const t2 = "\\${f.type}";
const t3 = "\\${f.name}";

let lines = content.split('\\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('inputHtml = ') && lines[i].includes(t2) && lines[i].includes(t3)) {
        console.log("FOUND AT", i);
        lines[i] = `               let defVal = "";
               if (f.name === "cabang") { defVal = dynamicData[f.name] || "Bandung"; dynamicData[f.name] = defVal; }
               let valAttr = defVal ? \\\` value="\\\\\${defVal}"\\\` : "";
               inputHtml = \\\`<input type="\\\\\${f.type}" id="dyn_\\\\\${f.name}" \\\\\${f.required ? 'required' : ''}\\\\\${valAttr} placeholder="\\\\\${f.placeholder}" oninput="dynamicData['\\\\\${f.name}'] = this.value" class="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">\\\`;`;
    }
    
    if (lines[i].includes(`document.getElementById('surveyForm').reset();`)) {
        lines[i] = `            document.getElementById('surveyForm').reset();
            if (document.getElementById('fm_cabang')) document.getElementById('fm_cabang').value = 'Bandung';`;
    }
}

fs.writeFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', lines.join('\\n'));
console.log("DONE");
