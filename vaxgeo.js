const fs = require('fs');
const { format } = require('@fast-csv/format');
const axios = require('axios');
const pdfTableExtractor = require('./src/pdf-table');
const sa4Population = require('./src/abs/sa4_2019_population');

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

const SA4S = [
    [101, 'Capital Region'],[102, 'Central Coast'],[103, 'Central West'],[104, 'Coffs Harbour - Grafton'],[105, 'Far West and Orana'],[106, 'Hunter Valley exc Newcastle'],[107, 'Illawarra'],[108, 'Mid North Coast'],[109, 'Murray'],[110, 'New England and North West'],[111, 'Newcastle and Lake Macquarie'],[112, 'Richmond - Tweed'],[113, 'Riverina'],[114, 'Southern Highlands and Shoalhaven'],[115, 'Sydney - Baulkham Hills and Hawkesbury'],[116, 'Sydney - Blacktown'],[117, 'Sydney - City and Inner South'],[118, 'Sydney - Eastern Suburbs'],[119, 'Sydney - Inner South West'],[120, 'Sydney - Inner West'],[121, 'Sydney - North Sydney and Hornsby'],[122, 'Sydney - Northern Beaches'],[123, 'Sydney - Outer South West'],[124, 'Sydney - Outer West and Blue Mountains'],[125, 'Sydney - Parramatta'],[126, 'Sydney - Ryde'],[127, 'Sydney - South West'],[128, 'Sydney - Sutherland'],[197, 'Migratory - Offshore - Shipping (NSW)'],[199, 'No usual address (NSW)'],[201, 'Ballarat'],[202, 'Bendigo'],[203, 'Geelong'],[204, 'Hume'],[205, 'Latrobe - Gippsland'],[206, 'Melbourne - Inner'],[207, 'Melbourne - Inner East'],[208, 'Melbourne - Inner South'],[209, 'Melbourne - North East'],[210, 'Melbourne - North West'],[211, 'Melbourne - Outer East'],[212, 'Melbourne - South East'],[213, 'Melbourne - West'],[214, 'Mornington Peninsula'],[215, 'North West'],[216, 'Shepparton'],[217, 'Warrnambool and South West'],[297, 'Migratory - Offshore - Shipping (Vic.)'],[299, 'No usual address (Vic.)'],[301, 'Brisbane - East'],[302, 'Brisbane - North'],[303, 'Brisbane - South'],[304, 'Brisbane - West'],[305, 'Brisbane Inner City'],[306, 'Cairns'],[307, 'Darling Downs - Maranoa'],[308, 'Central Queensland'],[309, 'Gold Coast'],[310, 'Ipswich'],[311, 'Logan - Beaudesert'],[312, 'Mackay - Isaac - Whitsunday'],[313, 'Moreton Bay - North'],[314, 'Moreton Bay - South'],[315, 'Queensland - Outback'],[316, 'Sunshine Coast'],[317, 'Toowoomba'],[318, 'Townsville'],[319, 'Wide Bay'],[397, 'Migratory - Offshore - Shipping (Qld)'],[399, 'No usual address (Qld)'],[401, 'Adelaide - Central and Hills'],[402, 'Adelaide - North'],[403, 'Adelaide - South'],[404, 'Adelaide - West'],[405, 'Barossa - Yorke - Mid North'],[406, 'South Australia - Outback'],[407, 'South Australia - South East'],[497, 'Migratory - Offshore - Shipping (SA)'],[499, 'No usual address (SA)'],[501, 'Bunbury'],[502, 'Mandurah'],[503, 'Perth - Inner'],[504, 'Perth - North East'],[505, 'Perth - North West'],[506, 'Perth - South East'],[507, 'Perth - South West'],[509, 'Western Australia - Wheat Belt'],[510, 'Western Australia - Outback (North)'],[511, 'Western Australia - Outback (South)'],[597, 'Migratory - Offshore - Shipping (WA)'],[599, 'No usual address (WA)'],[601, 'Hobart'],[602, 'Launceston and North East'],[603, 'South East'],[604, 'West and North West'],[697, 'Migratory - Offshore - Shipping (Tas.)'],[699, 'No usual address (Tas.)'],[701, 'Darwin'],[702, 'Northern Territory - Outback'],[797, 'Migratory - Offshore - Shipping (NT)'],[799, 'No usual address (NT)'],[801, 'Australian Capital Territory'],[897, 'Migratory - Offshore - Shipping (ACT)'],[899, 'No usual address (ACT)'],[901, 'Other Territories'],[997, 'Migratory - Offshore - Shipping (OT)'],[999, 'No usual address (OT)']
].map(s => [...s, s[1].toUpperCase().replace(/[^A-Z]/g, '')]);

async function scrape() {
    const csvPath = 'docs/data/air_sa4.csv';
    const jsonPath = 'docs/data/air_sa4.json';

    const url = 'https://www.health.gov.au/sites/default/files/documents/2021/08/covid-19-vaccination-geographic-vaccination-rates-2-august-2021.pdf';
    const {data} = await axios.get(url, {responseType: 'arraybuffer'});

    const {pageTables} = await pdfTableExtractor(data);

    const cleanCell = (s) => {
        return s.replace(/\s+/g, ' ').trim();
    }

    const stream = format({ headers: true });
    
    stream.pipe(fs.createWriteStream(csvPath));

    const rows = [];
    for(const page of pageTables){
        const table = page.tables.map(r => r.map(s => cleanCell(s)));
        // console.log(page)
        // for(const table of page.tables){
            console.log(table)
            const header = table[0].map(s => cleanCell(s));
            if(header.length !== 4){
                continue;
            }

            if(header[0] === 'State' && header[1] === 'Statistical Area 4'){
                for(const r of table){
                    if(r[0] === 'State'){continue;}
                    const sa4 = SA4S.find(s => s[2] === r[1].toUpperCase().replace(/[^A-Z]/g, ''));
                    const sa4pop = sa4Population[sa4[0]];

                    const row = {
                        DATE_AS_AT: '2021-08-01',
                        STATE: stateMap[r[0]] || r[0],
                        SA4_CODE: sa4 ? sa4[0] : '',
                        SA4_NAME: sa4 ? sa4[1] : r[1],
                        AGE_LOWER: 15,
                        AGE_UPPER: 999,
                        AIR_SA4_FIRST_DOSE_PCT: Number(r[2].replace(/[^0-9\.]+/g, '')),
                        AIR_SA4_SECOND_DOSE_PCT: Number(r[3].replace(/[^0-9\.]+/g, '')),
                    }

                    row.AIR_SA4_FIRST_DOSE_APPROX_COUNT = sa4pop ? Math.round(sa4pop.population15plus * (row.AIR_SA4_FIRST_DOSE_PCT/100)) : '';
                    row.AIR_SA4_SECOND_DOSE_APPROX_COUNT = sa4pop ? Math.round(sa4pop.population15plus * (row.AIR_SA4_SECOND_DOSE_PCT/100)) : '';
                    row.ABS_ERP_2019_POPULATION = sa4pop ? sa4pop.population15plus : '';

                    row.VALIDATED = 'Y';
                    row.URL = url;

                    stream.write(row);
                    rows.push(row)
                }
            }
        // }
    }

    stream.end();

    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 4));
    // console.log(pageTables.flatMap(t => t.tables));

    
}

scrape();