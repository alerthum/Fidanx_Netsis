const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('client/app/**/page.tsx');
let count = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if(content.includes('<header className="')) {
    let replaced = content.replace(/<header className="([^"]+)">/g, (match, classes) => {
      if(classes.includes('lg:h-[88px]')) return match;
      
      let newClasses = classes;
      
      // Remove conflicting vertical paddings for lg
      newClasses = newClasses.replace(/lg:py-\d+/g, '').replace(/lg:p-\d+/g, '');
      newClasses = newClasses.replace(/py-\d+/g, 'py-4').replace(/p-\d+/g, 'p-4'); 
      
      // Add the height and reset lg py
      if(!newClasses.includes('lg:py-0')) newClasses += ' lg:py-0';
      if(!newClasses.includes('lg:h-[88px]')) newClasses += ' lg:h-[88px]';
      if(!newClasses.includes('shrink-0')) newClasses += ' shrink-0';
      
      // Make sure flex row kicks in at lg to match sidebar
      newClasses = newClasses.replace(/sm:flex-row/g, 'lg:flex-row').replace(/sm:items-center/g, 'lg:items-center');
      
      return `<header className="${newClasses.trim().replace(/\s+/g, ' ')}">`;
    });
    
    if(replaced !== content) {
      fs.writeFileSync(f, replaced);
      console.log('Updated', f);
      count++;
    }
  }
});
console.log('Total updated:', count);
