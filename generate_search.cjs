const fs = require('fs');
async function run() {
  try {
    console.log("Fetching uthmani...");
    const r1 = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
    const uData = await r1.json();
    console.log("Fetching simple-clean...");
    const r2 = await fetch('https://api.alquran.cloud/v1/quran/quran-simple-clean');
    const sData = await r2.json();

    const ayahs = [];
    for (let i = 0; i < uData.data.surahs.length; i++) {
      const uSurah = uData.data.surahs[i];
      const sSurah = sData.data.surahs[i];
      
      for (let j = 0; j < uSurah.ayahs.length; j++) {
        const uAyah = uSurah.ayahs[j];
        const sAyah = sSurah.ayahs[j];
        
        ayahs.push({
          s: uSurah.name,
          n: uAyah.numberInSurah,
          p: uAyah.page,
          t: sAyah.text,
          u: uAyah.text
        });
      }
    }

    fs.writeFileSync('public/quran-search.json', JSON.stringify(ayahs));
    console.log("Done! Total ayahs: " + ayahs.length);
  } catch (e) {
    console.error(e);
  }
}
run();
