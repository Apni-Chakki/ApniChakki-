const fs = require('fs');
const code = fs.readFileSync('Atta Chakki Frontend/src/components/customer/Checkout.jsx', 'utf8');

let stack = [];
let lines = code.split('\n');
let lineNum = 1;

try {
  const babel = require('@babel/core');
  babel.transformSync(code, { presets: ['@babel/preset-react'] });
  console.log('Babel parse OK');
} catch (e) {
  console.log('Error:', e.message);
  console.log(e.loc);
}
