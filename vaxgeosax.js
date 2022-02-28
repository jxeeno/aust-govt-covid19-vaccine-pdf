const fs = require('fs');
const { format } = require('@fast-csv/format');
const moment = require('moment');
const path = require('path');
const axios = require('axios');
const pdfTableExtractor = require('./src/pdf-table');
const sa3Population = require('./src/abs/sa3_2019_population');
const sa4Population = require('./src/abs/sa4_2019_population');
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

const SA3S = [
    [10102,"Queanbeyan"],[10103,"Snowy Mountains"],[10104,"South Coast"],[10105,"Goulburn - Mulwaree"],[10106,"Young - Yass"],[10201,"Gosford"],[10202,"Wyong"],[10301,"Bathurst"],[10302,"Lachlan Valley"],[10303,"Lithgow - Mudgee"],[10304,"Orange"],[10401,"Clarence Valley"],[10402,"Coffs Harbour"],[10501,"Bourke - Cobar - Coonamble"],[10502,"Broken Hill and Far West"],[10503,"Dubbo"],[10601,"Lower Hunter"],[10602,"Maitland"],[10603,"Port Stephens"],[10604,"Upper Hunter"],[10701,"Dapto - Port Kembla"],[10702,"Illawarra Catchment Reserve"],[10703,"Kiama - Shellharbour"],[10704,"Wollongong"],[10801,"Great Lakes"],[10802,"Kempsey - Nambucca"],[10803,"Lord Howe Island"],[10804,"Port Macquarie"],[10805,"Taree - Gloucester"],[10901,"Albury"],[10902,"Lower Murray"],[10903,"Upper Murray exc. Albury"],[11001,"Armidale"],[11002,"Inverell - Tenterfield"],[11003,"Moree - Narrabri"],[11004,"Tamworth - Gunnedah"],[11101,"Lake Macquarie - East"],[11102,"Lake Macquarie - West"],[11103,"Newcastle"],[11201,"Richmond Valley - Coastal"],[11202,"Richmond Valley - Hinterland"],[11203,"Tweed Valley"],[11301,"Griffith - Murrumbidgee (West)"],[11302,"Tumut - Tumbarumba"],[11303,"Wagga Wagga"],[11401,"Shoalhaven"],[11402,"Southern Highlands"],[11501,"Baulkham Hills"],[11502,"Dural - Wisemans Ferry"],[11503,"Hawkesbury"],[11504,"Rouse Hill - McGraths Hill"],[11601,"Blacktown"],[11602,"Blacktown - North"],[11603,"Mount Druitt"],[11701,"Botany"],[11702,"Marrickville - Sydenham - Petersham"],[11703,"Sydney Inner City"],[11801,"Eastern Suburbs - North"],[11802,"Eastern Suburbs - South"],[11901,"Bankstown"],[11902,"Canterbury"],[11903,"Hurstville"],[11904,"Kogarah - Rockdale"],[12001,"Canada Bay"],[12002,"Leichhardt"],[12003,"Strathfield - Burwood - Ashfield"],[12101,"Chatswood - Lane Cove"],[12102,"Hornsby"],[12103,"Ku-ring-gai"],[12104,"North Sydney - Mosman"],[12201,"Manly"],[12202,"Pittwater"],[12203,"Warringah"],[12301,"Camden"],[12302,"Campbelltown (NSW)"],[12303,"Wollondilly"],[12401,"Blue Mountains"],[12402,"Blue Mountains - South"],[12403,"Penrith"],[12404,"Richmond - Windsor"],[12405,"St Marys"],[12501,"Auburn"],[12502,"Carlingford"],[12503,"Merrylands - Guildford"],[12504,"Parramatta"],[12601,"Pennant Hills - Epping"],[12602,"Ryde - Hunters Hill"],[12701,"Bringelly - Green Valley"],[12702,"Fairfield"],[12703,"Liverpool"],[12801,"Cronulla - Miranda - Caringbah"],[12802,"Sutherland - Menai - Heathcote"],[19797,"Migratory - Offshore - Shipping (NSW)"],[19999,"No usual address (NSW)"],[20101,"Ballarat"],[20102,"Creswick - Daylesford - Ballan"],[20103,"Maryborough - Pyrenees"],[20201,"Bendigo"],[20202,"Heathcote - Castlemaine - Kyneton"],[20203,"Loddon - Elmore"],[20301,"Barwon - West"],[20302,"Geelong"],[20303,"Surf Coast - Bellarine Peninsula"],[20401,"Upper Goulburn Valley"],[20402,"Wangaratta - Benalla"],[20403,"Wodonga - Alpine"],[20501,"Baw Baw"],[20502,"Gippsland - East"],[20503,"Gippsland - South West"],[20504,"Latrobe Valley"],[20505,"Wellington"],[20601,"Brunswick - Coburg"],[20602,"Darebin - South"],[20603,"Essendon"],[20604,"Melbourne City"],[20605,"Port Phillip"],[20606,"Stonnington - West"],[20607,"Yarra"],[20701,"Boroondara"],[20702,"Manningham - West"],[20703,"Whitehorse - West"],[20801,"Bayside"],[20802,"Glen Eira"],[20803,"Kingston"],[20804,"Stonnington - East"],[20901,"Banyule"],[20902,"Darebin - North"],[20903,"Nillumbik - Kinglake"],[20904,"Whittlesea - Wallan"],[21001,"Keilor"],[21002,"Macedon Ranges"],[21003,"Moreland - North"],[21004,"Sunbury"],[21005,"Tullamarine - Broadmeadows"],[21101,"Knox"],[21102,"Manningham - East"],[21103,"Maroondah"],[21104,"Whitehorse - East"],[21105,"Yarra Ranges"],[21201,"Cardinia"],[21202,"Casey - North"],[21203,"Casey - South"],[21204,"Dandenong"],[21205,"Monash"],[21301,"Brimbank"],[21302,"Hobsons Bay"],[21303,"Maribyrnong"],[21304,"Melton - Bacchus Marsh"],[21305,"Wyndham"],[21401,"Frankston"],[21402,"Mornington Peninsula"],[21501,"Grampians"],[21502,"Mildura"],[21503,"Murray River - Swan Hill"],[21601,"Campaspe"],[21602,"Moira"],[21603,"Shepparton"],[21701,"Glenelg - Southern Grampians"],[21703,"Colac - Corangamite"],[21704,"Warrnambool"],[29797,"Migratory - Offshore - Shipping (Vic.)"],[29999,"No usual address (Vic.)"],[30101,"Capalaba"],[30102,"Cleveland - Stradbroke"],[30103,"Wynnum - Manly"],[30201,"Bald Hills - Everton Park"],[30202,"Chermside"],[30203,"Nundah"],[30204,"Sandgate"],[30301,"Carindale"],[30302,"Holland Park - Yeronga"],[30303,"Mt Gravatt"],[30304,"Nathan"],[30305,"Rocklea - Acacia Ridge"],[30306,"Sunnybank"],[30401,"Centenary"],[30402,"Kenmore - Brookfield - Moggill"],[30403,"Sherwood - Indooroopilly"],[30404,"The Gap - Enoggera"],[30501,"Brisbane Inner"],[30502,"Brisbane Inner - East"],[30503,"Brisbane Inner - North"],[30504,"Brisbane Inner - West"],[30601,"Cairns - North"],[30602,"Cairns - South"],[30603,"Innisfail - Cassowary Coast"],[30604,"Port Douglas - Daintree"],[30605,"Tablelands (East) - Kuranda"],[30701,"Darling Downs (West) - Maranoa"],[30702,"Darling Downs - East"],[30703,"Granite Belt"],[30801,"Central Highlands (Qld)"],[30803,"Rockhampton"],[30804,"Biloela"],[30805,"Gladstone"],[30901,"Broadbeach - Burleigh"],[30902,"Coolangatta"],[30903,"Gold Coast - North"],[30904,"Gold Coast Hinterland"],[30905,"Mudgeeraba - Tallebudgera"],[30906,"Nerang"],[30907,"Ormeau - Oxenford"],[30908,"Robina"],[30909,"Southport"],[30910,"Surfers Paradise"],[31001,"Forest Lake - Oxley"],[31002,"Ipswich Hinterland"],[31003,"Ipswich Inner"],[31004,"Springfield - Redbank"],[31101,"Beaudesert"],[31102,"Beenleigh"],[31103,"Browns Plains"],[31104,"Jimboomba"],[31105,"Loganlea - Carbrook"],[31106,"Springwood - Kingston"],[31201,"Bowen Basin - North"],[31202,"Mackay"],[31203,"Whitsunday"],[31301,"Bribie - Beachmere"],[31302,"Caboolture"],[31303,"Caboolture Hinterland"],[31304,"Narangba - Burpengary"],[31305,"Redcliffe"],[31401,"The Hills District"],[31402,"North Lakes"],[31403,"Strathpine"],[31501,"Far North"],[31502,"Outback - North"],[31503,"Outback - South"],[31601,"Buderim"],[31602,"Caloundra"],[31603,"Maroochy"],[31605,"Noosa"],[31606,"Sunshine Coast Hinterland"],[31607,"Nambour"],[31608,"Noosa Hinterland"],[31701,"Toowoomba"],[31801,"Charters Towers - Ayr - Ingham"],[31802,"Townsville"],[31901,"Bundaberg"],[31902,"Burnett"],[31903,"Gympie - Cooloola"],[31904,"Hervey Bay"],[31905,"Maryborough"],[39797,"Migratory - Offshore - Shipping (Qld)"],[39999,"No usual address (Qld)"],[40101,"Adelaide City"],[40102,"Adelaide Hills"],[40103,"Burnside"],[40104,"Campbelltown (SA)"],[40105,"Norwood - Payneham - St Peters"],[40106,"Prospect - Walkerville"],[40107,"Unley"],[40201,"Gawler - Two Wells"],[40202,"Playford"],[40203,"Port Adelaide - East"],[40204,"Salisbury"],[40205,"Tea Tree Gully"],[40301,"Holdfast Bay"],[40302,"Marion"],[40303,"Mitcham"],[40304,"Onkaparinga"],[40401,"Charles Sturt"],[40402,"Port Adelaide - West"],[40403,"West Torrens"],[40501,"Barossa"],[40502,"Lower North"],[40503,"Mid North"],[40504,"Yorke Peninsula"],[40601,"Eyre Peninsula and South West"],[40602,"Outback - North and East"],[40701,"Fleurieu - Kangaroo Island"],[40702,"Limestone Coast"],[40703,"Murray and Mallee"],[49797,"Migratory - Offshore - Shipping (SA)"],[49999,"No usual address (SA)"],[50101,"Augusta - Margaret River - Busselton"],[50102,"Bunbury"],[50103,"Manjimup"],[50201,"Mandurah"],[50301,"Cottesloe - Claremont"],[50302,"Perth City"],[50401,"Bayswater - Bassendean"],[50402,"Mundaring"],[50403,"Swan"],[50501,"Joondalup"],[50502,"Stirling"],[50503,"Wanneroo"],[50601,"Armadale"],[50602,"Belmont - Victoria Park"],[50603,"Canning"],[50604,"Gosnells"],[50605,"Kalamunda"],[50606,"Serpentine - Jarrahdale"],[50607,"South Perth"],[50701,"Cockburn"],[50702,"Fremantle"],[50703,"Kwinana"],[50704,"Melville"],[50705,"Rockingham"],[50901,"Albany"],[50902,"Wheat Belt - North"],[50903,"Wheat Belt - South"],[51001,"Kimberley"],[51002,"East Pilbara"],[51003,"West Pilbara"],[51101,"Esperance"],[51102,"Gascoyne"],[51103,"Goldfields"],[51104,"Mid West"],[59797,"Migratory - Offshore - Shipping (WA)"],[59999,"No usual address (WA)"],[60101,"Brighton"],[60102,"Hobart - North East"],[60103,"Hobart - North West"],[60104,"Hobart - South and West"],[60105,"Hobart Inner"],[60106,"Sorell - Dodges Ferry"],[60201,"Launceston"],[60202,"Meander Valley - West Tamar"],[60203,"North East"],[60301,"Central Highlands (Tas.)"],[60302,"Huon - Bruny Island"],[60303,"South East Coast"],[60401,"Burnie - Ulverstone"],[60402,"Devonport"],[60403,"West Coast"],[69797,"Migratory - Offshore - Shipping (Tas.)"],[69999,"No usual address (Tas.)"],[70101,"Darwin City"],[70102,"Darwin Suburbs"],[70103,"Litchfield"],[70104,"Palmerston"],[70201,"Alice Springs"],[70202,"Barkly"],[70203,"Daly - Tiwi - West Arnhem"],[70204,"East Arnhem"],[70205,"Katherine"],[79797,"Migratory - Offshore - Shipping (NT)"],[79999,"No usual address (NT)"],[80101,"Belconnen"],[80103,"Canberra East"],[80104,"Gungahlin"],[80105,"North Canberra"],[80106,"South Canberra"],[80107,"Tuggeranong"],[80108,"Weston Creek"],[80109,"Woden Valley"],[80110,"Molonglo"],[80111,"Urriarra - Namadgi"],[89797,"Migratory - Offshore - Shipping (ACT)"],[89999,"No usual address (ACT)"],[90101,"Christmas Island"],[90102,"Cocos (Keeling) Islands"],[90103,"Jervis Bay"],[90104,"Norfolk Island"],[99797,"Migratory - Offshore - Shipping (OT)"],[99999,"No usual address (OT)"]
].map(s => [...s, s[1].toUpperCase().replace(/[^A-Z]/g, '')]);

const SA4S = [
    [101, 'Capital Region'],[102, 'Central Coast'],[103, 'Central West'],[104, 'Coffs Harbour - Grafton'],[105, 'Far West and Orana'],[106, 'Hunter Valley exc Newcastle'],[107, 'Illawarra'],[108, 'Mid North Coast'],[109, 'Murray'],[110, 'New England and North West'],[111, 'Newcastle and Lake Macquarie'],[112, 'Richmond - Tweed'],[113, 'Riverina'],[114, 'Southern Highlands and Shoalhaven'],[115, 'Sydney - Baulkham Hills and Hawkesbury'],[116, 'Sydney - Blacktown'],[117, 'Sydney - City and Inner South'],[118, 'Sydney - Eastern Suburbs'],[119, 'Sydney - Inner South West'],[120, 'Sydney - Inner West'],[121, 'Sydney - North Sydney and Hornsby'],[122, 'Sydney - Northern Beaches'],[123, 'Sydney - Outer South West'],[124, 'Sydney - Outer West and Blue Mountains'],[125, 'Sydney - Parramatta'],[126, 'Sydney - Ryde'],[127, 'Sydney - South West'],[128, 'Sydney - Sutherland'],[197, 'Migratory - Offshore - Shipping (NSW)'],[199, 'No usual address (NSW)'],[201, 'Ballarat'],[202, 'Bendigo'],[203, 'Geelong'],[204, 'Hume'],[205, 'Latrobe - Gippsland'],[206, 'Melbourne - Inner'],[207, 'Melbourne - Inner East'],[208, 'Melbourne - Inner South'],[209, 'Melbourne - North East'],[210, 'Melbourne - North West'],[211, 'Melbourne - Outer East'],[212, 'Melbourne - South East'],[213, 'Melbourne - West'],[214, 'Mornington Peninsula'],[215, 'North West'],[216, 'Shepparton'],[217, 'Warrnambool and South West'],[297, 'Migratory - Offshore - Shipping (Vic.)'],[299, 'No usual address (Vic.)'],[301, 'Brisbane - East'],[302, 'Brisbane - North'],[303, 'Brisbane - South'],[304, 'Brisbane - West'],[305, 'Brisbane Inner City'],[306, 'Cairns'],[307, 'Darling Downs - Maranoa'],[308, 'Central Queensland'],[309, 'Gold Coast'],[310, 'Ipswich'],[311, 'Logan - Beaudesert'],[312, 'Mackay - Isaac - Whitsunday'],[313, 'Moreton Bay - North'],[314, 'Moreton Bay - South'],[315, 'Queensland - Outback'],[316, 'Sunshine Coast'],[317, 'Toowoomba'],[318, 'Townsville'],[319, 'Wide Bay'],[397, 'Migratory - Offshore - Shipping (Qld)'],[399, 'No usual address (Qld)'],[401, 'Adelaide - Central and Hills'],[402, 'Adelaide - North'],[403, 'Adelaide - South'],[404, 'Adelaide - West'],[405, 'Barossa - Yorke - Mid North'],[406, 'South Australia - Outback'],[407, 'South Australia - South East'],[497, 'Migratory - Offshore - Shipping (SA)'],[499, 'No usual address (SA)'],[501, 'Bunbury'],[502, 'Mandurah'],[503, 'Perth - Inner'],[504, 'Perth - North East'],[505, 'Perth - North West'],[506, 'Perth - South East'],[507, 'Perth - South West'],[509, 'Western Australia - Wheat Belt'],[510, 'Western Australia - Outback (North)'],[511, 'Western Australia - Outback (South)'],[597, 'Migratory - Offshore - Shipping (WA)'],[599, 'No usual address (WA)'],[601, 'Hobart'],[602, 'Launceston and North East'],[603, 'South East'],[604, 'West and North West'],[697, 'Migratory - Offshore - Shipping (Tas.)'],[699, 'No usual address (Tas.)'],[701, 'Darwin'],[702, 'Northern Territory - Outback'],[797, 'Migratory - Offshore - Shipping (NT)'],[799, 'No usual address (NT)'],[801, 'Australian Capital Territory'],[897, 'Migratory - Offshore - Shipping (ACT)'],[899, 'No usual address (ACT)'],[901, 'Other Territories'],[997, 'Migratory - Offshore - Shipping (OT)'],[999, 'No usual address (OT)']
].map(s => [...s, s[1].toUpperCase().replace(/[^A-Z]/g, '')]);

const getDataFrom12WeeksAgo = (asAt, aggSuffix) => {
    const oldDate = moment(asAt).subtract(12, 'weeks').format('YYYY-MM-DD');
    const oldDataFname = path.join(__dirname, `./docs/data/geo/${oldDate}.${aggSuffix}.json`);
    if(fs.existsSync(oldDataFname)){
        return JSON.parse(fs.readFileSync(oldDataFname))
    }
}

async function scrapeSAX(data, aggLevel, url) {
    // const csvPath = 'docs/data/geo/air_sa3.new.csv';
    // const jsonPath = 'docs/data/geo/air_sa3.new.json';

    // const url = 'https://www.health.gov.au/sites/default/files/documents/2021/08/covid-19-vaccination-geographic-vaccination-rates-9-august-2021.pdf'; // 'https://www.health.gov.au/sites/default/files/documents/2021/08/covid-19-vaccination-geographic-vaccination-rates-2-august-2021.pdf';
    // const {data} = await axios.get(url, {responseType: 'arraybuffer'});

    let AGGS;
    let aggPopulation;
    let headerCell;
    let aggSuffix;
    if(aggLevel === 'ASGS_2016_SA3'){
        AGGS = SA3S;
        aggPopulation = sa3Population
        headerCell = 'Statistical Area 3';
        aggSuffix = 'sa3'
    }else if(aggLevel === 'ASGS_2016_SA4'){
        AGGS = SA4S;
        aggPopulation = sa4Population
        headerCell = 'Statistical Area 4';
        aggSuffix = 'sa4'
    }

    // const data = fs.readFileSync('(Vaccines) SA3 breakdown.pdf')
    // const data = fs.readFileSync('SA4 Slide Deck_2021-09-20.pdf')
    const asAt = await getDataAsAt(data);

    const {pageTables} = await pdfTableExtractor(data);

    const cleanCell = (s) => {
        return s.replace(/\s+/g, ' ').trim();
    }

    const boosterEligibleData = getDataFrom12WeeksAgo(asAt, aggSuffix);

    // const stream = format({ headers: true });
    
    // stream.pipe(fs.createWriteStream(csvPath));

    const rows = [];
    for(const page of pageTables){
        const table = page.tables.map(r => r.map(s => cleanCell(s)));
        // console.log(page)
        // for(const table of page.tables){
            // console.log(table)
            const header = table[0].map(s => cleanCell(s));
            if(header.length <= 4){
                continue;
            }

            const hasBooster = !!header[4].match(/more\s*than\s*2\s*doses/);

            if(header[0] === 'State' && header[1] === headerCell){
                for(const r of table){
                    if(r[0] === 'State'){continue;}
                    const agg = AGGS.find(s => s[2] === r[1].toUpperCase().replace(/[^A-Z]/g, ''));

                    if(!agg){
                        console.log(r)
                    }

                    const aggpop = agg[0] ? aggPopulation[agg[0]] : null;

                    const row = {
                        DATE_AS_AT: asAt,
                        AGG_LEVEL: aggLevel,
                        STATE: stateMap[r[0]] || r[0],
                        ABS_CODE: agg ? agg[0] : '',
                        ABS_NAME: agg ? agg[1] : r[1],
                        AGE_LOWER: 15,
                        AGE_UPPER: 999,
                        AIR_FIRST_DOSE_PCT: Number(r[2].replace(/[^0-9\.]+/g, '')),
                        AIR_SECOND_DOSE_PCT: Number(r[3].replace(/[^0-9\.]+/g, '')),
                        AIR_THIRD_DOSE_ELIGIBLE_PCT: hasBooster ? Number(r[4].replace(/[^0-9\.]+/g, '')) : undefined
                    }

                    const oldRow = hasBooster && boosterEligibleData ? boosterEligibleData.pdfData.rows.find(or => or.ABS_CODE === row.ABS_CODE) : undefined;
                    const secondDose12Weeks = oldRow ? oldRow.AIR_SECOND_DOSE_APPROX_COUNT : undefined;

                    row.AIR_THIRD_DOSE_PCT = aggpop && secondDose12Weeks ? Math.round((secondDose12Weeks * (row.AIR_THIRD_DOSE_ELIGIBLE_PCT/100)) / aggpop.population15plus * 1000) / 10 : undefined;
                    row.AIR_FIRST_DOSE_APPROX_COUNT = aggpop ? Math.round(aggpop.population15plus * (row.AIR_FIRST_DOSE_PCT/100)) : '';
                    row.AIR_SECOND_DOSE_APPROX_COUNT = aggpop ? Math.round(aggpop.population15plus * (row.AIR_SECOND_DOSE_PCT/100)) : '';
                    row.AIR_THIRD_DOSE_APPROX_COUNT = secondDose12Weeks ? Math.round(secondDose12Weeks * (row.AIR_THIRD_DOSE_ELIGIBLE_PCT/100)) : '';
                    row.ABS_ERP_2019_POPULATION = aggpop ? aggpop.population15plus : '';

                    row.VALIDATED = 'Y';
                    // row.URL = url; // 'https://www.health.gov.au/sites/default/files/documents/2021/09/covid-19-vaccination-geographic-vaccination-rates-19-september-2021.pdf';

                    // stream.write(row);
                    rows.push(row)
                }
            }
        // }
    }

    // stream.end();

    // fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 4));

    return {
        dataAsAt: asAt,
        rows
    }
    // console.log(pageTables.flatMap(t => t.tables));

    
}

// scrape('ASGS_2016_SA3');

module.exports = scrapeSAX;