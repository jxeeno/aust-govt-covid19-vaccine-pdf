const AusDeptHealthVaccinePdf = require('./vaccinepdf');
const axios = require('axios');

const scrapeyscrape = async url => {
  console.log('attempting to fetch ' + url);
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer'
  });

  console.log('got pdf from website');
  const vpdf = new AusDeptHealthVaccinePdf();
  await vpdf.parsePdf(data);
  console.log('parsed pdf');
};

scrapeyscrape(process.argv[2]);