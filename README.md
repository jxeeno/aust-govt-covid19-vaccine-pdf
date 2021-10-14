# Australian COVID-19 Vaccination Data

This repository is a mess of code which:

1. Takes in the PDF file published by the [Australian Department of Health](https://www.health.gov.au/resources/collections/covid-19-vaccine-rollout-updates)
2. Takes in national second dose data from the [WA Health vaccination dashboard](https://www.wa.gov.au/organisation/covid-communications/covid-19-coronavirus-vaccination-dashboard)
3. Converts it into machine-readable statistics (JSON and CSV files)
4. Publishes data files via GitHub Actions and GitHub Pages

**Looking for COVID-19 Case and Test Data?** That data is in a separate repository: https://github.com/jxeeno/aust-govt-covid19-stats


## Notes

Due to changes in the way vaccination data is reported throughout this year, some of the data may not be comparable.  This section tries to summarise many of the data issues and reporting changes.  It's lengthy -- you have been warned!

**From 18 May 2021 to 1 July 2021**

Prior to 18 May 2021, statistics about second dose (or number of fully vaccinated people) were not available.

From 18 May 2021 to 1 July 2021, approximate second dose data by state of administration (data values in key format `APPROX_<State>_SECOND_DOSE_TOTAL` in `all.csv`) is derived from the [WA Health Vaccination Dashboard](https://www.wa.gov.au/organisation/covid-communications/covid-19-coronavirus-vaccination-dashboard) which is updated weekly usually at the start of the week (exact day of week varies).

The percentages are extracted from the WA Health dashboard and multiplied against the [ABS 16 and over population data](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/sep-2020#data-download) as noted in the [WA Health interpretation guide](https://www.wa.gov.au/sites/default/files/2021-05/COVID-19_Vaccine_Dashboard_Guide%20for%20Interpretation.pdf).

State-level second dose totals are **not** published daily and therefore do not necessarily correlate with daily dose totals.  This means that deducting total doses from approx second dose total **does not produce an accurate value for first doses**.

**From 1 July 2021 to 27 July 2021**

The `APPROX_<State>_SECOND_DOSE_TOTAL` field in `all.csv` is deprecated and should not be used any more.  From 17 August 2021, these fields will no longer be populated.

From 30 June 2021, the Department of Health started publishing breakdowns of doses by age group and first/second doses.  This data is derived from the Australian Immunisation register (AIR) and may not correspond directly with the headline figures which include self-reported figures.

From 1 July 2021, the Department of Health started publishing breakdowns of doses by age group, first/second doses and by state of **administration**.  This data is derived from the Australian Immunisation register (AIR) and may not correspond directly with the headline figures which include self-reported figures.

This data is published separately as `air.csv` and `air.json` files.

**From 28 July 2021 to 15 August 2021**

From 28 July 2021, the Department of Health started publishing breakdowns of doses by age group, first/second doses and by state of **residence**.  This data is derived from the Australian Immunisation register (AIR) and may not correspond directly with the headline figures which include self-reported figures.

The switch from reporting state of **administration** to state of **residence** resulted in some states reporting a decrease in total number of doses.  ACT and NT both reported drops.

Additional data points (doses by state of residence, by age group) were also published and is made available separately as `air_residence.csv` and `air_residence.json` files.

**From 15 August 2021 onwards**

From 15 August 2021, all data reported by the Department of Health is obtained from the Australian Immunisation Register (AIR).  Previously, some statistics were based on self-reported figures from state-run clinics.

This reporting change resulted in negative doses in some states reported in the `all.csv` file.  This drop is due to the lag between a dose being administered and the record being entered into AIR.

This change resulted meant that the statistics in the `all.csv` file prior to 15 Aug 2021 is not directly comparable to the data published on or after 15 Aug 2021.

All data up to this point is based on **date of reporting**.  Department of Health has also begun reporting doses on the **date of administration**.  This data is not available in this repository yet.

**From 16 August 2021 onwards**

Vaccination rates form Aboriginal and Torres Strait Islander peoples (First Nations people) are now included in the dataset.  This data was uploaded on 8 September, dating back to 16 August 2021.

Department of Health updates this data on a weekly basis and was included in the daily vaccination data pack since 16 August 2021.

These appear as `FIRST_NATIONS_<STATE|TERRITORY|AUS>_<FIRST|SECOND>_DOSE_TOTAL` in `all.csv` and `all.json`.

**From 6 September 2021 onwards**

Department of Health no longer publishes the first and second dose and visit count breakdowns for aged and disability care.

This means the following fields are now deprecated:

* `CWTH_AGED_CARE_DOSES_FIRST_DOSE`
* `CWTH_AGED_CARE_DOSES_SECOND_DOSE`
* `CWTH_AGED_CARE_FACILITIES_FIRST_DOSE`
* `CWTH_AGED_CARE_FACILITIES_SECOND_DOSE`

**From 13 September 2021 onwards**

Department of Health is now publishing dose data for 12-15 year olds.  This data is available in `air.csv` as:

* `AIR_12_15_<FIRST|SECOND>_DOSE_<COUNT|PCT>`
* `AIR_<STATE>_12_15_<FIRST|SECOND>_DOSE_<COUNT|PCT>`

**From 15 September 2021 onwards**

All totals are now include 12-15 age groups.
## Attribution

You must attribute the source of the data as [Department of Health](https://www.health.gov.au/using-our-websites/copyright) (all data except second doses by state prior to 1st July 2021) and [WA Health](https://www.wa.gov.au/sites/default/files/2021-06/COVID-19-Vaccination-Dashboard-Guide-for-Interpretation.pdf) (second dose by state data prior to 1st July 2021).

When using this data extract, I'd appreciate it if you attribute data extraction to myself (Ken Tsang) and link to this repository.  This will be greatly appreciated, but not required.

Example:

> Source: WA Health (second dose by state data prior to 1st July 2021) and Department of Health (all other data); Data extracted by [Ken Tsang](https://github.com/jxeeno/aust-govt-covid19-vaccine-pdf)

## Programmatic access to data

The data is also available at the following locations:

**Daily dose administration data (and weekly second dose by state data from 18 May 2021 onwards)**
* **CSV (all):** https://vaccinedata.covid19nearme.com.au/data/all.csv
* **JSON (all):** https://vaccinedata.covid19nearme.com.au/data/all.json

**Daily dose breakdown from AIR incl state of administration data (available from 30 June 2021 onwards)**
* **CSV (AIR - Administration):** https://vaccinedata.covid19nearme.com.au/data/air.csv
* **JSON (AIR - Administration):** https://vaccinedata.covid19nearme.com.au/data/air.json

**Daily dose breakdown from AIR incl state of residence data (available from 28 July 2021 onwards)**

Note: AIR residence data is normalised differently from the other data. Each row represents a separate day, state and age bucket.  Counts are estimated by reverse calculating percentage and ABS Estimated Resident Population.

* **CSV (AIR - Residence):** https://vaccinedata.covid19nearme.com.au/data/air_residence.csv
* **JSON (AIR - Residence):** https://vaccinedata.covid19nearme.com.au/data/air_residence.json

**Weekly dose distribution data**
* **CSV (distribution):** https://vaccinedata.covid19nearme.com.au/data/distribution.csv
* **JSON (distribution):** https://vaccinedata.covid19nearme.com.au/data/distribution.json

**Index to raw data extracts**
* **Raw JSON data (index):** https://vaccinedata.covid19nearme.com.au/data/publications.json

## Programatic access to geographical vaccination rates

Geographical vaccination rates are updated weekly.
### Statistical Area 4
Vaccination rates by address of residence, grouped by ABS [Statistical Area 4](https://www.abs.gov.au/ausstats/abs@.nsf/Lookup/by%20Subject/1270.0.55.001~July%202016~Main%20Features~Statistical%20Area%20Level%204%20(SA4)~10016).

* **CSV (AIR - SA4):** https://vaccinedata.covid19nearme.com.au/data/geo/air_sa4.csv
* **JSON (AIR - SA4):** https://vaccinedata.covid19nearme.com.au/data/geo/air_sa4.json

### Statistical Area 3
Vaccination rates by address of residence, grouped by ABS [Statistical Area 3](https://www.abs.gov.au/ausstats/abs@.nsf/Lookup/by%20Subject/1270.0.55.001~July%202016~Main%20Features~Statistical%20Area%20Level%203%20(SA3)~10015).  SA3s with less than 500 people aged 15 and over have been excluded.

* **CSV (AIR - SA3):** https://vaccinedata.covid19nearme.com.au/data/geo/air_sa3.csv
* **JSON (AIR - SA3):** https://vaccinedata.covid19nearme.com.au/data/geo/air_sa3.json

### Local Government Areas
Vaccination rates by address of residence, grouped by ABS [Local Government Areas](https://www.abs.gov.au/ausstats/abs@.nsf/Lookup/by%20Subject/1270.0.55.003~July%202019~Main%20Features~Local%20Government%20Areas%20(LGAs)~2).  LGAs with large ‘very remote’ and ‘remote’ areas where geo-coding addresses difficult are excluded.

* **CSV (AIR - LGA):** https://vaccinedata.covid19nearme.com.au/data/geo/air_lga.csv
* **JSON (AIR - LGA):** https://vaccinedata.covid19nearme.com.au/data/geo/air_lga.json

### Statistical Area 4 (Indigenous population)
Vaccination rates of the Indigenous population by address of residence, grouped by ABS [Statistical Area 4](https://www.abs.gov.au/ausstats/abs@.nsf/Lookup/by%20Subject/1270.0.55.001~July%202016~Main%20Features~Statistical%20Area%20Level%204%20(SA4)~10016).

Note: `ABS_ERP_2019_POPULATION` represents the general estimated resident population for the SA4.  `AIR_INDIGENOUS_POPULATION` is provided as an estimate of the Indigenous population in the SA4 based on records in the Australian Immunisation Register / Medicare.  Percentages are calculated using `AIR_INDIGENOUS_POPULATION` as denominator.

* **CSV (AIR - SA4 Indigenous):** https://vaccinedata.covid19nearme.com.au/data/geo/air_sa4_indigenous.csv
* **JSON (AIR - SA4 Indigenous):** https://vaccinedata.covid19nearme.com.au/data/geo/air_sa4_indigenous.json

### By Postal Area (VIC only)
Vaccination rates by address of residence, grouped by ABS [Postal Areas (POA)](https://www.abs.gov.au/ausstats/abs@.nsf/Lookup/by%20Subject/1270.0.55.003~July%202016~Main%20Features~Postal%20Areas%20(POA)~8).  POAs with significant population change since the 2016 census are excluded as it is not possible to accurately provide vaccination rates.

Vaccination rates are expressed as percent ranges in 5% increments.

This data is obtained from https://www.coronavirus.vic.gov.au/weekly-covid-19-vaccine-data

* **CSV (AIR - VIC POA):** https://vicvaxdata.covid19nearme.com.au/data/vic_poa.csv
* **JSON (AIR - VIC POA):** https://vicvaxdata.covid19nearme.com.au/data/vic_poa.json

### Legacy feed for Statistical Area 4

This is the legacy SA4 feed for backwards compatability.  The data contained in this file is the same as the new SA4 data feed, however, the column names are slightly as SA4-specific terminology has been removed.  This legacy feed will continue to be updated.  There is no need to switch to the new feed if you've already integrated against the legacy one.

* **CSV (AIR - SA4):** https://vaccinedata.covid19nearme.com.au/data/air_sa4.csv
* **JSON (AIR - SA4):** https://vaccinedata.covid19nearme.com.au/data/air_sa4.json


**Important note about data quality:**  This data is provided as-is. I'm not guaranteeing the timeliness or accuracy of any data provided above.  Some basic validation steps are present (i.e. we test the data and see if the totals add up to expected values and if there are empty data values), but no manual checks are conducted.  Use at your own risk.

The data files above are usually updated daily.  GitHub Actions is configured to scrape and extract data from the Department of Health website every 5 minutes and published via GitHub Pages.  The data is also available via this git repo in under `docs/data`.

Documentation for these data files will come in due course.

## Want to use this in Google Sheets?

You can use the `=IMPORTDATA()` formula:

```
=IMPORTDATA("https://vaccinedata.covid19nearme.com.au/data/all.csv")
```

## To run yourself

You can also run this code yourself.  You'll need:

* Yarn (or NPM) to install JS dependencies
* Node (not sure what version but I'm running v12.x)

```bash
git clone https://github.com/jxeeno/aust-govt-covid19-vaccine-pdf.git
cd aust-govt-covid19-vaccine-pdf
yarn # or: npm install

# prior to 16 Aug 2021
node index.js "https://www.health.gov.au/sites/default/files/documents/2021/04/covid-19-vaccine-rollout-update-19-april-2021.pdf"

# from 16 Aug 2021 onwards
node index.js "https://www.health.gov.au/sites/default/files/documents/2021/08/covid-19-vaccine-rollout-update-19-august-2021.pdf" "https://www.health.gov.au/sites/default/files/documents/2021/08/covid-19-vaccine-rollout-update-jurisdictional-breakdown-19-august-2021.pdf"
```

## Help

### Why did you build this?

Because for some reason, our Health department reckons the best way to provide statistical data is in a PDF file generated from Microsoft PowerPoint.

This data should be available in machine-readable formats for transparency and to enable ease of access.
### Oh no, it's broken

Yeah, that's probably going to happen.  Every time the Health department decides to add some new disclaimers or tweak the layout/wording a little, this thing will break.

You can try and fix it and submit a PR.  Or raise an issue and I'll have a look at it.

### Why is the code so bad?

Yeah, it's spaghetti code because it's basically disposable code. I expect to need to rewrite this every few days.

Having said that, you're welcome to raise a PR if you want to make it better! :)

# Data corrections

Department of Health occasionally updates their historical vaccine statistics to correct incorrect data.  See below for summary of changes:

| Date  | Description of changes |
|---|---|
| 2021-05-13  | NSW total revised from 266,514 (+10,321) to 264,135 (+7,942)  |
| 2021-05-13  | National total revised from 2,980,644 (+85,874) to 2,978,265 (+83,495) |
| 2021-05-14  | National 24 hour difference revised from +76,153 to +78,532  |
| 2021-05-14  | NSW 24 hour difference revised from +8,237 to +10,616  |
