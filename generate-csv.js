const fs = require('fs');
const _ = require('lodash');
const { format } = require('@fast-csv/format');

const PUBLICATION_JSON_PATH = 'docs/data/publications.json';
const DATA_CSV_PATH = 'docs/data/all.csv';
const DATA_JSON_PATH = 'docs/data/all.json';

const DISTRIBUTION_DATA_CSV_PATH = 'docs/data/distribution.csv';
const DISTRIBUTION_DATA_JSON_PATH = 'docs/data/distribution.json';

const PUBLICATION_JSON_DATA_PATH = 'docs/data/';
const SECOND_DOSE_PUBLICATION_JSON_DATA_PATH = 'docs/wahealth/';

// population data based on https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/sep-2020#data-download
// The eligible population is calculated as all people ages 16 or older
const STATE_16_OVER_POPULATIONS = {
    NSW: 8167532 - 1601881,
    VIC: 6696670 - 1289096,
    QLD: 5176186 - 1063479,
    SA: 1770375 - 329975,
    WA: 2663561 - 548583,
    TAS: 540780 - 100608,
    NT: 246143 - 55572,
    ACT: 431380 - 87343
}

const COLUMN_TO_PATH_MAPPING = {
    DATE_AS_AT: 'dataAsAt',
    TOTALS_NATIONAL_TOTAL: 'totals.national.total',
    TOTALS_NATIONAL_LAST_24HR: 'totals.national.last24hr',
    TOTALS_CWTH_ALL_TOTAL: 'totals.cwthAll.total',
    TOTALS_CWTH_ALL_LAST_24HR: 'totals.cwthAll.last24hr',
    TOTALS_CWTH_PRIMARY_CARE_TOTAL: 'totals.cwthPrimaryCare.total',
    TOTALS_CWTH_PRIMARY_CARE_LAST_24HR: 'totals.cwthPrimaryCare.last24hr',
    TOTALS_CWTH_AGED_CARE_TOTAL: 'totals.cwthAgedCare.total',
    TOTALS_CWTH_AGED_CARE_LAST_24HR: 'totals.cwthAgedCare.last24hr',
    STATE_CLINICS_VIC_TOTAL: 'stateClinics.VIC.total',
    STATE_CLINICS_VIC_LAST_24HR: 'stateClinics.VIC.last24hr',
    STATE_CLINICS_QLD_TOTAL: 'stateClinics.QLD.total',
    STATE_CLINICS_QLD_LAST_24HR: 'stateClinics.QLD.last24hr',
    STATE_CLINICS_WA_TOTAL: 'stateClinics.WA.total',
    STATE_CLINICS_WA_LAST_24HR: 'stateClinics.WA.last24hr',
    STATE_CLINICS_TAS_TOTAL: 'stateClinics.TAS.total',
    STATE_CLINICS_TAS_LAST_24HR: 'stateClinics.TAS.last24hr',
    STATE_CLINICS_SA_TOTAL: 'stateClinics.SA.total',
    STATE_CLINICS_SA_LAST_24HR: 'stateClinics.SA.last24hr',
    STATE_CLINICS_ACT_TOTAL: 'stateClinics.ACT.total',
    STATE_CLINICS_ACT_LAST_24HR: 'stateClinics.ACT.last24hr',
    STATE_CLINICS_NT_TOTAL: 'stateClinics.NT.total',
    STATE_CLINICS_NT_LAST_24HR: 'stateClinics.NT.last24hr',
    STATE_CLINICS_NSW_TOTAL: 'stateClinics.NSW.total',
    STATE_CLINICS_NSW_LAST_24HR: 'stateClinics.NSW.last24hr',
    CWTH_AGED_CARE_VIC_TOTAL: 'cwthAgedCare.VIC.total',
    CWTH_AGED_CARE_VIC_LAST_24HR: 'cwthAgedCare.VIC.last24hr',
    CWTH_AGED_CARE_QLD_TOTAL: 'cwthAgedCare.QLD.total',
    CWTH_AGED_CARE_QLD_LAST_24HR: 'cwthAgedCare.QLD.last24hr',
    CWTH_AGED_CARE_WA_TOTAL: 'cwthAgedCare.WA.total',
    CWTH_AGED_CARE_WA_LAST_24HR: 'cwthAgedCare.WA.last24hr',
    CWTH_AGED_CARE_TAS_TOTAL: 'cwthAgedCare.TAS.total',
    CWTH_AGED_CARE_TAS_LAST_24HR: 'cwthAgedCare.TAS.last24hr',
    CWTH_AGED_CARE_SA_TOTAL: 'cwthAgedCare.SA.total',
    CWTH_AGED_CARE_SA_LAST_24HR: 'cwthAgedCare.SA.last24hr',
    CWTH_AGED_CARE_ACT_TOTAL: 'cwthAgedCare.ACT.total',
    CWTH_AGED_CARE_ACT_LAST_24HR: 'cwthAgedCare.ACT.last24hr',
    CWTH_AGED_CARE_NT_TOTAL: 'cwthAgedCare.NT.total',
    CWTH_AGED_CARE_NT_LAST_24HR: 'cwthAgedCare.NT.last24hr',
    CWTH_AGED_CARE_NSW_TOTAL: 'cwthAgedCare.NSW.total',
    CWTH_AGED_CARE_NSW_LAST_24HR: 'cwthAgedCare.NSW.last24hr',
    CWTH_PRIMARY_CARE_VIC_TOTAL: 'cwthPrimaryCare.VIC.total',
    CWTH_PRIMARY_CARE_VIC_LAST_24HR: 'cwthPrimaryCare.VIC.last24hr',
    CWTH_PRIMARY_CARE_QLD_TOTAL: 'cwthPrimaryCare.QLD.total',
    CWTH_PRIMARY_CARE_QLD_LAST_24HR: 'cwthPrimaryCare.QLD.last24hr',
    CWTH_PRIMARY_CARE_WA_TOTAL: 'cwthPrimaryCare.WA.total',
    CWTH_PRIMARY_CARE_WA_LAST_24HR: 'cwthPrimaryCare.WA.last24hr',
    CWTH_PRIMARY_CARE_TAS_TOTAL: 'cwthPrimaryCare.TAS.total',
    CWTH_PRIMARY_CARE_TAS_LAST_24HR: 'cwthPrimaryCare.TAS.last24hr',
    CWTH_PRIMARY_CARE_SA_TOTAL: 'cwthPrimaryCare.SA.total',
    CWTH_PRIMARY_CARE_SA_LAST_24HR: 'cwthPrimaryCare.SA.last24hr',
    CWTH_PRIMARY_CARE_ACT_TOTAL: 'cwthPrimaryCare.ACT.total',
    CWTH_PRIMARY_CARE_ACT_LAST_24HR: 'cwthPrimaryCare.ACT.last24hr',
    CWTH_PRIMARY_CARE_NT_TOTAL: 'cwthPrimaryCare.NT.total',
    CWTH_PRIMARY_CARE_NT_LAST_24HR: 'cwthPrimaryCare.NT.last24hr',
    CWTH_PRIMARY_CARE_NSW_TOTAL: 'cwthPrimaryCare.NSW.total',
    CWTH_PRIMARY_CARE_NSW_LAST_24HR: 'cwthPrimaryCare.NSW.last24hr',
    CWTH_AGED_CARE_DOSES_FIRST_DOSE: 'cwthAgedCareBreakdown.cwthAgedCareDoses.firstDose',
    CWTH_AGED_CARE_DOSES_SECOND_DOSE: 'cwthAgedCareBreakdown.cwthAgedCareDoses.secondDose',
    CWTH_AGED_CARE_FACILITIES_FIRST_DOSE: 'cwthAgedCareBreakdown.cwthAgedCareFacilities.firstDose',
    CWTH_AGED_CARE_FACILITIES_SECOND_DOSE: 'cwthAgedCareBreakdown.cwthAgedCareFacilities.secondDose',

    APPROX_VIC_SECOND_DOSE_TOTAL: 'secondDoseData.VIC',
    APPROX_QLD_SECOND_DOSE_TOTAL: 'secondDoseData.QLD',
    APPROX_WA_SECOND_DOSE_TOTAL: 'secondDoseData.WA',
    APPROX_TAS_SECOND_DOSE_TOTAL: 'secondDoseData.TAS',
    APPROX_SA_SECOND_DOSE_TOTAL: 'secondDoseData.SA',
    APPROX_ACT_SECOND_DOSE_TOTAL: 'secondDoseData.ACT',
    APPROX_NT_SECOND_DOSE_TOTAL: 'secondDoseData.NT',
    APPROX_NSW_SECOND_DOSE_TOTAL: 'secondDoseData.NSW',
}

const DISTRIBUTION_COLUMN_TO_PATH_MAPPING = {
    DATE_AS_AT: 'dataAsAt',
    STATE_CLINICS_VIC_DISTRIBUTED: "distribution.VIC.distributed",
    STATE_CLINICS_QLD_DISTRIBUTED: "distribution.QLD.distributed",
    STATE_CLINICS_WA_DISTRIBUTED: "distribution.WA.distributed",
    STATE_CLINICS_TAS_DISTRIBUTED: "distribution.TAS.distributed",
    STATE_CLINICS_SA_DISTRIBUTED: "distribution.SA.distributed",
    STATE_CLINICS_ACT_DISTRIBUTED: "distribution.ACT.distributed",
    STATE_CLINICS_NT_DISTRIBUTED: "distribution.NT.distributed",
    STATE_CLINICS_NSW_DISTRIBUTED: "distribution.NSW.distributed",
    CWTH_AGED_CARE_DISTRIBUTED: "distribution.cwthAgedCare.distributed",
    CWTH_PRIMARY_CARE_DISTRIBUTED: "distribution.cwthPrimaryCare.distributed",
    STATE_CLINICS_VIC_AVAILABLE: "distribution.VIC.available",
    STATE_CLINICS_QLD_AVAILABLE: "distribution.QLD.available",
    STATE_CLINICS_WA_AVAILABLE: "distribution.WA.available",
    STATE_CLINICS_TAS_AVAILABLE: "distribution.TAS.available",
    STATE_CLINICS_SA_AVAILABLE: "distribution.SA.available",
    STATE_CLINICS_ACT_AVAILABLE: "distribution.ACT.available",
    STATE_CLINICS_NT_AVAILABLE: "distribution.NT.available",
    STATE_CLINICS_NSW_AVAILABLE: "distribution.NSW.available",
    CWTH_AGED_CARE_AVAILABLE: "distribution.cwthAgedCare.available",
    CWTH_PRIMARY_CARE_AVAILABLE: "distribution.cwthPrimaryCare.available",
    STATE_CLINICS_VIC_ADMINISTERED: "distribution.VIC.administered",
    STATE_CLINICS_QLD_ADMINISTERED: "distribution.QLD.administered",
    STATE_CLINICS_WA_ADMINISTERED: "distribution.WA.administered",
    STATE_CLINICS_TAS_ADMINISTERED: "distribution.TAS.administered",
    STATE_CLINICS_SA_ADMINISTERED: "distribution.SA.administered",
    STATE_CLINICS_ACT_ADMINISTERED: "distribution.ACT.administered",
    STATE_CLINICS_NT_ADMINISTERED: "distribution.NT.administered",
    STATE_CLINICS_NSW_ADMINISTERED: "distribution.NSW.administered",
    CWTH_AGED_CARE_ADMINISTERED: "distribution.cwthAgedCare.administered",
    CWTH_PRIMARY_CARE_ADMINISTERED: "distribution.cwthPrimaryCare.administered",
    STATE_CLINICS_VIC_AVAILABLE_MINUS_ADMINISTERED: "distribution.VIC.availableMinusAdministered",
    STATE_CLINICS_QLD_AVAILABLE_MINUS_ADMINISTERED: "distribution.QLD.availableMinusAdministered",
    STATE_CLINICS_WA_AVAILABLE_MINUS_ADMINISTERED: "distribution.WA.availableMinusAdministered",
    STATE_CLINICS_TAS_AVAILABLE_MINUS_ADMINISTERED: "distribution.TAS.availableMinusAdministered",
    STATE_CLINICS_SA_AVAILABLE_MINUS_ADMINISTERED: "distribution.SA.availableMinusAdministered",
    STATE_CLINICS_ACT_AVAILABLE_MINUS_ADMINISTERED: "distribution.ACT.availableMinusAdministered",
    STATE_CLINICS_NT_AVAILABLE_MINUS_ADMINISTERED: "distribution.NT.availableMinusAdministered",
    STATE_CLINICS_NSW_AVAILABLE_MINUS_ADMINISTERED: "distribution.NSW.availableMinusAdministered",
    CWTH_AGED_CARE_AVAILABLE_MINUS_ADMINISTERED: "distribution.cwthAgedCare.availableMinusAdministered",
    CWTH_PRIMARY_CARE_AVAILABLE_MINUS_ADMINISTERED: "distribution.cwthPrimaryCare.availableMinusAdministered",
    STATE_CLINICS_VIC_ESTIMATED_DOSE_UTILISATION: "distribution.VIC.estimatedUtilisationPct",
    STATE_CLINICS_QLD_ESTIMATED_DOSE_UTILISATION: "distribution.QLD.estimatedUtilisationPct",
    STATE_CLINICS_WA_ESTIMATED_DOSE_UTILISATION: "distribution.WA.estimatedUtilisationPct",
    STATE_CLINICS_TAS_ESTIMATED_DOSE_UTILISATION: "distribution.TAS.estimatedUtilisationPct",
    STATE_CLINICS_SA_ESTIMATED_DOSE_UTILISATION: "distribution.SA.estimatedUtilisationPct",
    STATE_CLINICS_ACT_ESTIMATED_DOSE_UTILISATION: "distribution.ACT.estimatedUtilisationPct",
    STATE_CLINICS_NT_ESTIMATED_DOSE_UTILISATION: "distribution.NT.estimatedUtilisationPct",
    STATE_CLINICS_NSW_ESTIMATED_DOSE_UTILISATION: "distribution.NSW.estimatedUtilisationPct",
    CWTH_AGED_CARE_ESTIMATED_DOSE_UTILISATION: "distribution.cwthAgedCare.estimatedUtilisationPct",
    CWTH_PRIMARY_CARE_ESTIMATED_DOSE_UTILISATION: "distribution.cwthPrimaryCare.estimatedUtilisationPct",
}

const generateCsv = async () => {
    let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);
    publications.sort((a, b) => a.vaccineDataPath.localeCompare(b.vaccineDataPath));

    // handle when health publishes the data multiple times
    publications = _.uniqBy(publications, 'vaccineDataPath');

    const output = [];
    const stream = format({ headers: true });
    stream.pipe(fs.createWriteStream(DATA_CSV_PATH));

    for(const publication of publications){
        const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
        const data = JSON.parse(fs.readFileSync(localDataFile));

        const secondDoselocalDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", SECOND_DOSE_PUBLICATION_JSON_DATA_PATH);
        const secondDoseRawData = fs.existsSync(secondDoselocalDataFile) ? JSON.parse(fs.readFileSync(secondDoselocalDataFile)) : {};

        const secondDoseData = {};
        if(secondDoseRawData && secondDoseRawData.entries){
            for(const row of secondDoseRawData.entries){
                secondDoseData[row[0]] = Math.round(STATE_16_OVER_POPULATIONS[row[0]] * Number(row[1]));
            }
        }

        const lookupData = {
            ...data.pdfData,
            secondDoseData
        }
        const row = {};
        for(const key in COLUMN_TO_PATH_MAPPING){
            row[key] = _.get(lookupData, COLUMN_TO_PATH_MAPPING[key])
        }

        row.VALIDATED = publication.validation.length === 0 ? 'Y' : 'N';
        row.URL = publication.pdfUrl;

        stream.write(row);
        output.push(row);
    }

    stream.end();

    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(output, null, 4));
}

const generateDistributionCsv = async () => {
    let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);
    publications.sort((a, b) => a.vaccineDataPath.localeCompare(b.vaccineDataPath));

    // handle when health publishes the data multiple times
    publications = _.uniqBy(publications, 'vaccineDataPath');

    const output = [];
    const stream = format({ headers: true });
    stream.pipe(fs.createWriteStream(DISTRIBUTION_DATA_CSV_PATH));

    for(const publication of publications){
        const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
        const data = JSON.parse(fs.readFileSync(localDataFile));

        const lookupData = {
            ...data.pdfData,
        }

        if(!_.get(lookupData, "distribution.NSW.distributed")){
            continue;
        }

        const row = {};
        for(const key in DISTRIBUTION_COLUMN_TO_PATH_MAPPING){
            row[key] = _.get(lookupData, DISTRIBUTION_COLUMN_TO_PATH_MAPPING[key])
        }

        row.URL = publication.pdfUrl;

        stream.write(row);
        output.push(row);
    }

    stream.end();

    fs.writeFileSync(DISTRIBUTION_DATA_JSON_PATH, JSON.stringify(output, null, 4));
}

generateCsv();
generateDistributionCsv();