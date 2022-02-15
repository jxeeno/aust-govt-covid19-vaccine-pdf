const rax = require('retry-axios');
const axios = require('axios');
const lodash = require('lodash');
const fs = require('fs');
const turf = require('@turf/turf');
const path = require('path');
const moment = require('moment-timezone');
const { format } = require('@fast-csv/format');
const augeojson = require('./ausgeojson');

rax.attach();

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

const fetchVaccineClinicPage = async (apikey, state, page) => {
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
            'responseControl.limit': PAGE_SIZE,
            'location.proximity.near_distance': 300000,
            'location.proximity.near': state
            // 'location.physicalLocation.stateDrIdRef': `nhsd:/reference/geo/AUS.states/${state}`
        }
    });

    const services = lodash.get(data, '_embedded.healthcareServices', []);
    const hasNextPage = lodash.get(data, 'count', 0) > (page+1)*PAGE_SIZE;

    console.log(`Total ${lodash.get(data, 'count', 'unknown')}`);

    return {services, hasNextPage};
}

const fetchAllClinics = async () => {
    const startTime = moment().tz('Australia/Sydney');

    const apikey = await fetchApiKey();

    const grid = turf.pointGrid([
        112.1044921875,
        -44.11914151643736,
        154.46777343749997,
        -9.44906182688142
    ], 250, {units: 'kilometers', mask: augeojson});

    const rowMap = new Map();
    const states = grid.features.map(v => [v.geometry.coordinates[1], v.geometry.coordinates[0]].join(',')); // ['-33.8697,151.2099', '-37.821666,144.978547', '-27.466098,153.029997', '-16.9233991,145.773851', '-23.698042,133.880747', '-12.4633,130.8434', '-34.92869,138.60102', '-42.882138,147.327195', '-31.99212,115.763228'];

    for(const state of states){
        let page = 0;
        let end = false;
        while(!end){
            const results = await fetchVaccineClinicPage(apikey, state, page);
            for(const service of results.services){
                rowMap.set(service.id, service);
            }
            page++

            if(!results.hasNextPage){
                end = true;
            }
            
            if(page >= 200){
                console.error('Max 200 page reached');
                end = true;
            }
        }
    }

    const rows = [...rowMap.values()];
    console.log(`Total ${rows.length} entries`);

    rows.sort((a, b) => a.id.localeCompare(b.id));

    // const MONTH_DIR = path.join(CLINICS_DATA_DIR, 'daily', startTime.format('YYYY-MM'));
    const LATEST_DIR = path.join(CLINICS_DATA_DIR, 'latest');

    // const DAILY_FILE_PREFIX = path.join(MONTH_DIR, startTime.format('YYYY-MM-DD'));
    const LATEST_FILE_PREFIX = path.join(LATEST_DIR, 'latest');
    // if(!fs.existsSync(MONTH_DIR)){
    //     fs.mkdirSync(MONTH_DIR);
    // }

    const perPage = Math.floor(rows.length/2);

    const rawJSON1 = JSON.stringify({services: rows.slice(0, perPage), date: startTime.toISOString()});
    // fs.writeFileSync(`${DAILY_FILE_PREFIX}-raw.json`, rawJSON);
    fs.writeFileSync(`${LATEST_FILE_PREFIX}-raw.json`, rawJSON1);

    const rawJSON2 = JSON.stringify({services: rows.slice(perPage), date: startTime.toISOString()});
    fs.writeFileSync(`${LATEST_FILE_PREFIX}-raw-2.json`, rawJSON2);

    const csvData = toCSV(rows, startTime);
    const csvJSON = JSON.stringify(csvData);

    // fs.writeFileSync(`${DAILY_FILE_PREFIX}-simplified.json`, csvJSON);
    fs.writeFileSync(`${LATEST_FILE_PREFIX}-simplified.json`, csvJSON);

    const stream = format({ headers: true });
    stream.pipe(fs.createWriteStream(`${LATEST_FILE_PREFIX}-simplified.csv`)).on('finish', () => {
        // fs.copyFileSync(`${DAILY_FILE_PREFIX}-simplified.csv`, `${LATEST_FILE_PREFIX}-simplified.csv`);
        process.exit()
    });

    for(const row of csvData){
        stream.write(row);
    }

    stream.end();
}

const toCSV = (rows, startTime) => {
    const flattenValueType = (arr, def, path = 'valueType.label') => {
        if(arr && Array.isArray(arr)){
            const resolvedValues = arr.map(v => lodash.get(v, path)).filter(v => v != null);
            if(resolvedValues.length>0){
                return resolvedValues.join(', ');
            }
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
            bookingUrls: flattenValueType(row.bookingProviders, undefined, 'value'),
            description: lodash.get(row, 'description'),
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
