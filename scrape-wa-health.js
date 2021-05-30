const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const scrape = async () => {
    try{
        const {data} = await axios.post(
            "https://wabi-australia-southeast-api.analysis.windows.net/public/reports/querydata?synchronous=true",
            {"version":"1.0.0","queries":[{"Query":{"Commands":[{"SemanticQueryDataShapeCommand":{"Query":{"Version":2,"From":[{"Name":"s","Entity":"National SITREP","Type":0},{"Name":"a","Entity":"ABS State Population","Type":0}],"Select":[{"Measure":{"Expression":{"SourceRef":{"Source":"s"}},"Property":"Percentage Fully Vaccinated"},"Name":"National Doses.Percentage Fully Vaccinated"},{"Column":{"Expression":{"SourceRef":{"Source":"a"}},"Property":"State_Abb"},"Name":"ABS State Population.State_Abb"}],"Where":[{"Condition":{"Not":{"Expression":{"In":{"Expressions":[{"Column":{"Expression":{"SourceRef":{"Source":"a"}},"Property":"State"}}],"Values":[[{"Literal":{"Value":"'Australia'"}}]]}}}}}],"OrderBy":[{"Direction":1,"Expression":{"Column":{"Expression":{"SourceRef":{"Source":"a"}},"Property":"State_Abb"}}}]},"Binding":{"Primary":{"Groupings":[{"Projections":[0,1]}]},"DataReduction":{"DataVolume":4,"Primary":{"Window":{"Count":1000}}},"Version":1}}}]},"QueryId":""}],"cancelQueries":[],"modelId":2443166}, {
            headers: {
                'sec-ch-ua': `" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"`,
                'DNT': `1`,
                'sec-ch-ua-mobile': `?0`,
                'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36`,
                'ActivityId': `8218c55c-bf10-4c88-ad6d-b94b1941307a`,
                'Accept': `application/json, text/plain, */*`,
                'RequestId': `5269c938-fb76-59d4-6de8-d272d6b94c74`,
                'X-PowerBI-ResourceKey': `030227c5-6905-436e-bd82-b45af84cce64`,
                'Content-Type': `application/json;charset=UTF-8`,
                'Origin': `https://app.powerbi.com`,
                'Sec-Fetch-Site': `cross-site`,
                'Sec-Fetch-Mode': `cors`,
                'Sec-Fetch-Dest': `empty`,
                'Referer': `https://app.powerbi.com/`,
                'Accept-Encoding': `gzip, deflate, br`,
                'Accept-Language': `en-AU,en;q=0.9,en-GB;q=0.8,en-US;q=0.7`,
            },
        });

        const dictionary = data.results[0].result.data.dsr.DS[0].ValueDicts.D0;
        const entries = data.results[0].result.data.dsr.DS[0].PH[0].DM0.map(v => [dictionary[v.C[0]], v.C[1]]);
        const date = moment().format('YYYY-MM-DD');

        fs.writeFileSync(`docs/wahealth/${date}.json`, JSON.stringify({date, entries}, null, 4));
    }catch(e){console.error(e)}

    
}


scrape();