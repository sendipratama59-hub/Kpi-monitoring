import fs from 'fs';

const path = 'src/components/features/MapsAnalyzer/index.tsx';
let data = fs.readFileSync(path, 'utf8');

data = data.replace(
  "&select=salesman_code,nama_salesman&limit=1', {",
  "&select=salesman_code,salesman_name&limit=1', {"
);

data = data.replace(
  "activeSalesman = { code: fetchedData[0].salesman_code, name: fetchedData[0].nama_salesman };",
  "activeSalesman = { code: fetchedData[0].salesman_code, name: fetchedData[0].salesman_name };"
);

fs.writeFileSync(path, data);
console.log('done!');
