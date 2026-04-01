const fs = require('fs');
const path = require('path');
function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      const RUPEE = '\u20B9';
      if (content.includes(RUPEE)) {
        content = content.split(RUPEE).join('AED ');
        modified = true;
      }
      if (content.includes('INR')) {
        content = content.split('INR').join('AED');
        modified = true;
      }
      if (content.includes('(AED )')) {
        content = content.split('(AED )').join('(AED)');
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
      }
    }
  });
}
walk('c:/Users/roshi/linotec-ticket-system/frontend/src');
console.log("Done");
