const fs = require('fs');
let s = fs.readFileSync('src/components/features/LcdCatalog/buildLcdCatalogListHtml.ts', 'utf8');
let newS = s.replace(/return `([\s\S]*?)`;/, function(match, p1) {
    return "return `" + p1.split("\n").join("` + \n`") + "`;";
});
fs.writeFileSync('src/components/features/LcdCatalog/buildLcdCatalogListHtml.ts', newS);
