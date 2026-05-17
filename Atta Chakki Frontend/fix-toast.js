const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let files = [];
walkDir('src', function(filePath) {
  if (filePath.endsWith('.jsx')) {
    files.push(filePath);
  }
});

let modified = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('toast.custom((t) => (')) {
    let oldDivClass = 'className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-lg flex flex-col gap-3 max-w-sm"';
    let newDivClass = 'className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm"';
    
    let oldPClass = 'className="text-slate-900 dark:text-white font-medium"';
    let newPClass = 'className="text-primary-foreground font-medium"';
    
    let oldCancelBtnClass = 'className="bg-slate-100 dark:bg-slate-800"';
    let newCancelBtnClass = 'className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-transparent"';
    
    let oldDeleteBtnClass = 'className="bg-red-600 hover:bg-red-700 text-white"';
    let newDeleteBtnClass = 'className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"';
    
    let oldConfirmBtnClass = 'className="bg-emerald-600 hover:bg-emerald-700 text-white"';
    let newConfirmBtnClass = 'className="bg-green-600 text-white hover:bg-green-700 border-transparent"';

    let newContent = content
      .split(oldDivClass).join(newDivClass)
      .split(oldPClass).join(newPClass)
      .split(oldCancelBtnClass).join(newCancelBtnClass)
      .split(oldDeleteBtnClass).join(newDeleteBtnClass)
      .split(oldConfirmBtnClass).join(newConfirmBtnClass);
      
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      modified++;
      console.log('Modified', file);
    }
  }
}

console.log('Total files modified:', modified);
