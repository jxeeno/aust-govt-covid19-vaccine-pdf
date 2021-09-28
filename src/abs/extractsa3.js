const neatCsv = require('neat-csv');
const fs = require('fs');

const proc = async () => {
    const csv = await neatCsv(fs.readFileSync(__dirname + '/ABS_ERP_ASGS2016_25092021002001283.csv'))
    const rows = csv.filter(v => v['Geography Level'] === 'Statistical Area Level 3' && v.Time === '2019')
    const popBySA3 = {};
    for(const row of rows){
        if(!popBySA3[row.ASGS_2016]){
            popBySA3[row.ASGS_2016] = {
                populationTotal: 0,
                population15plus: 0,
                populationByBand: {}
            }
        }

        if(row.AGE == 'TT'){
            popBySA3[row.ASGS_2016].populationTotal += parseInt(row.Value)
        }
        if(!['A04', 'A59', 'A10', 'TT'].includes(row.AGE)){
            popBySA3[row.ASGS_2016].population15plus += parseInt(row.Value)
        }

        popBySA3[row.ASGS_2016].populationByBand[row.Age] = parseInt(row.Value)

    }

    fs.writeFileSync('sa3_2019_population.json', JSON.stringify(popBySA3, null, 4));
    console.log(rows)
    
}

proc()