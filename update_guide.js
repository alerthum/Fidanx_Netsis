const fs = require('fs');
const filePath = 'c:\\Users\\ibrahimyokus\\Desktop\\convert\\Fidanx_Netsis\\client\\components\\uretim\\GuideModal.tsx';

let content = fs.readFileSync(filePath);
let text = content.toString('utf8');

console.log('File size:', text.length, 'bytes');

// TEST what's around "amber" and "Bekleyen" area - byte level search
const bekleyenSearch = Buffer.from('Bekleyen', 'utf8');
const idx = content.indexOf(bekleyenSearch);
console.log('Bekleyen buffer search:', idx);

// Maybe it's stored differently. Let's look for ASCII-safe anchors around line 105
const anchor1 = 'font-black text-amber-800 uppercase tracking-widest mb-3';
const a1idx = text.indexOf(anchor1);
console.log('amber-800 h5 anchor:', a1idx);
if (a1idx > 0) {
    console.log('Context:', text.substring(a1idx - 50, a1idx + 200));
}
