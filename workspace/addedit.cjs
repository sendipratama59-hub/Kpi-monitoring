const fs = require('fs');

const path = '/workspace/src/components/features/MapsAnalyzer/index.tsx';
let data = fs.readFileSync(path, 'utf8');

const targetStr = `                              <MapPin className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => {
                                showConfirm('Hapus Survey?'`;

const newStr = `                              <MapPin className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => {
                                 let dataToEdit = {...item};
                                 // Make sure latitude and longitude are set for the form
                                 if (item.lat) dataToEdit.latitude = item.lat;
                                 if (item.lng) dataToEdit.longitude = item.lng;
                                 setSelectedSurveyData(dataToEdit);
                                 setShowSurveyModal(true);
                              }}
                              className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors mr-1"
                              title="Edit Survey"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                showConfirm('Hapus Survey?'`;

data = data.replace(targetStr, newStr);
fs.writeFileSync(path, data);
console.log('done');
