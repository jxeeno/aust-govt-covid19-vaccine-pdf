const fs = require('fs');
const { format } = require('@fast-csv/format');

const newsa4 = JSON.parse(fs.readFileSync('./docs/data/geo/air_sa4.json'));
const legacysa4 = newsa4.map(v => {
    return {
        "DATE_AS_AT": v.DATE_AS_AT,
        "STATE": v.STATE,
        "SA4_CODE": v.ABS_CODE,
        "SA4_NAME": v.ABS_NAME,
        "AGE_LOWER": v.AGE_LOWER,
        "AGE_UPPER": v.AGE_UPPER,
        "AIR_SA4_FIRST_DOSE_PCT": v.AIR_FIRST_DOSE_PCT,
        "AIR_SA4_SECOND_DOSE_PCT": v.AIR_SECOND_DOSE_PCT,
        "AIR_SA4_FIRST_DOSE_APPROX_COUNT": v.AIR_FIRST_DOSE_APPROX_COUNT,
        "AIR_SA4_SECOND_DOSE_APPROX_COUNT": v.AIR_SECOND_DOSE_APPROX_COUNT,
        "ABS_ERP_2019_POPULATION": v.ABS_ERP_2019_POPULATION,
        "VALIDATED": v.VALIDATED,
        "URL": v.URL
    }
})

const stream = format({ headers: true });
stream.pipe(fs.createWriteStream('./docs/data/air_sa4.csv'));
for(const row of legacysa4){
    stream.write(row);    
}
stream.end();

fs.writeFileSync('./docs/data/air_sa4.json', JSON.stringify(legacysa4, null, 4));