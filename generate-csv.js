const fs = require('fs');
const _ = require('lodash');
const { format } = require('@fast-csv/format');

const PUBLICATION_JSON_PATH = 'docs/data/publications.json';
const DATA_CSV_PATH = 'docs/data/all.csv';
const DATA_JSON_PATH = 'docs/data/all.json';

const DISTRIBUTION_DATA_CSV_PATH = 'docs/data/distribution.csv';
const DISTRIBUTION_DATA_JSON_PATH = 'docs/data/distribution.json';

const AIR_DATA_CSV_PATH = 'docs/data/air.csv';
const AIR_DATA_JSON_PATH = 'docs/data/air.json';

const AIR_RESI_DATA_CSV_PATH = 'docs/data/air_residence.csv';
const AIR_RESI_DATA_JSON_PATH = 'docs/data/air_residence.json';

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

    FIRST_NATIONS_VIC_FIRST_DOSE_TOTAL: 'firstNations.VIC.firstDoseCount',
    FIRST_NATIONS_VIC_SECOND_DOSE_TOTAL: 'firstNations.VIC.secondDoseCount',
    FIRST_NATIONS_QLD_FIRST_DOSE_TOTAL: 'firstNations.QLD.firstDoseCount',
    FIRST_NATIONS_QLD_SECOND_DOSE_TOTAL: 'firstNations.QLD.secondDoseCount',
    FIRST_NATIONS_WA_FIRST_DOSE_TOTAL: 'firstNations.WA.firstDoseCount',
    FIRST_NATIONS_WA_SECOND_DOSE_TOTAL: 'firstNations.WA.secondDoseCount',
    FIRST_NATIONS_TAS_FIRST_DOSE_TOTAL: 'firstNations.TAS.firstDoseCount',
    FIRST_NATIONS_TAS_SECOND_DOSE_TOTAL: 'firstNations.TAS.secondDoseCount',
    FIRST_NATIONS_SA_FIRST_DOSE_TOTAL: 'firstNations.SA.firstDoseCount',
    FIRST_NATIONS_SA_SECOND_DOSE_TOTAL: 'firstNations.SA.secondDoseCount',
    FIRST_NATIONS_ACT_FIRST_DOSE_TOTAL: 'firstNations.ACT.firstDoseCount',
    FIRST_NATIONS_ACT_SECOND_DOSE_TOTAL: 'firstNations.ACT.secondDoseCount',
    FIRST_NATIONS_NT_FIRST_DOSE_TOTAL: 'firstNations.NT.firstDoseCount',
    FIRST_NATIONS_NT_SECOND_DOSE_TOTAL: 'firstNations.NT.secondDoseCount',
    FIRST_NATIONS_NSW_FIRST_DOSE_TOTAL: 'firstNations.NSW.firstDoseCount',
    FIRST_NATIONS_NSW_SECOND_DOSE_TOTAL: 'firstNations.NSW.secondDoseCount',
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

const AIR_COLUMN_TO_PATH_MAPPING = {
    DATE_AS_AT: 'dataAsAt',

    AIR_95_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.national[0].firstDoseCount',AIR_95_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.national[0].firstDosePct',AIR_95_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.national[0].secondDoseCount',AIR_95_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.national[0].secondDosePct',AIR_95_PLUS_FEMALE_PCT: 'doseBreakdown.national[0].femalePct',AIR_95_PLUS_MALE_PCT: 'doseBreakdown.national[0].malePct',
    AIR_90_94_FIRST_DOSE_COUNT: 'doseBreakdown.national[1].firstDoseCount',AIR_90_94_FIRST_DOSE_PCT: 'doseBreakdown.national[1].firstDosePct',AIR_90_94_SECOND_DOSE_COUNT: 'doseBreakdown.national[1].secondDoseCount',AIR_90_94_SECOND_DOSE_PCT: 'doseBreakdown.national[1].secondDosePct',AIR_90_94_FEMALE_PCT: 'doseBreakdown.national[1].femalePct',AIR_90_94_MALE_PCT: 'doseBreakdown.national[1].malePct',
    AIR_85_89_FIRST_DOSE_COUNT: 'doseBreakdown.national[2].firstDoseCount',AIR_85_89_FIRST_DOSE_PCT: 'doseBreakdown.national[2].firstDosePct',AIR_85_89_SECOND_DOSE_COUNT: 'doseBreakdown.national[2].secondDoseCount',AIR_85_89_SECOND_DOSE_PCT: 'doseBreakdown.national[2].secondDosePct',AIR_85_89_FEMALE_PCT: 'doseBreakdown.national[2].femalePct',AIR_85_89_MALE_PCT: 'doseBreakdown.national[2].malePct',
    AIR_80_84_FIRST_DOSE_COUNT: 'doseBreakdown.national[3].firstDoseCount',AIR_80_84_FIRST_DOSE_PCT: 'doseBreakdown.national[3].firstDosePct',AIR_80_84_SECOND_DOSE_COUNT: 'doseBreakdown.national[3].secondDoseCount',AIR_80_84_SECOND_DOSE_PCT: 'doseBreakdown.national[3].secondDosePct',AIR_80_84_FEMALE_PCT: 'doseBreakdown.national[3].femalePct',AIR_80_84_MALE_PCT: 'doseBreakdown.national[3].malePct',
    AIR_75_79_FIRST_DOSE_COUNT: 'doseBreakdown.national[4].firstDoseCount',AIR_75_79_FIRST_DOSE_PCT: 'doseBreakdown.national[4].firstDosePct',AIR_75_79_SECOND_DOSE_COUNT: 'doseBreakdown.national[4].secondDoseCount',AIR_75_79_SECOND_DOSE_PCT: 'doseBreakdown.national[4].secondDosePct',AIR_75_79_FEMALE_PCT: 'doseBreakdown.national[4].femalePct',AIR_75_79_MALE_PCT: 'doseBreakdown.national[4].malePct',
    AIR_70_74_FIRST_DOSE_COUNT: 'doseBreakdown.national[5].firstDoseCount',AIR_70_74_FIRST_DOSE_PCT: 'doseBreakdown.national[5].firstDosePct',AIR_70_74_SECOND_DOSE_COUNT: 'doseBreakdown.national[5].secondDoseCount',AIR_70_74_SECOND_DOSE_PCT: 'doseBreakdown.national[5].secondDosePct',AIR_70_74_FEMALE_PCT: 'doseBreakdown.national[5].femalePct',AIR_70_74_MALE_PCT: 'doseBreakdown.national[5].malePct',
    AIR_65_69_FIRST_DOSE_COUNT: 'doseBreakdown.national[6].firstDoseCount',AIR_65_69_FIRST_DOSE_PCT: 'doseBreakdown.national[6].firstDosePct',AIR_65_69_SECOND_DOSE_COUNT: 'doseBreakdown.national[6].secondDoseCount',AIR_65_69_SECOND_DOSE_PCT: 'doseBreakdown.national[6].secondDosePct',AIR_65_69_FEMALE_PCT: 'doseBreakdown.national[6].femalePct',AIR_65_69_MALE_PCT: 'doseBreakdown.national[6].malePct',
    AIR_60_64_FIRST_DOSE_COUNT: 'doseBreakdown.national[7].firstDoseCount',AIR_60_64_FIRST_DOSE_PCT: 'doseBreakdown.national[7].firstDosePct',AIR_60_64_SECOND_DOSE_COUNT: 'doseBreakdown.national[7].secondDoseCount',AIR_60_64_SECOND_DOSE_PCT: 'doseBreakdown.national[7].secondDosePct',AIR_60_64_FEMALE_PCT: 'doseBreakdown.national[7].femalePct',AIR_60_64_MALE_PCT: 'doseBreakdown.national[7].malePct',
    AIR_55_59_FIRST_DOSE_COUNT: 'doseBreakdown.national[8].firstDoseCount',AIR_55_59_FIRST_DOSE_PCT: 'doseBreakdown.national[8].firstDosePct',AIR_55_59_SECOND_DOSE_COUNT: 'doseBreakdown.national[8].secondDoseCount',AIR_55_59_SECOND_DOSE_PCT: 'doseBreakdown.national[8].secondDosePct',AIR_55_59_FEMALE_PCT: 'doseBreakdown.national[8].femalePct',AIR_55_59_MALE_PCT: 'doseBreakdown.national[8].malePct',
    AIR_50_54_FIRST_DOSE_COUNT: 'doseBreakdown.national[9].firstDoseCount',AIR_50_54_FIRST_DOSE_PCT: 'doseBreakdown.national[9].firstDosePct',AIR_50_54_SECOND_DOSE_COUNT: 'doseBreakdown.national[9].secondDoseCount',AIR_50_54_SECOND_DOSE_PCT: 'doseBreakdown.national[9].secondDosePct',AIR_50_54_FEMALE_PCT: 'doseBreakdown.national[9].femalePct',AIR_50_54_MALE_PCT: 'doseBreakdown.national[9].malePct',
    AIR_45_49_FIRST_DOSE_COUNT: 'doseBreakdown.national[10].firstDoseCount',AIR_45_49_FIRST_DOSE_PCT: 'doseBreakdown.national[10].firstDosePct',AIR_45_49_SECOND_DOSE_COUNT: 'doseBreakdown.national[10].secondDoseCount',AIR_45_49_SECOND_DOSE_PCT: 'doseBreakdown.national[10].secondDosePct',AIR_45_49_FEMALE_PCT: 'doseBreakdown.national[10].femalePct',AIR_45_49_MALE_PCT: 'doseBreakdown.national[10].malePct',
    AIR_40_44_FIRST_DOSE_COUNT: 'doseBreakdown.national[11].firstDoseCount',AIR_40_44_FIRST_DOSE_PCT: 'doseBreakdown.national[11].firstDosePct',AIR_40_44_SECOND_DOSE_COUNT: 'doseBreakdown.national[11].secondDoseCount',AIR_40_44_SECOND_DOSE_PCT: 'doseBreakdown.national[11].secondDosePct',AIR_40_44_FEMALE_PCT: 'doseBreakdown.national[11].femalePct',AIR_40_44_MALE_PCT: 'doseBreakdown.national[11].malePct',
    AIR_35_39_FIRST_DOSE_COUNT: 'doseBreakdown.national[12].firstDoseCount',AIR_35_39_FIRST_DOSE_PCT: 'doseBreakdown.national[12].firstDosePct',AIR_35_39_SECOND_DOSE_COUNT: 'doseBreakdown.national[12].secondDoseCount',AIR_35_39_SECOND_DOSE_PCT: 'doseBreakdown.national[12].secondDosePct',AIR_35_39_FEMALE_PCT: 'doseBreakdown.national[12].femalePct',AIR_35_39_MALE_PCT: 'doseBreakdown.national[12].malePct',
    AIR_30_34_FIRST_DOSE_COUNT: 'doseBreakdown.national[13].firstDoseCount',AIR_30_34_FIRST_DOSE_PCT: 'doseBreakdown.national[13].firstDosePct',AIR_30_34_SECOND_DOSE_COUNT: 'doseBreakdown.national[13].secondDoseCount',AIR_30_34_SECOND_DOSE_PCT: 'doseBreakdown.national[13].secondDosePct',AIR_30_34_FEMALE_PCT: 'doseBreakdown.national[13].femalePct',AIR_30_34_MALE_PCT: 'doseBreakdown.national[13].malePct',
    AIR_25_29_FIRST_DOSE_COUNT: 'doseBreakdown.national[14].firstDoseCount',AIR_25_29_FIRST_DOSE_PCT: 'doseBreakdown.national[14].firstDosePct',AIR_25_29_SECOND_DOSE_COUNT: 'doseBreakdown.national[14].secondDoseCount',AIR_25_29_SECOND_DOSE_PCT: 'doseBreakdown.national[14].secondDosePct',AIR_25_29_FEMALE_PCT: 'doseBreakdown.national[14].femalePct',AIR_25_29_MALE_PCT: 'doseBreakdown.national[14].malePct',
    AIR_20_24_FIRST_DOSE_COUNT: 'doseBreakdown.national[15].firstDoseCount',AIR_20_24_FIRST_DOSE_PCT: 'doseBreakdown.national[15].firstDosePct',AIR_20_24_SECOND_DOSE_COUNT: 'doseBreakdown.national[15].secondDoseCount',AIR_20_24_SECOND_DOSE_PCT: 'doseBreakdown.national[15].secondDosePct',AIR_20_24_FEMALE_PCT: 'doseBreakdown.national[15].femalePct',AIR_20_24_MALE_PCT: 'doseBreakdown.national[15].malePct',
    AIR_16_19_FIRST_DOSE_COUNT: 'doseBreakdown.national[16].firstDoseCount',AIR_16_19_FIRST_DOSE_PCT: 'doseBreakdown.national[16].firstDosePct',AIR_16_19_SECOND_DOSE_COUNT: 'doseBreakdown.national[16].secondDoseCount',AIR_16_19_SECOND_DOSE_PCT: 'doseBreakdown.national[16].secondDosePct',AIR_16_19_FEMALE_PCT: 'doseBreakdown.national[16].femalePct',AIR_16_19_MALE_PCT: 'doseBreakdown.national[16].malePct',

    AIR_NSW_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.NSW[0].firstDoseCount',AIR_NSW_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.NSW[0].firstDosePct',AIR_NSW_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.NSW[0].secondDoseCount',AIR_NSW_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.NSW[0].secondDosePct',AIR_NSW_16_PLUS_POPULATION: 'doseBreakdown.NSW[0].cohortPopulation',
    AIR_VIC_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.VIC[0].firstDoseCount',AIR_VIC_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.VIC[0].firstDosePct',AIR_VIC_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.VIC[0].secondDoseCount',AIR_VIC_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.VIC[0].secondDosePct',AIR_VIC_16_PLUS_POPULATION: 'doseBreakdown.VIC[0].cohortPopulation',
    AIR_QLD_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.QLD[0].firstDoseCount',AIR_QLD_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.QLD[0].firstDosePct',AIR_QLD_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.QLD[0].secondDoseCount',AIR_QLD_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.QLD[0].secondDosePct',AIR_QLD_16_PLUS_POPULATION: 'doseBreakdown.QLD[0].cohortPopulation',
    AIR_WA_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.WA[0].firstDoseCount',AIR_WA_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.WA[0].firstDosePct',AIR_WA_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.WA[0].secondDoseCount',AIR_WA_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.WA[0].secondDosePct',AIR_WA_16_PLUS_POPULATION: 'doseBreakdown.WA[0].cohortPopulation',
    AIR_TAS_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.TAS[0].firstDoseCount',AIR_TAS_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.TAS[0].firstDosePct',AIR_TAS_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.TAS[0].secondDoseCount',AIR_TAS_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.TAS[0].secondDosePct',AIR_TAS_16_PLUS_POPULATION: 'doseBreakdown.TAS[0].cohortPopulation',
    AIR_SA_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.SA[0].firstDoseCount',AIR_SA_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.SA[0].firstDosePct',AIR_SA_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.SA[0].secondDoseCount',AIR_SA_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.SA[0].secondDosePct',AIR_SA_16_PLUS_POPULATION: 'doseBreakdown.SA[0].cohortPopulation',
    AIR_ACT_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.ACT[0].firstDoseCount',AIR_ACT_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.ACT[0].firstDosePct',AIR_ACT_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.ACT[0].secondDoseCount',AIR_ACT_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.ACT[0].secondDosePct',AIR_ACT_16_PLUS_POPULATION: 'doseBreakdown.ACT[0].cohortPopulation',
    AIR_NT_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.NT[0].firstDoseCount',AIR_NT_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.NT[0].firstDosePct',AIR_NT_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.NT[0].secondDoseCount',AIR_NT_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.NT[0].secondDosePct',AIR_NT_16_PLUS_POPULATION: 'doseBreakdown.NT[0].cohortPopulation',

    AIR_NSW_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.NSW[1].firstDoseCount',AIR_NSW_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.NSW[1].firstDosePct',AIR_NSW_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.NSW[1].secondDoseCount',AIR_NSW_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.NSW[1].secondDosePct',AIR_NSW_50_PLUS_POPULATION: 'doseBreakdown.NSW[1].cohortPopulation',
    AIR_VIC_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.VIC[1].firstDoseCount',AIR_VIC_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.VIC[1].firstDosePct',AIR_VIC_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.VIC[1].secondDoseCount',AIR_VIC_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.VIC[1].secondDosePct',AIR_VIC_50_PLUS_POPULATION: 'doseBreakdown.VIC[1].cohortPopulation',
    AIR_QLD_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.QLD[1].firstDoseCount',AIR_QLD_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.QLD[1].firstDosePct',AIR_QLD_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.QLD[1].secondDoseCount',AIR_QLD_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.QLD[1].secondDosePct',AIR_QLD_50_PLUS_POPULATION: 'doseBreakdown.QLD[1].cohortPopulation',
    AIR_WA_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.WA[1].firstDoseCount',AIR_WA_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.WA[1].firstDosePct',AIR_WA_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.WA[1].secondDoseCount',AIR_WA_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.WA[1].secondDosePct',AIR_WA_50_PLUS_POPULATION: 'doseBreakdown.WA[1].cohortPopulation',
    AIR_TAS_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.TAS[1].firstDoseCount',AIR_TAS_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.TAS[1].firstDosePct',AIR_TAS_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.TAS[1].secondDoseCount',AIR_TAS_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.TAS[1].secondDosePct',AIR_TAS_50_PLUS_POPULATION: 'doseBreakdown.TAS[1].cohortPopulation',
    AIR_SA_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.SA[1].firstDoseCount',AIR_SA_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.SA[1].firstDosePct',AIR_SA_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.SA[1].secondDoseCount',AIR_SA_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.SA[1].secondDosePct',AIR_SA_50_PLUS_POPULATION: 'doseBreakdown.SA[1].cohortPopulation',
    AIR_ACT_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.ACT[1].firstDoseCount',AIR_ACT_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.ACT[1].firstDosePct',AIR_ACT_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.ACT[1].secondDoseCount',AIR_ACT_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.ACT[1].secondDosePct',AIR_ACT_50_PLUS_POPULATION: 'doseBreakdown.ACT[1].cohortPopulation',
    AIR_NT_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.NT[1].firstDoseCount',AIR_NT_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.NT[1].firstDosePct',AIR_NT_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.NT[1].secondDoseCount',AIR_NT_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.NT[1].secondDosePct',AIR_NT_50_PLUS_POPULATION: 'doseBreakdown.NT[1].cohortPopulation',

    AIR_NSW_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.NSW[2].firstDoseCount',AIR_NSW_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.NSW[2].firstDosePct',AIR_NSW_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.NSW[2].secondDoseCount',AIR_NSW_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.NSW[2].secondDosePct',AIR_NSW_70_PLUS_POPULATION: 'doseBreakdown.NSW[2].cohortPopulation',
    AIR_VIC_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.VIC[2].firstDoseCount',AIR_VIC_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.VIC[2].firstDosePct',AIR_VIC_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.VIC[2].secondDoseCount',AIR_VIC_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.VIC[2].secondDosePct',AIR_VIC_70_PLUS_POPULATION: 'doseBreakdown.VIC[2].cohortPopulation',
    AIR_QLD_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.QLD[2].firstDoseCount',AIR_QLD_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.QLD[2].firstDosePct',AIR_QLD_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.QLD[2].secondDoseCount',AIR_QLD_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.QLD[2].secondDosePct',AIR_QLD_70_PLUS_POPULATION: 'doseBreakdown.QLD[2].cohortPopulation',
    AIR_WA_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.WA[2].firstDoseCount',AIR_WA_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.WA[2].firstDosePct',AIR_WA_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.WA[2].secondDoseCount',AIR_WA_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.WA[2].secondDosePct',AIR_WA_70_PLUS_POPULATION: 'doseBreakdown.WA[2].cohortPopulation',
    AIR_TAS_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.TAS[2].firstDoseCount',AIR_TAS_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.TAS[2].firstDosePct',AIR_TAS_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.TAS[2].secondDoseCount',AIR_TAS_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.TAS[2].secondDosePct',AIR_TAS_70_PLUS_POPULATION: 'doseBreakdown.TAS[2].cohortPopulation',
    AIR_SA_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.SA[2].firstDoseCount',AIR_SA_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.SA[2].firstDosePct',AIR_SA_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.SA[2].secondDoseCount',AIR_SA_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.SA[2].secondDosePct',AIR_SA_70_PLUS_POPULATION: 'doseBreakdown.SA[2].cohortPopulation',
    AIR_ACT_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.ACT[2].firstDoseCount',AIR_ACT_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.ACT[2].firstDosePct',AIR_ACT_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.ACT[2].secondDoseCount',AIR_ACT_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.ACT[2].secondDosePct',AIR_ACT_70_PLUS_POPULATION: 'doseBreakdown.ACT[2].cohortPopulation',
    AIR_NT_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.NT[2].firstDoseCount',AIR_NT_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.NT[2].firstDosePct',AIR_NT_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.NT[2].secondDoseCount',AIR_NT_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.NT[2].secondDosePct',AIR_NT_70_PLUS_POPULATION: 'doseBreakdown.NT[2].cohortPopulation',

    AIR_AUS_16_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.AUS[0].firstDoseCount',AIR_AUS_16_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.AUS[0].firstDosePct',AIR_AUS_16_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.AUS[0].secondDoseCount',AIR_AUS_16_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.AUS[0].secondDosePct',AIR_AUS_16_PLUS_POPULATION: 'doseBreakdown.AUS[0].cohortPopulation',
    AIR_AUS_50_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.AUS[1].firstDoseCount',AIR_AUS_50_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.AUS[1].firstDosePct',AIR_AUS_50_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.AUS[1].secondDoseCount',AIR_AUS_50_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.AUS[1].secondDosePct',AIR_AUS_50_PLUS_POPULATION: 'doseBreakdown.AUS[1].cohortPopulation',
    AIR_AUS_70_PLUS_FIRST_DOSE_COUNT: 'doseBreakdown.AUS[2].firstDoseCount',AIR_AUS_70_PLUS_FIRST_DOSE_PCT: 'doseBreakdown.AUS[2].firstDosePct',AIR_AUS_70_PLUS_SECOND_DOSE_COUNT: 'doseBreakdown.AUS[2].secondDoseCount',AIR_AUS_70_PLUS_SECOND_DOSE_PCT: 'doseBreakdown.AUS[2].secondDosePct',AIR_AUS_70_PLUS_POPULATION: 'doseBreakdown.AUS[2].cohortPopulation',
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

const generateDistributionCsv = async (csvPath, jsonPath, mapping, checkPath) => {
    let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);
    publications.sort((a, b) => a.vaccineDataPath.localeCompare(b.vaccineDataPath));

    // handle when health publishes the data multiple times
    publications = _.uniqBy(publications, 'vaccineDataPath');

    const output = [];
    const stream = format({ headers: [...Object.keys(mapping), 'VALIDATED', 'URL'] });
    stream.pipe(fs.createWriteStream(csvPath));

    for(const publication of publications){
        const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
        const data = JSON.parse(fs.readFileSync(localDataFile));

        const lookupData = {
            ...data.pdfData,
        }

        if(!_.get(lookupData, checkPath)){
            continue;
        }

        const row = {};
        for(const key in mapping){
            row[key] = _.get(lookupData, mapping[key])
        }

        row.VALIDATED = publication.validation.length === 0 ? 'Y' : 'N';
        row.URL = publication.pdfUrl;

        stream.write(row);
        output.push(row);
    }

    stream.end();

    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 4));
}

const generateAirStateOfResidence = async (csvPath, jsonPath) => {
    let publications = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH)).filter(v => v.vaccineDataPath != null);
    publications.sort((a, b) => a.vaccineDataPath.localeCompare(b.vaccineDataPath));

    // handle when health publishes the data multiple times
    publications = _.uniqBy(publications, 'vaccineDataPath');

    const output = [];
    const stream = format({ headers: [
        'DATE_AS_AT',
        'STATE',
        'AGE_LOWER',
        'AGE_UPPER',
        'AIR_RESIDENCE_FIRST_DOSE_PCT',
        'AIR_RESIDENCE_SECOND_DOSE_PCT',
        'AIR_RESIDENCE_FIRST_DOSE_COUNT',
        'AIR_RESIDENCE_SECOND_DOSE_COUNT',
        'AIR_RESIDENCE_FIRST_DOSE_APPROX_COUNT',
        'AIR_RESIDENCE_SECOND_DOSE_APPROX_COUNT',
        'ABS_ERP_JUN_2020_POP',
        'VALIDATED',
        'URL'
    ] });
    
    stream.pipe(fs.createWriteStream(csvPath));

    for(const publication of publications){
        const localDataFile = publication.vaccineDataPath.replace("https://vaccinedata.covid19nearme.com.au/data/", PUBLICATION_JSON_DATA_PATH);
        const data = JSON.parse(fs.readFileSync(localDataFile));

        const lookupData = {
            ...data.pdfData,
        }

        const stateOfResidence = _.get(lookupData, 'stateOfResidence');

        if(!stateOfResidence){
            continue;
        }

        
        for(const stateCode in stateOfResidence){
            for(const ageGroup of stateOfResidence[stateCode].ageBucketsEstimatedPopulation){
                const row = {
                    DATE_AS_AT: _.get(lookupData, 'dataAsAt'),
                    STATE: stateCode,
                    AGE_LOWER: ageGroup.ageLower,
                    AGE_UPPER: ageGroup.ageUpper || 999,
                    AIR_RESIDENCE_FIRST_DOSE_PCT: ageGroup.firstDosePct,
                    AIR_RESIDENCE_SECOND_DOSE_PCT: ageGroup.secondDosePct,
                    AIR_RESIDENCE_FIRST_DOSE_APPROX_COUNT: ageGroup.firstDoseCount,
                    AIR_RESIDENCE_SECOND_DOSE_APPROX_COUNT: ageGroup.secondDoseCount,
                    ABS_ERP_JUN_2020_POP: ageGroup.cohortPopulation
                };

                row.VALIDATED = publication.validation.length === 0 ? 'Y' : 'N';
                row.URL = publication.pdfUrl;

                stream.write(row);
                output.push(row);

            }

            for(const ageGroup of stateOfResidence[stateCode].ageBucketsActualPopulation){
                const row = {
                    DATE_AS_AT: _.get(lookupData, 'dataAsAt'),
                    STATE: stateCode,
                    AGE_LOWER: ageGroup.ageLower,
                    AGE_UPPER: ageGroup.ageUpper || 999,
                    AIR_RESIDENCE_FIRST_DOSE_PCT: ageGroup.firstDosePct,
                    AIR_RESIDENCE_SECOND_DOSE_PCT: ageGroup.secondDosePct,
                    AIR_RESIDENCE_FIRST_DOSE_COUNT: ageGroup.firstDoseCount,
                    AIR_RESIDENCE_SECOND_DOSE_COUNT: ageGroup.secondDoseCount,
                    ABS_ERP_JUN_2020_POP: ageGroup.cohortPopulation
                };

                row.VALIDATED = publication.validation.length === 0 ? 'Y' : 'N';
                row.URL = publication.pdfUrl;

                stream.write(row);
                output.push(row);

            }
        }
    }

    stream.end();

    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 4));
}

generateCsv();
generateDistributionCsv(DISTRIBUTION_DATA_CSV_PATH, DISTRIBUTION_DATA_JSON_PATH, DISTRIBUTION_COLUMN_TO_PATH_MAPPING, "distribution.NSW.distributed");
generateDistributionCsv(AIR_DATA_CSV_PATH, AIR_DATA_JSON_PATH, AIR_COLUMN_TO_PATH_MAPPING, "doseBreakdown.national[0].firstDoseCount");
generateAirStateOfResidence(AIR_RESI_DATA_CSV_PATH, AIR_RESI_DATA_JSON_PATH);