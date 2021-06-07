# Australian COVID-19 Vaccination Stats Data

This repository is a mess of code which:

1. Takes in the PDF file published by the [Australian Department of Health](https://www.health.gov.au/resources/collections/covid-19-vaccine-rollout-updates)
2. Takes in national second dose data from the [WA Health vaccination dashboard](https://www.wa.gov.au/organisation/covid-communications/covid-19-coronavirus-vaccination-dashboard)
3. Converts it into machine-readable statistics (JSON and CSV files)
4. Publishes data files via Github Actions and Github Pages

**Looking for COVID-19 Case and Test Data?** That data is in a separate repository: https://github.com/jxeeno/aust-govt-covid19-stats

## Information about approx second dose data
Approximate second dose data (data values in key format `APPROX_<State>_SECOND_DOSE_TOTAL`) is derived from the [WA Health Vaccination Dashboard](https://www.wa.gov.au/organisation/covid-communications/covid-19-coronavirus-vaccination-dashboard) which is updated weekly on Tuesday (and sometimes Wednesday).

Some states separately publish second dose data which is not captured here.

The percentages are extracted from the WA Health dashboard and multiplied against the [ABS 16 and over population data](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/sep-2020#data-download) as noted in the [WA Health interpretation guide](https://www.wa.gov.au/sites/default/files/2021-05/COVID-19_Vaccine_Dashboard_Guide%20for%20Interpretation.pdf).

Second dose totals are **not** published daily and therefore do not necessarily correlate with daily dose totals.  This means that deducting total doses from approx second dose total **does not produce a accurate value for first doses**.

## Direct access to data

The data is also available at the following locations:

* **CSV (all):** https://vaccinedata.covid19nearme.com.au/data/all.csv
* **JSON (all):** https://vaccinedata.covid19nearme.com.au/data/all.json
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

