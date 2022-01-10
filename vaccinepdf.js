const PDFExtract = require('pdf.js-extract').PDFExtract;
const moment = require('moment');
const pdfTableExtractor = require('./src/pdf-table');
const {getPopulation} = require('./src/abs_erp');
const pdfExtract = new PDFExtract();
const options = {}; /* see below */

const toNumber = (str, sign) => {
    const neg = (sign === '-' ? -1 : 1);
    return neg * Number(str.replace(/,/g, ''));
};

const isNumber = str => !!str.trim().match(/^[0-9,]+$/);
const isNumberDecimal = str => !!str.trim().match(/^[0-9,]+(\.[0-9]+)?%?$/);

class AusDeptHealthVaccinePdf {
    constructor(variant){
        this.variant = variant;
    }

    mergeAdjacentCells(values, thresh = 0.07, joinThreshX = 4, joinThreshY = 4){
        // sometimes the PDF file will split up the text
        // into separate cells.  this function will try
        // to adjacent cells back together

        const valuesSortX = values.slice();
        valuesSortX.sort((a, b) => a.cx - b.cx);
        // console.log(valuesSortX);
        const output = [];
        const excluded = new Set();
        for(let i = 0; i < valuesSortX.length; i++){
            if(excluded.has(i)){continue;}
            const value = valuesSortX[i];
            
            while(true){
                const rightX = value.x + value.width;
                const adjIndex = valuesSortX.findIndex((adjacentValue, ii) => !excluded.has(ii) && Math.abs(adjacentValue.x - rightX) < joinThreshX && Math.abs(adjacentValue.cy - value.cy) < joinThreshY);
                if(adjIndex > -1){
                    const adj = valuesSortX[adjIndex];
                    const xdiff = Math.abs(adj.x - rightX);
                    const ydiff = Math.abs(adj.cy - value.cy);
                    // console.log(`merge ${value.str} with ${adj.str} (${xdiff}, ${ydiff})`);
                    value.str = value.str.trim() + (xdiff > thresh ? ' ' : '') + adj.str.trim();
                    value.width = adj.x + adj.width - value.x;
                    value.cx = value.x + value.width/2;
                    excluded.add(adjIndex);
                }else{
                    break;
                }
            }

            output.push(value);
        }
        output.sort((a, b) => a.y - b.y);
        // console.log(output.map(o => o.str))
        return output;
    }

    cleanCells(values, mode = 1){
        if(mode === 1){
            // this removes all the unnecessary content like asterisk
            // or hashes then filters out empty lines for simplicity 
            return values.map(v => ({
                ...v,
                str: v.str.trim().replace(/[^a-zA-Z0-9,+\-\(\)\s]/g, '').trim()
            })).filter(v => v.str !== '');
        }else if(mode === 2) {
            // this removes all the unnecessary content like asterisk
            // or hashes then filters out empty lines for simplicity 
            return values.map(v => ({
                ...v,
                str: v.str.trim().replace(/[^a-zA-Z0-9,+\-\(\)\s\.%]/g, '').trim()
            })).filter(v => v.str !== '');
        }
    }

    async parsePdf(buffer, bufferJurisdictional){
        this.data = await pdfExtract.extractBuffer(buffer, options);
        this.jurisdictionalData = bufferJurisdictional ? await pdfExtract.extractBuffer(bufferJurisdictional, options) : null;

        for(const page of this.data.pages){
            page.content = page.content.map(l => ({ ...l, cx: l.x + l.width / 2, cy: l.y + l.height / 2 }));
        }

        if(this.jurisdictionalData){
            for(const page of this.jurisdictionalData.pages){
                page.content = page.content.map(l => ({ ...l, cx: l.x + l.width / 2, cy: l.y + l.height / 2 }));
            }
        }

        const pageForFirstNations = this.data.pages.findIndex(page => page.content.find(r => r.str.match(/Aboriginal and Torres Strait Islander peoples/)))
        const pageForAgedCare = this.data.pages.findIndex(page => !this.mergeAdjacentCells(page.content).find(r => r.str.match(/Booster\s*Vaccinations/)) && page.content.find(r => r.str.match(/Commonwealth aged care (and disability )?doses administered/)))
        const pageForPrimaryCare = this.data.pages.findIndex(page => page.content.find(r => r.str.indexOf('Commonwealth primary care doses administered') > -1))
        const pageForDoses = this.data.pages.findIndex(page => this.mergeAdjacentCells(page.content).find(r => r.str.match(/Doses\s*by\s*age\s*and\s*sex/)))
        const pageForBoosters = this.data.pages.findIndex(page => this.mergeAdjacentCells(page.content).find(r => r.str.match(/Booster\s*Vaccinations/)))
        const pageForDistribution = this.data.pages.findIndex(page => page.content.find(r => r.str.indexOf('Administration and Utilisation') > -1))
        const jurisdictionAdministeredPage = this.data.pages.findIndex(page => page.content.find(r => r.str.indexOf('Jurisdiction administered') > -1))
        const totalDosesPage = this.data.pages.findIndex(page => this.mergeAdjacentCells(page.content).find(r => r.str.match(/Total\s*vaccine\s*doses/)))
        const primaryCarePage = this.data.pages.findIndex(page => this.mergeAdjacentCells(page.content).find(r => r.str.match(/Commonwealth\s*primary\s*care/)))

        // console.log({totalDosesPage})
        const firstNations = this.getFirstNationsStateData(pageForFirstNations);
        const totalDoses = this.getStateData(totalDosesPage);
        const boosterDoses = this.getStateData(pageForBoosters);
        const stateClinics = this.getStateData(this.variant === 'original' ? 1 : jurisdictionAdministeredPage);
        const cwthAgedCare = this.getStateData(pageForAgedCare || 5);
        // don't use primaryCare as that is doses by residence.  we want doses by administration here
        let cwthPrimaryCare = this.getStateData(pageForPrimaryCare || 6);
        let totals = this.getLeftPanelData(totalDosesPage);
        const cwthAgedCareBreakdown = this.getAgedCareLeftPanelData(pageForAgedCare || 5);
        const dataAsAt = this.getDataAsAt(1) || this.getDataAsAt(2) || this.getDataAsAt(3) || this.getDataAsAt(4) || this.getDataAsAt(5) || this.getDataAsAt(6) || this.getDataAsAt(7);
        const distribution = await this.getDistributionData(buffer, pageForDistribution);
        // console.log({pageForDoses})
        const doseBreakdown = this.getDoseBreakdown(pageForDoses);
        const thirdDoses = {
            ...(this.getThirdDose(totalDosesPage)||{}),
            ...(boosterDoses||{})
        };
        const stateOfResidence = {};

        // handle missing primary care
        // this is required because the new slide for primary care is for
        // doses by residence NOT doses by administration
        if(
            (!cwthPrimaryCare || Object.keys(cwthPrimaryCare).length === 0) &&
            (totalDoses && Object.keys(totalDoses).length > 0) &&
            (stateClinics && Object.keys(stateClinics).length > 0) &&
            (cwthAgedCare && Object.keys(cwthAgedCare).length > 0)
        ){
            cwthPrimaryCare = {}
            for(const k in totalDoses){
                if(
                    totalDoses[k] && stateClinics[k] && cwthAgedCare[k] &&
                    totalDoses[k].total != null && stateClinics[k].total != null && cwthAgedCare[k].total != null &&
                    totalDoses[k].last24hr != null && stateClinics[k].last24hr != null && cwthAgedCare[k].last24hr != null
                ){
                    cwthPrimaryCare[k] = {
                        total: totalDoses[k].total - stateClinics[k].total - cwthAgedCare[k].total,
                        last24hr: totalDoses[k].last24hr - stateClinics[k].last24hr - cwthAgedCare[k].last24hr
                    }
                }else{
                    console.error('Could not calculate cwth totals for '+k, {
                        td: totalDoses[k],
                        sc: stateClinics[k],
                        ac: cwthAgedCare[k]
                    })
                }
            }
        }

        // handle missing totals
        if(!totals.national.total){
            totals.national = this.getSlideSummary(totalDosesPage);
        }

        if(!totals.cwthPrimaryCare.total){
            totals.cwthPrimaryCare = this.getSlideSummary(primaryCarePage);
        }

        if(!totals.cwthAgedCare.total && pageForAgedCare > -1){
            totals.cwthAgedCare = this.getSlideSummary(pageForAgedCare, 2);
            // console.log({pageForAgedCare});
        }

        if(!totals.cwthAll.total && totals.cwthAgedCare && totals.cwthAgedCare.total && totals.cwthAgedCare.last24hr){
            totals.cwthAll = {
                total: totals.cwthAgedCare.total + totals.cwthPrimaryCare.total,
                last24hr: totals.cwthAgedCare.last24hr + totals.cwthPrimaryCare.last24hr
            };
        }

        // if(!totals.cwthPrimaryCare.total){
        //     totals.cwthPrimaryCare = this.getSlideSummary(primaryCarePage);
        // }
            // totals = {
            //     national: {
            //         total: Object.values(totalDoses).reduce((a, v) => a+v.total, 0),
            //         last24hr: Object.values(totalDoses).reduce((a, v) => a+v.last24hr, 0)
            //     },
            //     cwthAll: {
            //         total: Object.values(totalDoses).reduce((a, v) => a+v.total, 0) - Object.values(stateClinics).reduce((a, v) => a+v.total, 0),
            //         last24hr: Object.values(totalDoses).reduce((a, v) => a+v.last24hr, 0) - Object.values(stateClinics).reduce((a, v) => a+v.last24hr, 0)
            //     },
            //     cwthPrimaryCare: {
            //         total: Object.values(totalDoses).reduce((a, v) => a+v.total, 0) - Object.values(stateClinics).reduce((a, v) => a+v.total, 0) - Object.values(cwthAgedCare).reduce((a, v) => a+v.total, 0),
            //         last24hr: Object.values(totalDoses).reduce((a, v) => a+v.last24hr, 0) - Object.values(stateClinics).reduce((a, v) => a+v.last24hr, 0) - Object.values(cwthAgedCare).reduce((a, v) => a+v.last24hr, 0)
            //     },
            //     cwthAgedCare: {
            //         total: Object.values(cwthAgedCare).reduce((a, v) => a+v.total, 0),
            //         last24hr: Object.values(cwthAgedCare).reduce((a, v) => a+v.last24hr, 0)
            //     }
            // }
        // }

        const states = {
            'NSW': 'Wales', // lmao yes because sometimes New South Wales is split
            'VIC': 'Victoria',
            'QLD': 'Queensland',
            'ACT': 'Capital', // lmao yes because sometimes Australian Capital Territory is split
            'SA': 'South Australia', // lmao yes because sometimes South Australia is split
            'NT': 'Northern', // lmao yes because sometimes Northern Territory is split
            'WA': 'Western', // lmao yes because sometimes Western Australia is split
            'TAS': 'Tasmania'
        };

        for(const stateCode in states){
            try{
                const pageForState = (this.jurisdictionalData || this.data).pages.findIndex(page => page.content.find(r => r.str.match(/Vaccinations\s*by\s*State\s*or\s*Territory\s*of\s*residence/)) && page.content.find(r => r.str.indexOf(states[stateCode]) > -1))
                if(pageForState > -1){
                    stateOfResidence[stateCode] = await this.getStateOfResidenceBreakdown(pageForState, stateCode);
                    // console.log(stateOfResidence[stateCode])
                    if(stateOfResidence[stateCode].ageBucketsActualPopulation.length === 0){
                        console.log(`Failed to fetch ${stateCode} AIR residence`)
                    }
                }else{
                    console.error('Unable to find '+stateCode)
                }
            }catch(e){
                console.error('Unable to find '+stateCode, e)
            }

        }
        // console.log(stateOfResidence)
        // console.log(firstNations)
        

        const output = {
            dataAsAt,
            totals,
            totalDoses,
            stateClinics,
            cwthAgedCare,
            cwthPrimaryCare,
            cwthAgedCareBreakdown,
            distribution,
            doseBreakdown,
            stateOfResidence,
            firstNations,
            thirdDoses
        };
        
        // console.log(JSON.stringify(output, null, 4))

        return output;
    }

    getThirdDose(pageIndex){
        const content = this.mergeAdjacentCells(this.data.pages[pageIndex].content);
        const thirdDoseLabel = content.find(v => v.str.match(/than\s*two\s*doses/))
        if(!thirdDoseLabel){
            return;
        }

        const thirdDoseColumn = content.filter(v => v.cx >= thirdDoseLabel.x && v.cx <= (thirdDoseLabel.x + thirdDoseLabel.width) && v.cy < thirdDoseLabel.y);
        thirdDoseColumn.sort((a, b) => b.cy - a.cy);

        const numbers = thirdDoseColumn.filter(v => isNumber(v.str));

        if(numbers.length > 0){
            return {
                AUS: {
                    thirdDoseCount: toNumber(numbers[0].str),
                    thirdDosePct: Math.round(toNumber(numbers[0].str) / 20619959 * 100 * 100)/100
                }
            }
        }
        // console.log(thirdDoseColumn);
    }

    getSlideSummary(pageIndex = 8, variant = 1){
        const content = this.mergeAdjacentCells(this.data.pages[pageIndex].content, undefined, 20);
        if(variant === 1){
            const contentCmb = content.map(c => c.str).join(' ').replace(/\s+/, ' ');
            const total = contentCmb.match(/([0-9,]+)\s*total\s*vaccine/)
            const last24hr = contentCmb.match(/([0-9,]+)\s*recorded\s*in\s*the\s*last\s*24\s*hours/)

            if(total && last24hr){
                return {
                    total: toNumber(total[1]),
                    last24hr: toNumber(last24hr[1])
                }
            }
        }

        if(variant === 2){
            const baseline = content.find(s => s.str.match(/Total\s*vaccine\s*doses\s*administered\s*in\s*aged\s*care/));
            // console.log({baseline})
            // console.log(content.map(c => c.str))
            if(!baseline){ return; }

            const filteredContent = content.filter(f => f.cx >= baseline.x && f.cx <= (baseline.x+baseline.width) && f.cy < baseline.y);
            // console.log({filteredContent})
            // console.log(filteredContent.map(c => c.str))

            const total = filteredContent.find(c => c.str.match(/^([0-9,]+)$/))
            const last24hr = filteredContent.find(c => c.str.match(/([\+-]\s*[0-9,]+) last 24 hours/))

            // console.log({total, last24hr})

            if(total && last24hr){
                return {
                    total: toNumber(total.str.match(/^([0-9,]+)$/)[1]),
                    last24hr: toNumber(
                        last24hr.str.match(/[\+-]\s*([0-9,]+) last 24 hours/)[1],
                        last24hr.str.match(/([\+-])\s*([0-9,]+) last 24 hours/)[1]
                    )
                }
            }
        }
    }

    getDoseBreakdown(pageIndex = 1){
        const content = this.mergeAdjacentCells(this.data.pages[pageIndex].content);

        const getValuesFor = (str, within) => {
            const bounds = within ? content.find(t => t.str.match(within)) : null;
            
            const centrepoints = content.filter(t => t.str.match(str) && (!bounds || (t.cx >= bounds.x && t.cx <= (bounds.x+bounds.width))));
            centrepoints.sort((a, b) => a.y - b.y);

            if(centrepoints.length === 0){return}

            const centrepoint = centrepoints[centrepoints.length-1]

            let minX = centrepoint.cx - centrepoint.width;
            let maxX = centrepoint.cx + centrepoint.width;
            // let minY = state.cy;
            // let maxY = state.cy + height;

            const values = this.cleanCells(this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX)), 2);
            values.sort((a, b) => a.y - b.y);
            return values;
        }

        const getGenderBreakdown = () => {
            const centrepointFemale = content.find(t => t.str.includes('Female'));
            const centrepointMale = content.find(t => t.str.includes('Male'));
            const centrepointZeroMillion = content.find(t => t.str.includes('0m'));

            if(!centrepointFemale || !centrepointMale || !centrepointZeroMillion){return;}

            const graphCentreX = (centrepointMale.cx + centrepointFemale.cx)/2;
            const graphWidth = (centrepointMale.cx - graphCentreX) * 2;

            const minY = centrepointFemale.y;
            const maxY = centrepointZeroMillion.y + centrepointZeroMillion.height;

            const maleValues = this.cleanCells(this.mergeAdjacentCells(content.filter(t => t.cx >= graphCentreX && t.cx <= (graphCentreX+graphWidth) && t.cy > minY && t.cy < maxY)), 2).filter(s => s.str !== 'Male' && s.str !== 'Female');
            maleValues.sort((a, b) => a.y - b.y);

            const femaleValues = this.cleanCells(this.mergeAdjacentCells(content.filter(t => t.cx >= (graphCentreX-graphWidth) && t.cx <= graphCentreX && t.cy > minY && t.cy < maxY)), 2).filter(s => s.str !== 'Male' && s.str !== 'Female');
            femaleValues.sort((a, b) => a.y - b.y);
            
            const extractNumbers = (n) => {
                const out = [];
                for(let i = 0; i < n.length; i++){
                    if(n[i].str.match(/^[0-9\.]+%$/)){
                        out.push(Number(n[i].str.replace(/[^0-9\.]+/g, '')));
                    }
                }

                if(out.length === 18){
                    return out;
                }
            }

            return {
                female: extractNumbers(femaleValues),
                male: extractNumbers(maleValues)
            }
        }

        const firstDoseRaw = getValuesFor(/Dose\s*1/, /First\s*and\s*second\s*doses\s*by\s*age\s*and\s*sex/);
        const secondDoseRaw = getValuesFor(/Dose\s*2/);

        const parseDoseData = (texts, c) => {
            let doseStart = false;
            let values = [];
            for(let i = 0; i < texts.length; i++){
                const matches = texts[i].str.match(/([0-9,]+)\s*\(([0-9\.%]+)\)/);
                if(texts[i].str.match(/Dose\s*[0-9]/)){
                    doseStart = true;
                }else if(doseStart && matches){
                    values.push({
                        [c + 'Count']: Number(matches[1].replace(/[^0-9\.]+/g, '')),
                        [c + 'Pct']: Number(matches[2].replace(/[^0-9\.]+/g, ''))
                    })
                }
            }

            console.log(texts.map(v => v.str), c)

            if(values.length === 18){
                return values;
            }
        }



        const firstDose = parseDoseData(firstDoseRaw, 'firstDose');
        const secondDose = parseDoseData(secondDoseRaw, 'secondDose');
        const genderBreakdown = getGenderBreakdown();

        console.log({firstDose, secondDose})

        if(!firstDose || !secondDose){return;}

        const national = [];

        // stitch
        const ageGroups = [{ageLower: 12, ageUpper: 15},{ageLower: 16, ageUpper: 19},{ageLower: 20, ageUpper: 24},{ageLower: 25, ageUpper: 29},{ageLower: 30, ageUpper: 34},{ageLower: 35, ageUpper: 39},{ageLower: 40, ageUpper: 44},{ageLower: 45, ageUpper: 49},{ageLower: 50, ageUpper: 54},{ageLower: 55, ageUpper: 59},{ageLower: 60, ageUpper: 64},{ageLower: 65, ageUpper: 69},{ageLower: 70, ageUpper: 74},{ageLower: 75, ageUpper: 79},{ageLower: 80, ageUpper: 84},{ageLower: 85, ageUpper: 89},{ageLower: 90, ageUpper: 94},{ageLower: 95}].reverse();
        for(let i = 0; i < ageGroups.length; i++){
            national.push({
                ...ageGroups[i],
                ...firstDose[i],
                ...secondDose[i],
                femalePct: (genderBreakdown && genderBreakdown.female ? genderBreakdown.female[i] : undefined),
                malePct: (genderBreakdown && genderBreakdown.male ? genderBreakdown.male[i] : undefined)
            })
        }

        // state breakdown
        const mergedContent = this.mergeAdjacentCells(content);
        // console.log(JSON.stringify(mergedContent.map(v => v.str), null, 4))
        const states = ['AUS', 'NSW', 'VIC', 'QLD', 'WA', 'TAS', 'SA', 'ACT', 'NT'];
        const stateLabelLocations = mergedContent.filter(t => states.includes(t.str.replace(/\s/g, '').trim()));

        const width = Math.max(...stateLabelLocations.map(l => l.width));
        const height = Math.max(...stateLabelLocations.map(l => l.height)) * 25;

        const stateData = {};

        for (const state of stateLabelLocations) {
            let minX = state.x - width;  // cater for left aligned
            let maxX = state.cx + width * 3;  // cater for left aligned
            let minY = state.cy;
            let maxY = state.cy + height;

            const stateCode = state.str.replace(/\s/g, '').trim();

            const ySeen = new Set()
            const values = this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX && t.cy > minY && t.cy <= maxY)).filter(v => v.str.match(/[0-9\.,\s]+%?/)).filter(v => {
                if(!ySeen.has(v.y)){
                    ySeen.add(v.y);
                    return true;
                }
                return false;
            });
            // const unmergedValues = this.data.pages[pageIndex].content.filter(t => t.cx >= minX && t.cx <= maxX && t.cy > minY && t.cy <= maxY).filter(v => v.str.match(/[0-9\.,\s]+%?/));
            // // console.log(stateCode, content.filter(t => t.cx >= minX && t.cx <= maxX && t.cy > minY && t.cy <= maxY).map(v => v.str));
            // // console.log(stateCode, values.map(v => v.str))
            // if(stateCode === 'NSW'){
            //     console.log(stateCode, unmergedValues);
            // }
            if(values.length >= 20){
                stateData[stateCode] = [
                    {
                        ageLower: 16,
                        firstDoseCount: Number(values[0].str.replace(/[^0-9\.]+/g, '')),
                        firstDosePct: Number(values[3].str.replace(/[^0-9\.]+/g, '')),
                        secondDoseCount: Number(values[1].str.replace(/[^0-9\.]+/g, '')),
                        secondDosePct: Number(values[4].str.replace(/[^0-9\.]+/g, '')),
                        cohortPopulation: Number(values[2].str.replace(/[^0-9\.]+/g, ''))
                    },
                    {
                        ageLower: 50,
                        firstDoseCount: Number(values[5+0].str.replace(/[^0-9\.]+/g, '')),
                        firstDosePct: Number(values[5+3].str.replace(/[^0-9\.]+/g, '')),
                        secondDoseCount: Number(values[5+1].str.replace(/[^0-9\.]+/g, '')),
                        secondDosePct: Number(values[5+4].str.replace(/[^0-9\.]+/g, '')),
                        cohortPopulation: Number(values[5+2].str.replace(/[^0-9\.]+/g, ''))
                    },
                    {
                        ageLower: 70,
                        firstDoseCount: Number(values[10+0].str.replace(/[^0-9\.]+/g, '')),
                        firstDosePct: Number(values[10+3].str.replace(/[^0-9\.]+/g, '')),
                        secondDoseCount: Number(values[10+1].str.replace(/[^0-9\.]+/g, '')),
                        secondDosePct: Number(values[10+4].str.replace(/[^0-9\.]+/g, '')),
                        cohortPopulation: Number(values[10+2].str.replace(/[^0-9\.]+/g, ''))
                    },
                    {
                        ageLower: 12,
                        ageUpper: 15,
                        firstDoseCount: Number(values[15+0].str.replace(/[^0-9\.]+/g, '')),
                        firstDosePct: Number(values[15+3].str.replace(/[^0-9\.]+/g, '')),
                        secondDoseCount: Number(values[15+1].str.replace(/[^0-9\.]+/g, '')),
                        secondDosePct: Number(values[15+4].str.replace(/[^0-9\.]+/g, '')),
                        cohortPopulation: Number(values[15+2].str.replace(/[^0-9\.]+/g, ''))
                    }
                ]
            }else{
                console.error(`Failed to pull ${stateCode}`, {values: values.map(v => v.str)});
            }
        }

        return {national, ...stateData};
    }

    getStateOfResidenceBreakdown(pageIndex = 4, stateCode){
        const content = this.mergeAdjacentCells((this.jurisdictionalData || this.data).pages[pageIndex].content);

        const getValuesFor = (strs, width, stripStrs = true) => {
            const [str, ...remaining] = strs;
            
            const centrepoints = content.filter(t => t.str.match(str));
            for(const centrepoint of centrepoints){
                let minX = centrepoint.cx - (width || centrepoint.width)/2;
                let maxX = centrepoint.cx + (width || centrepoint.width)/2;
                let minY = centrepoint.cy;

                const values = this.cleanCells(content.filter(t => t.cx >= minX && t.cx <= maxX && t.cy >= minY), 2);
                values.sort((a, b) => a.y - b.y);

                if(stripStrs){
                    values.splice(0, 1) // remove split rows
                }

                if(remaining.length > 0){
                    let pass = true;
                    let prevIdx = -1;
                    for(const sstr of remaining){
                        let i = values.findIndex(v => v.str.match(sstr));
                        if(i > -1 && i > prevIdx){
                            prevIdx = i;
                        }else{
                            pass = false;
                        }
                    }

                    if(!pass){
                        continue;
                    }

                    if(stripStrs){
                        values.splice(0, prevIdx+1) // remove split rows
                    }
                }

                return values;
            }

            return []
        }

        const getRow = (cell) => {
            const minX = cell.x + cell.width;
            const minY = cell.y;
            const maxY = cell.y + cell.height;

            const values = this.cleanCells(content.filter(t => t.cx >= minX && t.cy >= minY && t.cy <= maxY), 2);
            values.sort((a, b) => a.x - b.x);
            return values;
        }

        const referenceWidth = content.find(t => t.str.match(/At\s*least\s*one/)); // use at least one as reference width

        const ages = getValuesFor(['Age'], referenceWidth.width).filter(s => s.str.replace(/\s*/g, "").match(/^([0-9]+\+|[0-9]+\-[0-9]+)$/));
        const atLeastOne = getValuesFor([/At\s*least\s*one/, /dose/], referenceWidth.width);
        const firstDoseProtected = getValuesFor([/First\s*dose/, /protected/], referenceWidth.width);
        const fullyVaccinated = getValuesFor([/Fully/, /vaccinated/], referenceWidth.width);

        let rowHeaders = getValuesFor([/First\s*dose/, /Second\s*dose/, /Population/], null, false);
        if(rowHeaders.length === 0){
            rowHeaders = getValuesFor([/At\s*least\s*one\s*dose/, /Fully\s*vaccinated/, /Population/], null, false);
        }

        // console.log({rowHeaders})
        // console.log(stateCode, ages)

        // to be implemented, save tables on top right corner
        const firstDoseRow = getRow(rowHeaders[0]).flatMap(z => z.str.split(/\s+/));
        const secondDoseRow = getRow(rowHeaders[1]).flatMap(z => z.str.split(/\s+/));
        const populationRow = getRow(rowHeaders[2]).flatMap(z => z.str.split(/\s+/));

        const ageGroups = [{ageLower: 16},{ageLower: 50},{ageLower: 70}];

        return {
            ageBucketsEstimatedPopulation: ages.map((age, i) => {
                const firstDosePct = Number(atLeastOne[i].str.replace(/[^0-9\.]+/g, ''));
                const secondDosePct = Number(fullyVaccinated[i].str.replace(/[^0-9\.]+/g, ''));
                let ageObj = {ageLower: 95};
                if(age.str !== '95+'){
                    const [ageLower, ageUpper] = age.str.replace(/\s*/g, "").split('-').map(i => parseInt(i));
                    ageObj = {ageLower, ageUpper};
                }

                const cohortPopulation = getPopulation(stateCode, ageObj.ageLower, ageObj.ageUpper == null ? 999 : ageObj.ageUpper, ageObj.ageUpper==null);
                const firstDoseCount = Math.round(cohortPopulation * firstDosePct / 100);
                const secondDoseCount = Math.round(cohortPopulation * secondDosePct / 100);

                return {...ageObj, firstDosePct, secondDosePct, firstDoseCount, secondDoseCount, cohortPopulation}
            }),
            ageBucketsActualPopulation: ageGroups.map((ageObj, i) => {
                const firstDosePct = Number(firstDoseRow[i*2].replace(/[^0-9\.]+/g, ''));
                const firstDoseCount = Number(firstDoseRow[i*2+1].replace(/[^0-9\.]+/g, ''));
                const secondDosePct = Number(secondDoseRow[i*2].replace(/[^0-9\.]+/g, ''));
                const secondDoseCount = Number(secondDoseRow[i*2+1].replace(/[^0-9\.]+/g, ''));
                const cohortPopulation = Number(populationRow[i].replace(/[^0-9\.]+/g, ''));
                return {...ageObj, firstDosePct, secondDosePct, firstDoseCount, secondDoseCount, cohortPopulation}
            })
        }
    }

    getFirstNationsStateData(pageIndex = 1) {
        if(!this.data.pages[pageIndex]){return}
        const content = this.mergeAdjacentCells(this.data.pages[pageIndex].content);
        
        let stateData = this.getFirstNationsLeftPanelData(pageIndex);

        const states = {
            NSW: 'New South Wales',
            VIC: 'Victoria',
            QLD: 'Queensland',
            WA: 'Western Australia',
            TAS: 'Tasmania',
            SA: 'South Australia',
            ACT: 'Australian Capital Territory',
            NT: 'Northern Territory'
        };
        const stateLabelLocations = {};
        for(const key in states){
            stateLabelLocations[key] = content.find(t => t.str.trim() === states[key]);
        }

        const doses = {firstDoseCount: 'Individuals Dose 1', firstDosePct: 'Individuals Dose 1 %', secondDoseCount: 'Individuals Dose 2', secondDosePct: 'Individuals Dose 2 %'};
        const doseLabelLocations = {};
        for(const key in doses){
            doseLabelLocations[key] = content.find(t => t.str.trim() === doses[key]);
        }

        for(const stateKey in stateLabelLocations){
            const stateLocation = stateLabelLocations[stateKey]
            for(const doseKey in doseLabelLocations){
                const bbox = {
                    xmin: doseLabelLocations[doseKey].x,
                    xmax: doseLabelLocations[doseKey].x + doseLabelLocations[doseKey].width,
                    ymin: stateLocation.y,
                    ymax: stateLocation.y+stateLocation.height
                }

                const candidate = content.find(v => v.cx >= bbox.xmin && v.cx <= bbox.xmax && v.cy >= bbox.ymin && v.cy <= bbox.ymax);
                // console.log({candidates})
                if(candidate){
                    if(!stateData[stateKey]){
                        stateData[stateKey] = {}
                    }
                    stateData[stateKey][doseKey] = toNumber(candidate.str.replace('%', ''));
                }
            }
        }

        return stateData

    }

    getStateData(pageIndex = 1, variant = 'original'){
        if(!this.data.pages[pageIndex]){return}
        const content = this.mergeAdjacentCells(this.data.pages[pageIndex].content);
        const states = ['NSW', 'VIC', 'QLD', 'WA', 'TAS', 'SA', 'ACT', 'NT'];
        const stateLabelLocations = content.filter(t => states.includes(t.str.trim()));

        const width = Math.max(...stateLabelLocations.map(l => l.width)) * 2.5; // width of circle is at most 3x max width of state label
        const height = Math.max(...stateLabelLocations.map(l => l.height)) * 4; // height of circle is at most 4x height of state label

        // if(pageIndex === 1){
        //     console.log({width, height}, stateLabelLocations)
        // }

        let stateData = {};

        if(variant === 'firstNations'){
            stateData = this.getFirstNationsLeftPanelData(pageIndex)
        }

        for (const state of stateLabelLocations) {
            let minX = state.cx - width;
            let maxX = state.cx + width;
            let minY = state.cy;
            let maxY = state.cy + height;

            const stateCode = state.str.trim();

            const values = this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX && t.cy >= minY && t.cy <= maxY), 0.07, 6);

            const combinedStr = values.map(v => v.str.trim().replace(/[^a-zA-Z0-9,+\-\(\)\s]/g, '')).join(' ');

            if(variant === 'firstNations'){
                const matchesFirstDose = combinedStr.match(/([0-9,]+)\s*at\s*least\s*one\s*dose/);
                const matchesSecondDose = combinedStr.match(/([0-9,]+)\s*fully\s*vaccinated/);
                // console.log(pageIndex, combinedStr, matches)

                // if(pageIndex === 1 && stateCode === 'VIC'){
                //     console.log(stateCode, values)
                // }

                if(matchesFirstDose && matchesSecondDose){
                    stateData[stateCode] = {
                        firstDoseCount: toNumber(matchesFirstDose[1]),
                        secondDoseCount: toNumber(matchesSecondDose[1])
                    }
                }
            }else{
                // const matches = combinedStr.match(/([0-9,]+)\s+\(([\+\-])?\s*([0-9,]+)(?:\s*\**)?\s*(?:last\s*24\s*hours|daily)\s*/);
                const matchesDaily = combinedStr.match(/\(([\+\-])?\s*([0-9,]+)(?: \-?[0-9,]+)?(?:\s*[\*#]*)?\s*(?:last\s*24\s*hours|daily|increase)/);
                const matchesHeadline = combinedStr.match(/([0-9,]+)/);
                // console.log(pageIndex, combinedStr, matches)

                // console.log({combinedStr, matchesDaily, matchesHeadline, stateCode})

                // if(pageIndex === 1 && stateCode === 'VIC'){
                //     console.log(stateCode, values)
                // }

                if(matchesHeadline && matchesDaily){
                    stateData[stateCode] = {
                        total: toNumber(matchesHeadline[1]),
                        last24hr: toNumber(matchesDaily[2], matchesDaily[1])
                    }
                }
            }
        }

        return stateData;
    }

    getDataAsAt(pageIndex = 1, matchText = /data\s*as\s*at/i){
        const content = this.mergeAdjacentCells(this.data.pages[pageIndex].content);
        const centrepoint = content.find(t => t.str.match(matchText));
        if(!centrepoint){return;}

        let minX = centrepoint.cx - centrepoint.width;
        let maxX = centrepoint.cx + centrepoint.width;

        const values = content.filter(t => t.cx >= minX && t.cx <= maxX).map(s => s.str.replace(/\s+/g, ' '));
        values.sort((a, b) => a.y - b.y);

        for(let i = 0; i < values.length; i++){
            const v = values[i];
            const vnext = values[i+1];
            const vprev = values[i-1];

            if(v.match(matchText) && vnext && vnext.match(/[0-9]+ [A-Za-z]+ 202[0-9]+/)){
                return moment(vnext.trim(), 'DD MMM YYYY').format('YYYY-MM-DD');
            }
        }
    }

    getLeftPanelData(pageIndex = 1, matchText = 'administered as at'){
        const data = {
            national: {
                total: undefined,
                last24hr: undefined
            },
            cwthAll: {
                total: undefined,
                last24hr: undefined
            },
            cwthPrimaryCare: {
                total: undefined,
                last24hr: undefined
            },
            cwthAgedCare: {
                total: undefined,
                last24hr: undefined
            }
        }

        const content = this.data.pages[pageIndex].content;
        const centrepoint = content.find(t => t.str.includes(matchText));
        if(!centrepoint){return data}

        let minX = centrepoint.cx - centrepoint.width;
        let maxX = centrepoint.cx + centrepoint.width;
        // let minY = state.cy;
        // let maxY = state.cy + height;

        const values = this.cleanCells(this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX)));
        values.sort((a, b) => a.y - b.y);

        const isLast24HrNumber = str => str.trim().match(/\(([\+\-])\s?([0-9,]+)\s*?last\s*?24\s*?hours\)/);

        // console.log(values.map(s => s.str));

        for(let i = 0; i < values.length; i++){
            const v = values[i];
            const vnext = values[i+1];
            const vprev = values[i-1];

            if(v.str.includes('Total vaccine doses') && vprev && isNumber(vprev.str) && data.national.total === undefined){
                data.national.total = toNumber(vprev.str)
            }else if(vnext && vprev && v.str.match(/^\+[0-9,]+$/) && vprev.str.includes('administered as at') && vnext.str.includes('Past 24 hours') && data.national.last24hr === undefined){
                data.national.last24hr = toNumber(v.str)
            }else if(vnext && vprev && vprev.str.includes('Commonwealth vaccine doses') && isNumber(v.str) && data.cwthAll.total === undefined){
                data.cwthAll.total = toNumber(v.str)

                const last24hrMatches = isLast24HrNumber(vnext.str);
                if(last24hrMatches){
                    data.cwthAll.last24hr = toNumber(last24hrMatches[2], last24hrMatches[1])
                }
            }else if(vnext && vprev && vprev.str.includes('primary care') && isNumber(v.str) && data.cwthPrimaryCare.total === undefined){
                data.cwthPrimaryCare.total = toNumber(v.str)

                const last24hrMatches = isLast24HrNumber(vnext.str);
                if(last24hrMatches){
                    data.cwthPrimaryCare.last24hr = toNumber(last24hrMatches[2], last24hrMatches[1])
                }
            }else if(vnext && vprev && vprev.str.includes('aged and disability facilities') && isNumber(v.str) && data.cwthAgedCare.total === undefined){
                data.cwthAgedCare.total = toNumber(v.str)

                const last24hrMatches = isLast24HrNumber(vnext.str);
                if(last24hrMatches){
                    data.cwthAgedCare.last24hr = toNumber(last24hrMatches[2], last24hrMatches[1])
                }
            }
        }

        return data;
    }

    getAgedCareLeftPanelData(pageIndex = 4, matchText = 'and residential disability facilities'){
        const data = {
            cwthAgedCareDoses: {
                firstDose: undefined,
                secondDose: undefined
            },
            cwthAgedCareFacilities: {
                firstDose: undefined,
                secondDose: undefined
            }
        }

        if(!this.data.pages[pageIndex]){return;}
        const content = this.data.pages[pageIndex].content;
        const centrepoint = content.find(t => t.str.match(/residential\s*disability\s*facilities/));
        if(!centrepoint){return data}

        let minX = centrepoint.cx - centrepoint.width;
        let maxX = centrepoint.cx + centrepoint.width;

        const values = this.cleanCells(this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX), 0.1));
        values.sort((a, b) => a.y - b.y);

        // console.log(values.map(v => v.str))

        for(let i = 0; i < values.length; i++){
            const v = values[i];
            const vnext = values[i+1];
            const vprev = values[i-1];

            if(v.str.match(/(First\s*doses|People\s*with\s*a\s*first\s*dose)/) && vprev && isNumber(vprev.str) && data.cwthAgedCareDoses.firstDose === undefined){
                data.cwthAgedCareDoses.firstDose = toNumber(vprev.str)
            }else if(v.str.match(/(Second\s*doses|People\s*fully\s*vaccinated)/) && vprev && isNumber(vprev.str) && data.cwthAgedCareDoses.secondDose === undefined){
                data.cwthAgedCareDoses.secondDose = toNumber(vprev.str)
            }else if(v.str.match(/Sites\s*visited\s*for\s*first\s*doses/) && vprev && isNumber(vprev.str) && data.cwthAgedCareFacilities.firstDose === undefined){
                data.cwthAgedCareFacilities.firstDose = toNumber(vprev.str)
            }else if(v.str.match(/(Sites\s*visited\s*for\s*second\s*doses|Sites\s*visited\s*for\s*second\s*doses)/) && vprev && isNumber(vprev.str) && data.cwthAgedCareFacilities.secondDose === undefined){
                data.cwthAgedCareFacilities.secondDose = toNumber(vprev.str)
            }
        }

        return data;
    }

    getFirstNationsLeftPanelData(pageIndex = -1, matchText = 'and residential disability facilities'){
        const data = {
            AUS: {
                firstDoseCount: undefined,
                firstDosePct: undefined,
                secondDoseCount: undefined,
                secondDosePct: undefined,
            }
        }

        if(!this.data.pages[pageIndex]){return;}
        const content = this.data.pages[pageIndex].content;
        const centrepoint = content.find(t => t.str.match(/people over the age of 16/));
        if(!centrepoint){return data}

        let minX = centrepoint.cx - centrepoint.width;
        let maxX = centrepoint.cx + centrepoint.width;

        const values = this.cleanCells(this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX), 0.1), 2);
        values.sort((a, b) => a.y - b.y);

        // console.log(values.map(v => v.str))

        for(let i = 0; i < values.length; i++){
            const v = values[i];
            const vnext = values[i+1];
            const vprev = values[i-1];

            if(v.str.match(/(people\s*over\s*the\s*age\s*of\s*16)/) && vprev && isNumber(vprev.str) && data.AUS.firstDoseCount === undefined){
                data.AUS.firstDoseCount = toNumber(vprev.str)
            }else if(v.str.match(/(people\s*over\s*the\s*age\s*of\s*16)/) && vprev && isNumberDecimal(vprev.str) && data.AUS.firstDosePct === undefined){
                data.AUS.firstDosePct = toNumber(vprev.str.replace('%', ''))
            }else if(v.str.match(/(people\s*over\s*the\s*age\s*of\s*16)/) && vprev && isNumber(vprev.str) && data.AUS.secondDoseCount === undefined){
                data.AUS.secondDoseCount = toNumber(vprev.str)
            }else if(v.str.match(/(people\s*over\s*the\s*age\s*of\s*16)/) && vprev && isNumberDecimal(vprev.str) && data.AUS.secondDosePct === undefined){
                data.AUS.secondDosePct = toNumber(vprev.str.replace('%', ''))
            }
        }

        return data;
    }

    async getDistributionData(buffer, pageNumber = 6){
        const p = await pdfTableExtractor(buffer);
        if(!p || !p.pageTables){
            return;
        }

        const distrbPage = p.pageTables.find(p => p.page === (pageNumber+1));
        if(!distrbPage || !distrbPage.tables){
            return;
        }

        if(distrbPage.tables.length === 0){
            return;
        }

        const states = ['NSW', 'VIC', 'QLD', 'WA', 'TAS', 'SA', 'ACT', 'NT'];
        const distributionData = {};
        for(const row of distrbPage.tables){
            const firstCol = row[0].trim().replace(/\s*[\n\r]\s*/g, ' ');
            let key;
            if(states.includes(firstCol)){
                key = firstCol; 
            }else if(firstCol.indexOf('Juristiction') > -1){
                key = 'stateClinics'
            }else if(firstCol.indexOf('Aged Care') > -1){
                key = 'cwthAgedCare'
            }else if(firstCol.indexOf('Primary Care') > -1){
                key = 'cwthPrimaryCare'
            }

            if(key){
                const estimatedUtilisationRaw = row[5].replace(/\%$/, '');
                const estimatedUtilisationPct = row[5] && row[5].indexOf('Fully') > -1 ? 100 : isNumber(estimatedUtilisationRaw) ? toNumber(estimatedUtilisationRaw) : undefined;
                distributionData[key] = {
                    distributed: isNumber(row[1]) ? toNumber(row[1]) : undefined,
                    available: isNumber(row[2]) ? toNumber(row[2]) : undefined,
                    administered: isNumber(row[3]) ? toNumber(row[3]) : undefined,
                    availableMinusAdministered: isNumber(row[4]) ? toNumber(row[4]) : undefined,
                    estimatedUtilisationPct
                }
            }
        }

        return distributionData
    }
}

module.exports = AusDeptHealthVaccinePdf;
