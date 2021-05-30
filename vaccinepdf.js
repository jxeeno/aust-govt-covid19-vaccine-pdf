const PDFExtract = require('pdf.js-extract').PDFExtract;
const moment = require('moment');
const pdfExtract = new PDFExtract();
const options = {}; /* see below */

const toNumber = (str, sign) => {
    const neg = (sign === '-' ? -1 : 1);
    return neg * Number(str.replace(/,/g, ''));
};

const isNumber = str => !!str.trim().match(/^[0-9,]+$/);

class AusDeptHealthVaccinePdf {
    constructor(){

    }

    mergeAdjacentCells(values, thresh = 0.07){
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
                const adjIndex = valuesSortX.findIndex((adjacentValue, ii) => !excluded.has(ii) && Math.abs(adjacentValue.x - rightX) < 4 && Math.abs(adjacentValue.cy - value.cy) < 4);
                if(adjIndex > -1){
                    const adj = valuesSortX[adjIndex];
                    const xdiff = Math.abs(adj.x - rightX);
                    const ydiff = Math.abs(adj.cy - value.cy);
                    console.log(`merge ${value.str} with ${adj.str} (${xdiff}, ${ydiff})`);
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

    cleanCells(values){
        // this removes all the unnecessary content like asterisk
        // or hashes then filters out empty lines for simplicity 
        return values.map(v => ({
            ...v,
            str: v.str.trim().replace(/[^a-zA-Z0-9,+\-\(\)\s]/g, '').trim()
        })).filter(v => v.str !== '');
    }

    async parsePdf(buffer){
        this.data = await pdfExtract.extractBuffer(buffer, options);
        for(const page of this.data.pages){
            page.content = page.content.map(l => ({ ...l, cx: l.x + l.width / 2, cy: l.y + l.height / 2 }));
        }

        const stateClinics = this.getStateData(1);
        const cwthAgedCare = this.getStateData(4);
        const cwthPrimaryCare = this.getStateData(5);
        const totals = this.getLeftPanelData();
        const cwthAgedCareBreakdown = this.getAgedCareLeftPanelData();
        const dataAsAt = this.getDataAsAt() || this.getDataAsAt(2) || this.getDataAsAt(3);

        const output = {
            dataAsAt,
            totals,
            stateClinics,
            cwthAgedCare,
            cwthPrimaryCare,
            cwthAgedCareBreakdown,
        };
        
        console.log(output)

        return output;
    }

    getStateData(pageIndex = 1){
        const content = this.data.pages[pageIndex].content;
        const states = ['NSW', 'VIC', 'QLD', 'WA', 'TAS', 'SA', 'ACT', 'NT'];
        const stateLabelLocations = content.filter(t => states.includes(t.str.trim()));

        const width = Math.max(...stateLabelLocations.map(l => l.width)) * 2; // width of circle is at most 3x max width of state label
        const height = Math.max(...stateLabelLocations.map(l => l.height)) * 4; // height of circle is at most 4x height of state label

        const stateData = {};

        for (const state of stateLabelLocations) {
            let minX = state.cx - width;
            let maxX = state.cx + width;
            let minY = state.cy;
            let maxY = state.cy + height;

            const stateCode = state.str.trim();

            const values = this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX && t.cy >= minY && t.cy <= maxY));

            const combinedStr = values.map(v => v.str.trim().replace(/[^a-zA-Z0-9,+\-\(\)\s]/g, '')).join(' ');
            const matches = combinedStr.match(/([0-9,]+)\s+\(([\+\-])?\s*([0-9,]+)(?:\s*\**)\s*last\s*24\s*hours\s*\)/);
            // console.log(pageIndex, combinedStr, matches)

            if(matches){
                stateData[stateCode] = {
                    total: toNumber(matches[1]),
                    last24hr: toNumber(matches[3], matches[2])
                }
            }
        }

        return stateData;
    }

    getDataAsAt(pageIndex = 1, matchText = 'Data as at:'){
        const content = this.data.pages[pageIndex].content;
        const centrepoint = content.find(t => t.str.includes(matchText));
        if(!centrepoint){return;}

        let minX = centrepoint.cx - centrepoint.width;
        let maxX = centrepoint.cx + centrepoint.width;

        const values = content.filter(t => t.cx >= minX && t.cx <= maxX);
        values.sort((a, b) => a.y - b.y);

        for(let i = 0; i < values.length; i++){
            const v = values[i];
            const vnext = values[i+1];
            const vprev = values[i-1];

            if(v.str.includes(matchText) && vnext && vnext.str.match(/[0-9]+ [A-Za-z]+ 202[0-9]+/)){
                return moment(vnext.str.trim(), 'DD MMM YYYY').format('YYYY-MM-DD');
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

        const isLast24HrNumber = str => str.trim().match(/\(([\+\-])\s?([0-9,]+) last 24 hours\)/);

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

    getAgedCareLeftPanelData(pageIndex = 4, matchText = 'disability doses administered'){
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

        const content = this.data.pages[pageIndex].content;
        const centrepoint = content.find(t => t.str.includes(matchText));
        if(!centrepoint){return data}

        let minX = centrepoint.cx - centrepoint.width;
        let maxX = centrepoint.cx + centrepoint.width;

        const values = this.cleanCells(this.mergeAdjacentCells(content.filter(t => t.cx >= minX && t.cx <= maxX), 0.1));
        values.sort((a, b) => a.y - b.y);

        // console.log(values.map(s => s.str));

        for(let i = 0; i < values.length; i++){
            const v = values[i];
            const vnext = values[i+1];
            const vprev = values[i-1];

            if(v.str.includes('First doses') && vprev && isNumber(vprev.str) && data.cwthAgedCareDoses.firstDose === undefined){
                data.cwthAgedCareDoses.firstDose = toNumber(vprev.str)
            }else if(v.str.includes('Second doses') && vprev && isNumber(vprev.str) && data.cwthAgedCareDoses.secondDose === undefined){
                data.cwthAgedCareDoses.secondDose = toNumber(vprev.str)
            }else if(v.str.includes('Sites visited for first doses') && vprev && isNumber(vprev.str) && data.cwthAgedCareFacilities.firstDose === undefined){
                data.cwthAgedCareFacilities.firstDose = toNumber(vprev.str)
            }else if(v.str.includes('Sites visited for second doses') && vprev && isNumber(vprev.str) && data.cwthAgedCareFacilities.secondDose === undefined){
                data.cwthAgedCareFacilities.secondDose = toNumber(vprev.str)
            }
        }

        return data;
    }
}

module.exports = AusDeptHealthVaccinePdf;
