const fs = require('fs');
const { format } = require('@fast-csv/format');
const axios = require('axios');
const pdfTableExtractor = require('./src/pdf-table');
const sa4Population = require('./src/abs/sa4_2019_population');
const lgaMapping = require('./src/abs/lgacodes.json');
const getDataAsAt = require('./asat');

const stateMap = {
    'Other Territories': 'OT',
    'Western Australia': 'WA',
    'South Australia': 'SA',
    'Victoria': 'VIC',
    'New South Wales': 'NSW',
    'Queensland': 'QLD',
    'Northern Territory': 'NT',
    'Australian Capital Territory': 'ACT',
    'Tasmania': 'TAS'
}

const LGAS = Object.values(lgaMapping).map(s => [s[1].toUpperCase().replace(/[^A-Z]/g, ''), ...s]);

async function scrapeLGA(data) {
    const aggLevel = 'ASGS_2020_LGA';
    // const url = 'https://www.health.gov.au/sites/default/files/documents/2021/08/covid-19-vaccination-geographic-vaccination-rates-9-august-2021.pdf'; // 'https://www.health.gov.au/sites/default/files/documents/2021/08/covid-19-vaccination-geographic-vaccination-rates-2-august-2021.pdf';
    // const {data} = await axios.get(url, {responseType: 'arraybuffer'});

    // const data = fs.readFileSync('2021-09-20 LGA Slide tables.pdf')

    const {pageTables} = await pdfTableExtractor(data);
    const asAt = await getDataAsAt(data);

    const cleanCell = (s) => {
        return s.replace(/\s+/g, ' ').trim();
    }

    const rows = [];
    for(const page of pageTables){
        const table = page.tables.map(r => r.map(s => cleanCell(s)));
        // console.log(page)
        // for(const table of page.tables){
            const header = table[0].map(s => cleanCell(s));
            if(header.length < 5){
                console.log(table)
                continue;
            }

            if(header[0] === 'State of Residence' && header[1] === 'LGA 2019 Name of Residence'){
                for(const r of table){
                    if(r[0] === 'State of Residence'){continue;}
                    if(r[0] === ''){continue;}
                    if(r[1] === ''){continue;}

                    const lga = LGAS.find(s => s[0] === r[1].toUpperCase().replace(/[^A-Z]/g, ''));
                    const lgapop = Number(r[4].replace(/[^0-9\.]+/g, ''))//lgapopulation[sa4[0]];

                    if(!lga){
                        console.log('no lga match', r)
                    }

                    const isMasked = r[2] == 'N/A';

                    const row = {
                        DATE_AS_AT: asAt, // '2021-09-19',
                        AGG_LEVEL: aggLevel,
                        STATE: stateMap[r[0]] || r[0],
                        ABS_CODE: lga ? lga[1] : '',
                        ABS_NAME: lga ? lga[2] : r[1],
                        AGE_LOWER: 15,
                        AGE_UPPER: 999,
                        AIR_FIRST_DOSE_PCT: isMasked ? null : Number(r[2].replace(/[^0-9\.]+/g, '')),
                        AIR_SECOND_DOSE_PCT: isMasked ? null : Number(r[3].replace(/[^0-9\.]+/g, '')),
                    }

                    row.AIR_FIRST_DOSE_APPROX_COUNT = isMasked ? null : lgapop ? Math.round(lgapop * (row.AIR_FIRST_DOSE_PCT/100)) : '';
                    row.AIR_SECOND_DOSE_APPROX_COUNT = isMasked ? null : lgapop ? Math.round(lgapop * (row.AIR_SECOND_DOSE_PCT/100)) : '';
                    row.ABS_ERP_2019_POPULATION = lgapop ? lgapop : '';
                    row.MASKED = isMasked ? 'Y' : 'N',
                    row.SA4_CODE_2016 = lga ? lga[3].join(';') : '';
                    row.SA3_CODE_2016 = lga ? lga[4].join(';') : '';
                    row.VALIDATED = 'Y';
                    row.URL = 'https://www.health.gov.au/sites/default/files/documents/2021/09/covid-19-vaccination-geographic-vaccination-rates-19-september-2021.pdf';

                    // stream.write(row);
                    rows.push(row)
                }
            }
    }

    return {
        dataAsAt: asAt,
        rows
    }
}

module.exports = scrapeLGA;
// scrape();