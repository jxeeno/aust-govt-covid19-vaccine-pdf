const PDFExtract = require('pdf.js-extract').PDFExtract;
const moment = require('moment');
const pdfExtract = new PDFExtract();
const mergeAdjacentCells = (values, thresh = 0.07, joinThreshX = 4, joinThreshY = 4) => {
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
const getDataAsAt = async (pdf, matchText = /data\s*as\s*at/i) => {
    const data = await pdfExtract.extractBuffer(pdf, {});
    for(const page of data.pages){
        page.content = page.content.map(l => ({ ...l, cx: l.x + l.width / 2, cy: l.y + l.height / 2 }));
    }
    for(const page of data.pages){
        const content = mergeAdjacentCells(page.content);
        const centrepoint = content.find(t => t.str.match(matchText));
        // console.log({centrepoint})
        if(!centrepoint){continue;}

        let minX = centrepoint.cx - centrepoint.width;
        let maxX = centrepoint.cx + centrepoint.width;

        const values = content.filter(t => t.cx >= minX && t.cx <= maxX).map(s => s.str.replace(/\s+/g, ' '));
        values.sort((a, b) => a.y - b.y);

        // console.log(values)

        for(let i = 0; i < values.length; i++){
            const v = values[i];
            const vnext = values[i+1];
            const vprev = values[i-1];

            if(v.match(matchText) && vnext && vnext.match(/[0-9]+\s*[A-Za-z]+\.?\s*202[0-9]+/)){
                return moment(vnext.trim(), 'DD MMM YYYY').format('YYYY-MM-DD');
            }
        }
    }
}

module.exports = getDataAsAt;