const AusDeptHealthVaccinePdf = require('./vaccinepdf');
const axios = require('axios');

const scrapeyscrape = async (url, url2) => {
  console.log('attempting to fetch ' + url);
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer'
  });

  let data2;
  if(url2){
    console.log('attempting to fetch ' + url2);
    const { data } = await axios.get(url2, {
      responseType: 'arraybuffer'
    });
    if(data){
      data2 = data;
    }
  }

  console.log('got pdfs from website');
  const vpdf = new AusDeptHealthVaccinePdf();
  const resp = await vpdf.parsePdf(data, data2);
  console.log('parsed pdfs');
  console.log(JSON.stringify(resp, null, 2))
};

scrapeyscrape(process.argv[2], process.argv[3]);