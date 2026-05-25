const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('client/app/**/page.tsx');
let count = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if(content.includes('<header className="')) {
    let replaced = content.replace(/<header className="([^"]+)">/g, (match, classes) => {
      let newClasses = classes;
      
      // Fix sticky top-4 to top-0
      newClasses = newClasses.replace(/top-4/g, 'top-0');
      
      return `<header className="${newClasses}">`;
    });
    
    if(replaced !== content) {
      fs.writeFileSync(f, replaced);
      console.log('Updated', f);
      count++;
    }
  }
});
console.log('Total updated:', count);
