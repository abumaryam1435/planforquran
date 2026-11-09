const https = require('https');

const urls = [
  "https://raw.githubusercontent.com/hasandor/Quran-Pages/master/page001.png",
  "https://raw.githubusercontent.com/hasandor/Quran-Pages/master/001.png",
  "https://raw.githubusercontent.com/spaussa/quran_images/master/db/images/1024/page001.png",
  "https://raw.githubusercontent.com/spaussa/quran_images/main/db/images/1024/page001.png",
  "https://cdn.islamic.network/quran/images/1_1.png",
  "https://cdn.islamic.network/quran/images/page1.png",
  "https://cdn.islamic.network/quran/images/page001.png",
  "https://cdn.islamic.network/quran/images/1.png",
  "https://cdn.islamic.network/quran/images/001.png",
  "https://cdn.islamic.network/quran/images/1_1.png",
  "https://quran.com/images/page1.png",
  "https://images.quran.com/page1.png",
];

const check = (url) => new Promise(resolve => {
  https.get(url, (res) => {
    resolve({ url, status: res.statusCode });
  }).on('error', () => resolve({ url, status: 'error' }));
});

Promise.all(urls.map(check)).then(console.log);
