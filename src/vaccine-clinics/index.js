const axios = require('axios');
const lodash = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { format } = require('@fast-csv/format');

const fetchApiKey = async () => {
    const {data} = await axios.get('https://widget.nhsd.healthdirect.org.au/v1/widget/search/detail?widgetId=598d4f8a-9f53-484e-9758-d066f20fb68b');
    const apiKeyMatches = data.match(/"nhsdApiKey":"([^"]+)"/);
    if(apiKeyMatches){
        console.log(`Found api key ${apiKeyMatches[1]}`)
        return apiKeyMatches[1]
    }
}

const NHSD_ENDPOINT = 'https://api.nhsd.healthdirect.org.au/v51/healthcareServices/_search';
const PAGE_SIZE = 50;
const CLINICS_DATA_DIR = 'docs/clinics';

const fetchVaccineClinicPage = async (apikey, page) => {
    console.log(`Fetching clinics - page ${page}`);
    const {data} = await axios.get(NHSD_ENDPOINT, {
        headers: {
            'x-api-key': apikey
        },
        params: {
            'requestContext.serviceDeliveryMethod': 'PHYSICAL',
            'filter.serviceType.codes': 'nhsd:/reference/taxonomies/snomed-servicetype/1238911000168108',
            'filter.programs.codes': 'nhsd:/reference/common/program/covid19VaccineService',
            'responseControl.offset': page*PAGE_SIZE,
            'responseControl.limit': PAGE_SIZE
        }
    });

    const services = lodash.get(data, '_embedded.healthcareServices');
    const hasNextPage = data.count > (page+1)*PAGE_SIZE;

    console.log(`Total ${data.count}`);

    return {services, hasNextPage};
}

const fetchAllClinics = async () => {
    const startTime = moment().tz('Australia/Sydney');

    const apikey = await fetchApiKey();
    let page = 0;
    let end = false;

    const rows = [];
    while(!end){
        const results = await fetchVaccineClinicPage(apikey, page);
        rows.push(...results.services);
        page++

        if(!results.hasNextPage){
            end = true;
        }
    }

    console.log(`Total ${rows.length} entries`);

    rows.sort((a, b) => a.id.localeCompare(b.id));

    const MONTH_DIR = path.join(CLINICS_DATA_DIR, 'daily', startTime.format('YYYY-MM'));
    const LATEST_DIR = path.join(CLINICS_DATA_DIR, 'latest');

    const DAILY_FILE_PREFIX = path.join(MONTH_DIR, startTime.format('YYYY-MM-DD'));
    const LATEST_FILE_PREFIX = path.join(LATEST_DIR, 'latest');
    if(!fs.existsSync(MONTH_DIR)){
        fs.mkdirSync(MONTH_DIR);
    }

    const rawJSON = JSON.stringify({services: rows, date: startTime.toISOString()});
    fs.writeFileSync(`${DAILY_FILE_PREFIX}-raw.json`, rawJSON);
    fs.writeFileSync(`${LATEST_FILE_PREFIX}-raw.json`, rawJSON);

    const csvData = toCSV(rows, startTime);
    const csvJSON = JSON.stringify(csvData);

    fs.writeFileSync(`${DAILY_FILE_PREFIX}-simplified.json`, csvJSON);
    fs.writeFileSync(`${LATEST_FILE_PREFIX}-simplified.json`, csvJSON);

    const stream = format({ headers: true });
    stream.pipe(fs.createWriteStream(`${DAILY_FILE_PREFIX}-simplified.csv`)).on('finish', () => {
        fs.copyFileSync(`${DAILY_FILE_PREFIX}-simplified.csv`, `${LATEST_FILE_PREFIX}-simplified.csv`);
        process.exit()
    });

    for(const row of csvData){
        stream.write(row);
    }

    stream.end();
}

const toCSV = (rows, startTime) => {
    const flattenValueType = (arr, def) => {
        if(arr && Array.isArray(arr)){
            return arr.map(v => v.valueType.label).join(', ');
        }

        return def
    }

    return rows.map(row => {
        const data = {
            id: row.id,
            orgId: row.organisation.id,
            orgName: row.organisation.name,
            contactPhone: lodash.get(row.contacts.find(contact => contact.valueType.idRef === 'nhsd:/reference/common/contactType/phone'), 'value'),
            contactWebsite: lodash.get(row.contacts.find(contact => contact.valueType.idRef === 'nhsd:/reference/common/contactType/website'), 'value'),
            characteristic: flattenValueType(row.characteristics, 'Unknown'),
            appointments: flattenValueType(row.appointments, 'Unknown'),
            offerings: flattenValueType(row.offerings, 'Unknown'),
            billingOptions: flattenValueType(row.billingOptions, 'Unknown'),
            booking: flattenValueType(row.bookingProviders, 'Unknown'),
            addressLine1: lodash.get(row, 'location.physicalLocation.addressLine1'),
            addressLine2: lodash.get(row, 'location.physicalLocation.addressLine2'),
            addressLine3: lodash.get(row, 'location.physicalLocation.addressLine3'),
            postcode: lodash.get(row, 'location.physicalLocation.postcode'),
            suburb: lodash.get(row, 'location.physicalLocation.suburb.label'),
            state: lodash.get(row, 'location.physicalLocation.state.label'),
            lat: lodash.get(row, 'location.physicalLocation.geocode.latitude'),
            lon: lodash.get(row, 'location.physicalLocation.geocode.longitude'),
            updatedTime: lodash.get(row, '_metadata.updatedTime'),
            dateAsAt: startTime.format('YYYY-MM-DD'),
        };

        return data;
    })
}

fetchAllClinics();