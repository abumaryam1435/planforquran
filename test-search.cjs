const quranData = require('./public/quran-search-v2.json');

const debouncedSearchQuery = "الرحمن";

const normalize = (str) => {
    return str.replace(/[ً-ٟۖ-ۜ۟-۪ۨ-ۭ]/g, '')
        .replace(/\u0670/g, 'ا')
        .replace(/[أإآاٱ]/g, 'ا')
        .replace(/[ةه]/g, 'ه')
        .replace(/[ىي]/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ء/g, '');
};

const terms = debouncedSearchQuery.trim().split(/\s+/).filter(t => t.length > 0).map(normalize);

const matches = [];
for (let i = 0; i < quranData.length; i++) {
    const ayah = quranData[i];
    const normalizedAyah = normalize(ayah.t);
    if (terms.every(term => normalizedAyah.includes(term))) {
    matches.push(ayah);
    }
}

console.log(`Found ${matches.length} matches for "${debouncedSearchQuery}"`);
if (matches.length > 0) {
    const result = matches[0];
    let highlighted = result.u;
    const searchTerms = debouncedSearchQuery.trim().split(/\s+/).filter(t => t.length > 0);
    searchTerms.forEach(term => {
        const normTerm = normalize(term);
        const pattern = normTerm.split('').map(char => {
            const harakat = '[\\u0617-\\u061A\\u0640\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E8\\u06EA-\\u06ED]*';
            if ('أإآاٱ'.includes(char)) return '[أإآاٱ]?' + harakat;
            if ('ةه'.includes(char)) return '[ةه]' + harakat;
            if ('يى'.includes(char)) return '[يى]?' + harakat;
            if ('وؤ'.includes(char)) return '[وؤ]?' + harakat;
            return char + harakat;
        }).join('');
        const regex = new RegExp(`(${pattern})`, 'gi');
        highlighted = highlighted.replace(regex, (match) => `<b class="highlight">${match}</b>`);
    });
    console.log("Original:", result.u);
    console.log("Highlighted:", highlighted);
}
