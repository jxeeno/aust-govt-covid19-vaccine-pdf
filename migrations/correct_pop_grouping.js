const fs = require('fs');
const _ = require('lodash');
const { getPopulation } = require('../src/abs_erp');

const PUBLICATION_JSON_PATH = 'docs/data/publications.json';
const PUBLICATION_JSON_DATA_PATH = 'docs/data/';

let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);

for(const publication of publications){
    const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
    const data = JSON.parse(fs.readFileSync(localDataFile));

    const states = _.get(data, 'pdfData.stateOfResidence');
    if(states){
        for(const state in states){
            const incorrectZeroAgeLower = _.get(states[state], 'ageBucketsActualPopulation', []).find(a => a.ageLower === 0);
            if(incorrectZeroAgeLower){
                incorrectZeroAgeLower.ageLower = 16;
            }
        }
        fs.writeFileSync(localDataFile, JSON.stringify(data, null, 4))
    }
}