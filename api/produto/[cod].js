// Página individual de produto — gera preview com foto/nome no WhatsApp (Open Graph)
// Rota: /api/produto/043  (ou configurada como /produto/043 via vercel.json)

const SB_URL = 'https://jhjchfesrxnpbabhylxs.supabase.co';
const SB_KEY = 'sb_publishable_cz83j5R_8j0yUaWFhFVMuw_m_QqfCoi';
const WA_NUMERO = '5549998058794'; // mesmo número já usado no catálogo

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paginaNaoEncontrada(res) {
  res.status(404).send(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Produto não encontrado — Confeitos da Manu</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#333;">
<h2>🌸 Produto não encontrado</h2>
<p>Esse item pode ter sido removido ou o código mudou.</p>
<a href="/catalogo" style="color:#0095f6;">Ver catálogo completo</a>
</body></html>`);
}

module.exports = async (req, res) => {
  const cod = (req.query.cod || '').trim();
  if (!cod) return paginaNaoEncontrada(res);

  let produto;
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/catalogo?cod=eq.${encodeURIComponent(cod)}&status=eq.ativo&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    const rows = await r.json();
    produto = rows && rows[0];
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
  }

  if (!produto) return paginaNaoEncontrada(res);

  const nome = produto.nome || 'Produto';
  const preco = parseFloat(produto.preco) || 0;
  const precoFmt = 'R$ ' + preco.toFixed(2).replace('.', ',');
  const desc = produto.descricao || 'Confeitos da Manu — chocolates artesanais feitos com carinho.';
  const imagem = produto.img || (produto.medias && produto.medias[0] && produto.medias[0].data) || '';
  const urlAtual = `https://${req.headers.host}/produto/${encodeURIComponent(cod)}`;

  const msgWA = `Oii! Vim pelo link e quero pedir:\n[#${cod}] ${nome} - ${precoFmt}\n\n${urlAtual}`;
  const linkWA = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(msgWA)}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(nome)} — Confeitos da Manu</title>

<meta property="og:title" content="${escapeHtml(nome)} — Confeitos da Manu">
<meta property="og:description" content="${escapeHtml(precoFmt)} · ${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(imagem)}">
<meta property="og:type" content="product">
<meta property="og:url" content="${escapeHtml(urlAtual)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(nome)} — Confeitos da Manu">
<meta name="twitter:description" content="${escapeHtml(precoFmt)}">
<meta name="twitter:image" content="${escapeHtml(imagem)}">

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:#fafafa;color:#111;max-width:480px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;}
.foto{width:100%;aspect-ratio:1;background:#f0f0f0;overflow:hidden;}
.foto img{width:100%;height:100%;object-fit:cover;}
.corpo{padding:20px 18px;flex:1;}
.nome{font-size:1.15rem;font-weight:700;margin-bottom:6px;}
.preco{font-size:1.3rem;font-weight:700;color:#111;margin-bottom:14px;}
.desc{font-size:0.9rem;color:#555;line-height:1.6;margin-bottom:24px;}
.btn{display:block;text-align:center;background:#25a244;color:#fff;text-decoration:none;padding:14px;border-radius:50px;font-weight:700;font-size:0.95rem;}
.voltar{display:block;text-align:center;margin-top:14px;color:#888;font-size:0.82rem;text-decoration:none;}
</style>
</head>
<body>
<div class="foto">${imagem ? `<img src="${escapeHtml(imagem)}" alt="${escapeHtml(nome)}">` : ''}</div>
<div class="corpo">
<div class="nome">${escapeHtml(nome)}</div>
<div class="preco">${escapeHtml(precoFmt)}</div>
<div class="desc">${escapeHtml(desc)}</div>
<a class="btn" href="${linkWA}">Pedir esse pelo WhatsApp 🌸</a>
<a class="voltar" href="/catalogo">← Ver catálogo completo</a>
</div>
</body>
</html>`);
};
