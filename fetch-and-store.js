const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const AusDeptHealthVaccinePdf = require('./vaccinepdf');

const PUBLICATION_JSON_PATH = 'docs/data/publications.json';
const PUBLICATION_JSON_DATA_PATH = 'docs/data/';

const getExistingPublications = () => {
    const jsonRaw = fs.existsSync(PUBLICATION_JSON_PATH) ? fs.readFileSync(PUBLICATION_JSON_PATH, {encoding: 'utf8'}) : '{}';
    return _.keyBy(JSON.parse(jsonRaw), 'landingUrl');
}

const validateData = (data) => {
    const shouldNotBeNullLike = [
        'totals.national.total',
        'totals.national.last24hr',
        'totals.cwthAll.total',
        'totals.cwthAll.last24hr',
        'totals.cwthPrimaryCare.total',
        'totals.cwthPrimaryCare.last24hr',
        'totals.cwthAgedCare.total',
        'totals.cwthAgedCare.last24hr',

        'stateClinics.VIC.total',
        'stateClinics.VIC.last24hr',
        'stateClinics.QLD.total',
        'stateClinics.QLD.last24hr',
        'stateClinics.WA.total',
        'stateClinics.WA.last24hr',
        'stateClinics.TAS.total',
        'stateClinics.TAS.last24hr',
        'stateClinics.SA.total',
        'stateClinics.SA.last24hr',
        'stateClinics.ACT.total',
        'stateClinics.ACT.last24hr',
        'stateClinics.NT.total',
        'stateClinics.NT.last24hr',
        'stateClinics.NSW.total',
        'stateClinics.NSW.last24hr',

        'cwthAgedCare.VIC.total',
        'cwthAgedCare.VIC.last24hr',
        'cwthAgedCare.QLD.total',
        'cwthAgedCare.QLD.last24hr',
        'cwthAgedCare.WA.total',
        'cwthAgedCare.WA.last24hr',
        'cwthAgedCare.TAS.total',
        'cwthAgedCare.TAS.last24hr',
        'cwthAgedCare.SA.total',
        'cwthAgedCare.SA.last24hr',
        'cwthAgedCare.ACT.total',
        'cwthAgedCare.ACT.last24hr',
        'cwthAgedCare.NT.total',
        'cwthAgedCare.NT.last24hr',
        'cwthAgedCare.NSW.total',
        'cwthAgedCare.NSW.last24hr',

        'cwthPrimaryCare.VIC.total',
        'cwthPrimaryCare.VIC.last24hr',
        'cwthPrimaryCare.QLD.total',
        'cwthPrimaryCare.QLD.last24hr',
        'cwthPrimaryCare.WA.total',
        'cwthPrimaryCare.WA.last24hr',
        'cwthPrimaryCare.TAS.total',
        'cwthPrimaryCare.TAS.last24hr',
        'cwthPrimaryCare.SA.total',
        'cwthPrimaryCare.SA.last24hr',
        'cwthPrimaryCare.ACT.total',
        'cwthPrimaryCare.ACT.last24hr',
        'cwthPrimaryCare.NT.total',
        'cwthPrimaryCare.NT.last24hr',
        'cwthPrimaryCare.NSW.total',
        'cwthPrimaryCare.NSW.last24hr',

        'cwthAgedCareBreakdown.cwthAgedCareDoses.firstDose',
        'cwthAgedCareBreakdown.cwthAgedCareDoses.secondDose',
        'cwthAgedCareBreakdown.cwthAgedCareFacilities.firstDose',
        'cwthAgedCareBreakdown.cwthAgedCareFacilities.secondDose',
    ]

    let errors = [];
    const logErrorEq = (v1, v2, strict, errorMsg) => (strict ? v1 === v2 : v1 == v2) && errors.push(`${errorMsg} is ${v2}`);
    const logErrorNotEq = (v1, v2, strict, errorMsg) => (strict ? v1 !== v2 : v1 != v2) && errors.push(`${errorMsg} is not ${v2} (${v1})`);
    // const logErrorCond = (condition, errorMsg) => condition && errors.push(errorMsg);

    for(const key of shouldNotBeNullLike){
        logErrorEq(_.get(data, key), null, false, key);
    }

    const states = ['NSW', 'VIC', 'QLD', 'WA', 'TAS', 'SA', 'ACT', 'NT'];

    // sum values
    const statesTotal = states.reduce((runningTotal, state) => _.get(data, `stateClinics.${state}.total`, 0) + runningTotal,0);
    const cwthPrimaryCareTotal = states.reduce((runningTotal, state) => _.get(data, `cwthPrimaryCare.${state}.total`, 0) + runningTotal,0);
    const cwthAgedCareTotal = states.reduce((runningTotal, state) => _.get(data, `cwthAgedCare.${state}.total`, 0) + runningTotal,0);
    logErrorNotEq(cwthPrimaryCareTotal, _.get(data, 'totals.cwthPrimaryCare.total'), true, 'cwthPrimaryCareTotal');
    logErrorNotEq(cwthAgedCareTotal, _.get(data, 'totals.cwthAgedCare.total'), true, 'cwthAgedCareTotal');
    logErrorNotEq(cwthAgedCareTotal + cwthPrimaryCareTotal, _.get(data, 'totals.cwthAll.total'), true, 'cwthPrimaryCareTotal + cwthAgedCareTotal');
    logErrorNotEq(statesTotal + cwthAgedCareTotal + cwthPrimaryCareTotal, _.get(data, 'totals.national.total'), true, 'statesTotal + cwthAgedCareTotal + cwthPrimaryCareTotal');

    if(errors.length){
        console.error(errors)
    }

    return errors;
}

const getPublications = async () => {
    const {data: html} = await axios.get('https://www.health.gov.au/resources/collections/covid-19-vaccine-rollout-updates');
    const $ = cheerio.load(html);
    const items = $(".paragraphs-items-full a").toArray();

    const existingPublications = getExistingPublications();

    const publications = {...existingPublications};
    for(const item of items){
        const $v = $(item);
        const name = $v.text();
        const landingUrl = `https://www.health.gov.au${$v.attr('href')}`;
        
        console.log(`Found "${name}" at ${landingUrl}`);

        if(
            existingPublications[landingUrl] &&
            (existingPublications[landingUrl].validation.length === 0 || existingPublications[landingUrl].exempt)
        ){
            console.log(`Already processed ${landingUrl}`);
            publications[landingUrl] = existingPublications[landingUrl];
            continue;
        }

        const {data: publicationHtml} = await axios.get(landingUrl);
        const $$ = cheerio.load(publicationHtml);
        const pdfUrl = $$("a.health-file__link").attr('href');

        const { data: pdfBuffer } = await axios.get(pdfUrl, {
            responseType: 'arraybuffer'
        });
    
        console.log(`Downloaded PDF: ${pdfUrl}`);
        const vpdf = new AusDeptHealthVaccinePdf();
        const pdfData = await vpdf.parsePdf(pdfBuffer);
        console.log(`Parsed PDF: ${pdfUrl}`);
        const validation = validateData(pdfData);
        console.log(`Validated PDF: ${pdfUrl}`);

        let vaccineDataPath;
        if(!pdfData.dataAsAt){
            validation.push('No date present');
        }else{
            vaccineDataPath = path.join(PUBLICATION_JSON_DATA_PATH, `${pdfData.dataAsAt}.json`);
            fs.writeFileSync(vaccineDataPath, JSON.stringify({success: validation.length === 0, url: pdfUrl, pdfData, validation}, null, 4));
        }

        publications[landingUrl] = {
            name,
            landingUrl,
            pdfUrl,
            vaccineDataPath: `https://vaccinedata.covid19nearme.com.au/${vaccineDataPath.replace("docs/", "")}`,
            validation
        };
    }

    fs.writeFileSync(PUBLICATION_JSON_PATH, JSON.stringify(Object.values(publications), null, 4));
}

getPublications()