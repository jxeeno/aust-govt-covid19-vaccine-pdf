const fs = require('fs');
const _ = require('lodash');
const { format } = require('@fast-csv/format');

const PUBLICATION_JSON_PATH = 'docs/data/geo/publications.json';
const DATA_CSV_PATH = 'docs/data/geo/air_%%agg%%.csv';
const DATA_JSON_PATH = 'docs/data/geo/air_%%agg%%.json';

const PUBLICATION_JSON_DATA_PATH = 'docs/data/';
const generateCsv = async () => {
    let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);
    publications.sort((a, b) => a.vaccineDataPath.localeCompare(b.vaccineDataPath));

    // handle when health publishes the data multiple times
    publications = _.uniqBy(publications, 'vaccineDataPath');

    const aggLevels = ['lga', 'sa3', 'sa4', 'sa4_indigenous'];

    const headers = {
        lga: 'DATE_AS_AT,AGG_LEVEL,STATE,ABS_CODE,ABS_NAME,AGE_LOWER,AGE_UPPER,AIR_FIRST_DOSE_PCT,AIR_SECOND_DOSE_PCT,AIR_THIRD_DOSE_PCT,AIR_THIRD_DOSE_ELIGIBLE_PCT,AIR_FIRST_DOSE_APPROX_COUNT,AIR_SECOND_DOSE_APPROX_COUNT,AIR_THIRD_DOSE_APPROX_COUNT,ABS_ERP_2019_POPULATION,MASKED,SA4_CODE_2016,SA3_CODE_2016,VALIDATED,URL'.split(','),
        sa3: 'DATE_AS_AT,AGG_LEVEL,STATE,ABS_CODE,ABS_NAME,AGE_LOWER,AGE_UPPER,AIR_FIRST_DOSE_PCT,AIR_SECOND_DOSE_PCT,AIR_THIRD_DOSE_PCT,AIR_THIRD_DOSE_ELIGIBLE_PCT,AIR_FIRST_DOSE_APPROX_COUNT,AIR_SECOND_DOSE_APPROX_COUNT,AIR_THIRD_DOSE_APPROX_COUNT,ABS_ERP_2019_POPULATION,VALIDATED,URL'.split(','),
        sa4: 'DATE_AS_AT,AGG_LEVEL,STATE,ABS_CODE,ABS_NAME,AGE_LOWER,AGE_UPPER,AIR_FIRST_DOSE_PCT,AIR_SECOND_DOSE_PCT,AIR_THIRD_DOSE_PCT,AIR_THIRD_DOSE_ELIGIBLE_PCT,AIR_FIRST_DOSE_APPROX_COUNT,AIR_SECOND_DOSE_APPROX_COUNT,AIR_THIRD_DOSE_APPROX_COUNT,ABS_ERP_2019_POPULATION,VALIDATED,URL'.split(','),
        sa4_indigenous: 'DATE_AS_AT,AGG_LEVEL,STATE,ABS_CODE,ABS_NAME,AGE_LOWER,AGE_UPPER,AIR_FIRST_DOSE_PCT,AIR_SECOND_DOSE_PCT,AIR_FIRST_DOSE_APPROX_COUNT,AIR_SECOND_DOSE_APPROX_COUNT,AIR_INDIGENOUS_POPULATION,ABS_ERP_2019_POPULATION,VALIDATED,URL'.split(','),
    }

    for(const aggLevel of aggLevels){
        let filteredPublications = publications.filter(v => v.vaccineDataPath.endsWith(`.${aggLevel}.json`));
        const output = [];
        const stream = format({ headers: headers[aggLevel] || true });
        stream.pipe(fs.createWriteStream(DATA_CSV_PATH.replace('%%agg%%', aggLevel)));

        for(const publication of filteredPublications){
            const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
            const data = JSON.parse(fs.readFileSync(localDataFile));

            for(const row of data.pdfData.rows){
                row.URL = publication.pdfUrl;
                stream.write(row);
                output.push(row);
            }
        }

        stream.end();

        fs.writeFileSync(DATA_JSON_PATH.replace('%%agg%%', aggLevel), JSON.stringify(output, null, 4));
    }
}

generateCsv();