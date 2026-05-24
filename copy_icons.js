const fs = require('fs');
const src = 'C:/Users/Usuario/.gemini/antigravity/brain/aef425c6-cb6e-4a2c-bab8-368bc675ced2/clave_1001_icon_1778739852576.png';
const data = fs.readFileSync(src);
fs.writeFileSync('./public/logo192.png', data);
fs.writeFileSync('./public/logo512.png', data);
console.log('Icons copied successfully!');
