// Feed de produtos pra Meta Commerce Manager (Facebook/Instagram Shopping).
// Atualiza sozinho: a Meta busca esse link periodicamente (você escolhe de quanto em quanto
// tempo lá no Commerce Manager), então basta editar os produtos no catálogo normalmente —
// não precisa reenviar nada manualmente pra Meta.
// Rota: /api/meta-feed  →  cole essa URL completa em Commerce Manager > Fontes de dados > Arquivo de dados > "Usar um link"

const SB_URL = 'https://jhjchfesrxnpbabhylxs.supabase.co';
const SB_KEY = 'sb_publishable_cz83j5R_8j0yUaWFhFVMuw_m_QqfCoi';
const SITE_URL = 'https://confeitosdamanu.vercel.app';

// Protege texto com caracteres especiais (&, <, >) sem precisar escapar um por um.
// Só cuidado com "]]>" dentro do próprio texto — bem raro, mas quebraria o XML sem esse tratamento.
function cdata(str) {
  var s = String(str || '').replace(/\]\]>/g, ']]]]><![CDATA[>');
  return '<![CDATA[' + s + ']]>';
}

// Pra link/imagem (não usam CDATA), só o "&" precisa virar &amp; pro XML não quebrar
function escUrl(str) {
  return String(str || '').replace(/&/g, '&amp;');
}

module.exports = async (req, res) => {
  var produtos = [];
  try {
    var r = await fetch(
      SB_URL + '/rest/v1/catalogo?status=neq.escondido&select=cod,nome,preco,img,descricao,status&order=order_num.asc&limit=2000',
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }
    );
    produtos = await r.json();
  } catch (err) {
    console.error('Erro ao buscar produtos pro feed da Meta:', err);
  }

  var itens = (produtos || [])
    // só entra no feed quem tem o mínimo pra ser vendável: código, nome, foto de verdade (não vazia/base64) e preço
    .filter(function (p) { return p && p.cod && p.nome && p.img && p.img.indexOf('http') === 0 && p.preco; })
    .map(function (p) {
      var link = SITE_URL + '/produto/' + encodeURIComponent(p.cod);
      var preco = (parseFloat(p.preco) || 0).toFixed(2) + ' BRL';
      // Esgotado não sai do feed, só marca como indisponível — assim a Meta sabe mostrar
      // "esgotado" em vez de simplesmente sumir o produto do catálogo dela
      var disponibilidade = p.status === 'esgotado' ? 'out of stock' : 'in stock';
      var desc = p.descricao || (p.nome + ' — Confeitos da Manu, buquês de chocolate e flores artesanais.');
      return '  <item>\n' +
        '    <g:id>' + p.cod + '</g:id>\n' +
        '    <g:title>' + cdata(p.nome) + '</g:title>\n' +
        '    <g:description>' + cdata(desc) + '</g:description>\n' +
        '    <g:availability>' + disponibilidade + '</g:availability>\n' +
        '    <g:condition>new</g:condition>\n' +
        '    <g:price>' + preco + '</g:price>\n' +
        '    <g:link>' + escUrl(link) + '</g:link>\n' +
        '    <g:image_link>' + escUrl(p.img) + '</g:image_link>\n' +
        '    <g:brand>' + cdata('Confeitos da Manu') + '</g:brand>\n' +
        '  </item>';
    }).join('\n');

  var xml = '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    '<channel>\n' +
    '  <title>Confeitos da Manu</title>\n' +
    '  <link>' + SITE_URL + '</link>\n' +
    '  <description>Catálogo de produtos — Confeitos da Manu</description>\n' +
    itens + '\n' +
    '</channel>\n' +
    '</rss>';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(xml);
};
