# Australian Government COVID-19 Vaccination Statistics PDF Parser

This repository is a mess of code which takes in the PDF file published by the Federal Department of Health (https://www.health.gov.au/resources/collections/covid-19-vaccine-rollout-updates) and converts it into machine-readable statistics.

The data is also available pre-generated at the following locations:

* **CSV (all):** https://vaccinedata.covid19nearme.com.au/data/all.csv
* **JSON (all):** https://vaccinedata.covid19nearme.com.au/data/all.json
* **Raw JSON data (index):** https://vaccinedata.covid19nearme.com.au/data/publications.json</a></li>

Documentation for these data files will come in due course.

## To run

You'll need:

* Yarn (or NPM)
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
## Example output

```json

{
  "success": true,
  "url": "https://www.health.gov.au/sites/default/files/documents/2021/04/covid-19-vaccine-rollout-update-19-april-2021.pdf",
  "pdfData": {
    "dataAsAt": "2021-04-18",
    "totals": {
      "national": {
        "total": 1586252,
        "last24hr": 9084
      },
      "cwthAll": {
        "total": 939626,
        "last24hr": 6290
      },
      "cwthPrimaryCare": {
        "total": 766741,
        "last24hr": 5756
      },
      "cwthAgedCare": {
        "total": 172885,
        "last24hr": 534
      }
    },
    "stateClinics": {
      "VIC": {
        "total": 164045,
        "last24hr": 1492
      },
      "QLD": {
        "total": 122865,
        "last24hr": 0
      },
      "WA": {
        "total": 76244,
        "last24hr": 162
      },
      "TAS": {
        "total": 28933,
        "last24hr": 212
      },
      "SA": {
        "total": 46591,
        "last24hr": 437
      },
      "ACT": {
        "total": 21332,
        "last24hr": 480
      },
      "NT": {
        "total": 12764,
        "last24hr": 11
      },
      "NSW": {
        "total": 173852,
        "last24hr": 0
      }
    },
    "cwthAgedCare": {
      "VIC": {
        "total": 33924,
        "last24hr": 0
      },
      "QLD": {
        "total": 41249,
        "last24hr": 0
      },
      "WA": {
        "total": 18722,
        "last24hr": 0
      },
      "TAS": {
        "total": 6211,
        "last24hr": 0
      },
      "SA": {
        "total": 14188,
        "last24hr": 0
      },
      "ACT": {
        "total": 5403,
        "last24hr": 0
      },
      "NT": {
        "total": 1303,
        "last24hr": 0
      },
      "NSW": {
        "total": 51885,
        "last24hr": 534
      }
    },
    "cwthPrimaryCare": {
      "VIC": {
        "total": 180581,
        "last24hr": 1777
      },
      "QLD": {
        "total": 176136,
        "last24hr": 995
      },
      "WA": {
        "total": 69033,
        "last24hr": 619
      },
      "TAS": {
        "total": 21656,
        "last24hr": 160
      },
      "SA": {
        "total": 58323,
        "last24hr": 331
      },
      "ACT": {
        "total": 13248,
        "last24hr": 224
      },
      "NT": {
        "total": 4677,
        "last24hr": 15
      },
      "NSW": {
        "total": 243087,
        "last24hr": 1635
      }
    },
    "cwthAgedCareBreakdown": {
      "cwthAgedCareDoses": {
        "firstDose": 112982,
        "secondDose": 59903
      },
      "cwthAgedCareFacilities": {
        "firstDose": 1315,
        "secondDose": 713
      }
    }
  }
}
```
