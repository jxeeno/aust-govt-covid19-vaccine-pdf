# Australian COVID-19 Vaccination Data

This repository is a mess of code which:

1. Takes in the PDF file published by the [Australian Department of Health](https://www.health.gov.au/resources/collections/covid-19-vaccine-rollout-updates)
2. Takes in national second dose data from the [WA Health vaccination dashboard](https://www.wa.gov.au/organisation/covid-communications/covid-19-coronavirus-vaccination-dashboard)
3. Converts it into machine-readable statistics (JSON and CSV files)
4. Publishes data files via Github Actions and Github Pages

**Looking for COVID-19 Case and Test Data?** That data is in a separate repository: https://github.com/jxeeno/aust-govt-covid19-stats


## Notes

### Information about approx second dose by state data

**18 May 2021 to 1 July 2021**

From 18 May 2021 to 1 July 2021, approximate second dose data by state of administration (data values in key format `APPROX_<State>_SECOND_DOSE_TOTAL` in `all.csv`) is derived from the [WA Health Vaccination Dashboard](https://www.wa.gov.au/organisation/covid-communications/covid-19-coronavirus-vaccination-dashboard) which is updated weekly usually at the start of the week (exact day of week varies).

The percentages are extracted from the WA Health dashboard and multiplied against the [ABS 16 and over population data](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/sep-2020#data-download) as noted in the [WA Health interpretation guide](https://www.wa.gov.au/sites/default/files/2021-05/COVID-19_Vaccine_Dashboard_Guide%20for%20Interpretation.pdf).

State-level second dose totals are **not** published daily and therefore do not necessarily correlate with daily dose totals.  This means that deducting total doses from approx second dose total **does not produce an accurate value for first doses**.

**From 1 July 2021 and onwards**

This field has been deprecated.  Instead, use the AIR data provided by the federal government directly.

Refer to section on "Information about AIR dose breakdown" below.
### Information about AIR dose breakdown
From 30 June 2021, the Department of Health started publishing breakdowns of doses by age group and first/second doses.  This data is derived from the Australian Immunisation register (AIR) and may not correspond directly with the headline figures which include self-reported figures.

From 1 July 2021, the Department of Health started publishing breakdowns of doses by age group, first/second doses and by state of **administration**.  This data is derived from the Australian Immunisation register (AIR) and may not correspond directly with the headline figures which include self-reported figures.

This data is published separately as `air.csv` and `air.json` files.

From 28 July 2021, the Department of Health started publishing breakdowns of doses by age group, first/second doses and by state of **residence**.  This data is derived from the Australian Immunisation register (AIR) and may not correspond directly with the headline figures which include self-reported figures.

This data is published separately as `air_residence.csv` and `air_residence.json` files.
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
Note: AIR residence data is normalised differently from the other data. Each row represents a separate day, state and age bucket.  Counts are estimated by reverse calculating percentage and ABS Estiamted Resident Population.
* **CSV (AIR - Residence):** https://vaccinedata.covid19nearme.com.au/data/air_residence.csv
* **JSON (AIR - Residence):** https://vaccinedata.covid19nearme.com.au/data/air_residence.json


**Daily dose breakdown by SA4**
* **CSV (AIR - SA4):** https://vaccinedata.covid19nearme.com.au/data/air_sa4.csv?1
* **JSON (AIR - SA4):** https://vaccinedata.covid19nearme.com.au/data/air_sa4.json?1

**Weekly dose distribution data**
* **CSV (distribution):** https://vaccinedata.covid19nearme.com.au/data/distribution.csv
* **JSON (distribution):** https://vaccinedata.covid19nearme.com.au/data/distribution.json

**Index to raw data extracts**
* **Raw JSON data (index):** https://vaccinedata.covid19nearme.com.au/data/publications.json

**Important note about data quality:**  This data is provided as-is. I'm not guaranteeing the timeliness or accuracy of any data provided above.  Some basic validation steps are present (i.e. we test the data and see if the totals add up to expected values and if there are empty data values), but no manual checks are conducted.  Use at your own risk.

The data files above are usually updated daily.  Github Actions is configured to scrape and extract data from the Department of Health website every 5 minutes and published via Github Pages.  The data is also available via this git repo in under `docs/data`.

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
node index.js "https://www.health.gov.au/sites/default/files/documents/2021/04/covid-19-vaccine-rollout-update-19-april-2021.pdf"
```

## Help

### Why did you build this?

Because for some reason, our Health department reckons the best way to provide statistical data is in a PDF file generated from Microsoft PowerPoint.

This data should be available in machine readable formats for transparency and to enable ease of access.
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
