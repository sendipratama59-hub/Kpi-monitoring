const { execSync } = require('child_process');
const fs = require('fs');

try {
    const original = execSync('git show HEAD:src/components/features/SurveyChannel/buildSurveyChannelHtml.ts').toString();
    fs.writeFileSync('src/components/features/SurveyChannel/buildSurveyChannelHtml.ts', original);
    console.log("RESTORED FROM GIT!");
} catch (e) {
    console.log("FAILURE", e);
}
