let highlighted = "بسم الله";
const regex = new RegExp(`()`, 'gi');
highlighted = highlighted.replace(regex, (match) => `<b>${match}</b>`);
console.log(highlighted);
