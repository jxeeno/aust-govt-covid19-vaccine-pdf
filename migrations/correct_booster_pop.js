const fs = require('fs');
const _ = require('lodash');
const { getPopulation } = require('../src/abs_erp');

const PUBLICATION_JSON_PATH = 'docs/data/publications.json';
const PUBLICATION_JSON_DATA_PATH = 'docs/data/';

let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);

for(const publication of publications){
    const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
    const data = JSON.parse(fs.readFileSync(localDataFile));

    const states = _.get(data, 'pdfData.thirdDoses');
    if(states){
        for(const state in states){
            states[state].thirdDosePct16 = Math.round((states[state].thirdDoseCount || states[state].total) / getPopulation(state, 16, 999) * 100 * 100)/100,
            states[state].thirdDosePct = Math.round((states[state].thirdDoseCount || states[state].total) / getPopulation(state, 18, 999) * 100 * 100)/100
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