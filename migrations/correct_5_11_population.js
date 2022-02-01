const fs = require('fs');
const _ = require('lodash');
const { getPopulation } = require('../src/abs_erp');

const PUBLICATION_JSON_PATH = 'docs/data/publications.json';
const PUBLICATION_JSON_DATA_PATH = 'docs/data/';

let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);
let correctPopulation = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).find(v => v.vaccineDataPath != null && v.vaccineDataPath.includes('2022-01-31'));

console.log({correctPopulation})

const correctLocalFile = correctPopulation.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
const correctData = JSON.parse(fs.readFileSync(correctLocalFile));

for(const publication of publications){
    const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
    const data = JSON.parse(fs.readFileSync(localDataFile));

    // const states = ['AUS', 'NSW', 'VIC', 'QLD', 'ACT', 'NT', 'WA', 'TAS', 'SA'];
    const states = _.get(data, 'pdfData.doseBreakdown');
    if(states){
        for(const state in states){
            const correctPopData = (_.get(correctData, 'pdfData.doseBreakdown', {})[state]).find(v => v.ageUpper === 11);
            states[state] = states[state].map((data) => {
                if(data.ageUpper === 11){
                    // correct
                    data.cohortPopulation = correctPopData.cohortPopulation
                }

                return data;
            });
            // states[state].thirdDosePct16 = Math.round((states[state].thirdDoseCount || states[state].total) / getPopulation(state, 16, 999) * 100 * 100)/100,
            // states[state].thirdDosePct = Math.round((states[state].thirdDoseCount || states[state].total) / getPopulation(state, 18, 999) * 100 * 100)/100
            // const act1619 = ageBucketArr.find(a => a.ageLower === 16 && a.ageUpper === 19);
            // if(act1619){
            //     act1619.cohortPopulation = getPopulation('ACT', 16, 19);
            //     act1619.firstDoseCount = Math.round(act1619.cohortPopulation * (act1619.firstDosePct/100));
            //     act1619.secondDoseCount = Math.round(act1619.cohortPopulation * (act1619.secondDosePct/100));
                fs.writeFileSync(localDataFile, JSON.stringify(data, null, 4))
            // }
        }
    }
}