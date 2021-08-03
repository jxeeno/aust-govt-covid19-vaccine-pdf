const neatCsv = require('neat-csv');
const fs = require('fs');

const proc = async () => {
    const csv = await neatCsv(fs.readFileSync('./src/abs/erp_sa4_population_2019.csv'), {headers: ["MEASURE","Measure","SEX_ABS","Sex","AGE","Age","REGIONTYPE","Geography Level","ASGS_2016","Region","FREQUENCY","Frequency","TIME","Time","Value","Flag Codes","Flags"]})
    const rows = csv.filter(v => v['Geography Level'] === 'Statistical Area Level 4' && v.Time === '2019')
    const popBySA4 = {};
    for(const row of rows){
        if(!popBySA4[row.ASGS_2016]){
            popBySA4[row.ASGS_2016] = {
                populationTotal: 0,
                population15plus: 0,
                populationByBand: {}
            }
        }

        if(row.AGE == 'TT'){
            popBySA4[row.ASGS_2016].populationTotal += parseInt(row.Value)
        }
        if(!['A04', 'A59', 'A10', 'TT'].includes(row.AGE)){
            popBySA4[row.ASGS_2016].population15plus += parseInt(row.Value)
        }

        popBySA4[row.ASGS_2016].populationByBand[row.Age] = parseInt(row.Value)

    }

    fs.writeFileSync('sa4_2019_population.json', JSON.stringify(popBySA4, null, 4));
    console.log(rows)
    
}

proc()