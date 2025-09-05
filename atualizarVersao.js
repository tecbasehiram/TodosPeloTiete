const fs = require('fs');
const path = require('path');

const pastaRaiz = './'; // ou qualquer pasta onde estão seus HTMLs
const versao = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); // Ex: 202503311210

function atualizarVersaoNosLinks(html) {
  // Atualiza <link rel="stylesheet">
  html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+?)"/g, (match, href) => {
    if (href.startsWith('http')) return match; // pula externos
    const novoHref = href.replace(/\?v=[^"]*/g, '').split('#')[0] + `?v=${versao}`;
    return match.replace(href, novoHref);
  });

  // Atualiza <script src="...">
  html = html.replace(/<script\s+[^>]*src="([^"]+?)"/g, (match, src) => {
    if (src.startsWith('http')) return match; // pula externos
    const novoSrc = src.replace(/\?v=[^"]*/g, '').split('#')[0] + `?v=${versao}`;
    return match.replace(src, novoSrc);
  });

  return html;
}

function processarArquivosHTML(pasta) {
  fs.readdirSync(pasta).forEach(arquivo => {
    const caminhoCompleto = path.join(pasta, arquivo);
    const stat = fs.statSync(caminhoCompleto);

    if (stat.isDirectory()) {
      processarArquivosHTML(caminhoCompleto); // recursão
    } else if (arquivo.endsWith('.html')) {
      let conteudo = fs.readFileSync(caminhoCompleto, 'utf-8');
      const novoConteudo = atualizarVersaoNosLinks(conteudo);

      fs.writeFileSync(caminhoCompleto, novoConteudo, 'utf-8');
      console.log(`✔ Atualizado: ${caminhoCompleto}`);
    }
  });
}

processarArquivosHTML(pastaRaiz);
console.log(`🏁 Versão aplicada: v=${versao}`);