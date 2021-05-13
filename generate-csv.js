const fs = require('fs');
const _ = require('lodash');
const { format } = require('@fast-csv/format');

const PUBLICATION_JSON_PATH = 'docs/data/publications.json';
const DATA_CSV_PATH = 'docs/data/all.csv';
const DATA_JSON_PATH = 'docs/data/all.json';
const PUBLICATION_JSON_DATA_PATH = 'docs/data/';

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

        const row = {};
        for(const key in COLUMN_TO_PATH_MAPPING){
            row[key] = _.get(data.pdfData, COLUMN_TO_PATH_MAPPING[key])
        }

        row.VALIDATED = publication.validation.length === 0 ? 'Y' : 'N';
        row.URL = publication.pdfUrl;

        stream.write(row);
        output.push(row);
    }

    stream.end();

    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(output, null, 4));
}

generateCsv();
