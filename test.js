const AusDeptHealthVaccinePdf = require('./vaccinepdf');
const axios = require('axios');

const justdoitdammit = async url => {
  console.log('attempting to fetch ' + url);
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
    }
  });

  console.log('got pdf from website');
  const vpdf = new AusDeptHealthVaccinePdf();
  const resp = await vpdf.parsePdf(data);
  console.log('parsed pdf');
};

justdoitdammit(process.argv[3]);