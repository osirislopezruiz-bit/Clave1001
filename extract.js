const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');
const start = code.indexOf('<style>{`');
const end = code.indexOf('`}</style>');

if (start !== -1 && end !== -1) {
  const css = code.substring(start + 9, end);
  if (!fs.existsSync('src/styles')) {
    fs.mkdirSync('src/styles');
  }
  fs.writeFileSync('src/styles/App.css', css);
  
  let newCode = code.substring(0, start) + '      {/* Estilos migrados a src/styles/App.css */}\n' + code.substring(end + 10);
  newCode = "import './styles/App.css';\n" + newCode;
  
  fs.writeFileSync('src/App.jsx', newCode);
  console.log('CSS extraido correctamente!');
} else {
  console.log('No se encontro style tag');
}
