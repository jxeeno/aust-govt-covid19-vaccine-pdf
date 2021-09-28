const neatCsv = require('neat-csv');
const fs = require('fs');

const proc = async () => {
    const states = ['NSW', 'ACT', 'VIC', 'QLD', 'OT', 'NT', 'SA', 'TAS', 'VIC', 'WA'];
    const lgas = {};
    

    for(const state of states){
        const csv = await neatCsv(fs.readFileSync(__dirname + '/LGA_2020_'+state+'.csv'))
        const mbcsv = await neatCsv(fs.readFileSync(__dirname + '/MB_2016_'+state+'.csv'))
        const mbs = {};

        for(const row of mbcsv){
            if(!mbs[row.MB_CODE_2016]){
                mbs[row.MB_CODE_2016] = row
            }
        }
        
        for(const row of csv){
            if(!lgas[row.LGA_CODE_2020]){
                lgas[row.LGA_CODE_2020] = [
                    row.LGA_CODE_2020,
                    row.LGA_NAME_2020,
                    [],
                    [],
                    []
                ]
            }

            const meshblock = mbs[row.MB_CODE_2016];
            if(!lgas[row.LGA_CODE_2020][2].includes(meshblock.SA4_CODE_2016)){
                lgas[row.LGA_CODE_2020][2].push(meshblock.SA4_CODE_2016)
            }

            if(!lgas[row.LGA_CODE_2020][3].includes(meshblock.SA3_CODE_2016)){
                lgas[row.LGA_CODE_2020][3].push(meshblock.SA3_CODE_2016)
            }
        }

        
        // console.log(csv)
    }

    fs.writeFileSync('lgacodes.json', JSON.stringify(lgas, null, 4));
    
}

proc()