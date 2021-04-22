# Australian COVID-19 Vaccination Stats Data

This repository is a mess of code which:

1. Takes in the PDF file published by the Federal Department of Health (https://www.health.gov.au/resources/collections/covid-19-vaccine-rollout-updates)
2. Converts it into machine-readable statistics (JSON and CSV files)
3. Publishes data files via Github Actions and Github Pages

## Direct access to data

The data is also available at the following locations:

* **CSV (all):** https://vaccinedata.covid19nearme.com.au/data/all.csv
* **JSON (all):** https://vaccinedata.covid19nearme.com.au/data/all.json
* **Raw JSON data (index):** https://vaccinedata.covid19nearme.com.au/data/publications.json

The data files above are updated every 5 minutes and published via Github Pages.  The data is also available via this git repo in under `docs/data`.

Documentation for these data files will come in due course.

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

