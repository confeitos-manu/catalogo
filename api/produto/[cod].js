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

// Retorna a URL só se for um link público de verdade (http/https).
// Fotos salvas como base64 (data:image/...) não funcionam como preview no WhatsApp.
function imagemPublica(url) {
  return url && /^https?:\/\//.test(url) ? url : null;
}

// Pega a primeira mídia da galeria que seja uma FOTO (não vídeo) com link público
function primeiraMediaUrl(medias) {
  const foto = medias.find(function (m) {
    return m && m.data && /^https?:\/\//.test(m.data) && (m.type || 'image') === 'image';
  });
  return foto ? foto.data : null;
}

function paginaNaoEncontrada(res) {
  res.status(404).send(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Produto não encontrado — Confeitos da Manu</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#333;">
<h2>🌸 Produto não encontrado</h2>
<p>Esse item pode ter sido removido ou o código mudou.</p>
<a href="/" style="color:#0095f6;">Ver catálogo completo</a>
</body></html>`);
}

function paginaEsgotada(res, nome) {
  res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Esgotado — Confeitos da Manu</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#333;">
<h2>😕 Essa variação esgotou</h2>
<p>${nome ? 'De "' + nome + '"' : 'Esse item'} não está disponível no momento, mas talvez outras opções estejam!</p>
<a href="/" style="color:#0095f6;">Ver catálogo completo</a>
</body></html>`);
}

module.exports = async (req, res) => {
  const cod = (req.query.cod || '').trim();
  if (!cod) return paginaNaoEncontrada(res);

  let produto, variante;
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/catalogo?cod=eq.${encodeURIComponent(cod)}&status=eq.ativo&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    const rows = await r.json();
    produto = rows && rows[0];

    // Não achou pelo código principal? Procura entre as variações (fotos com código próprio)
    if (!produto) {
      const rAll = await fetch(
        `${SB_URL}/rest/v1/catalogo?status=eq.ativo&limit=1000`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      );
      const todos = await rAll.json();
      for (const p of (todos || [])) {
        const m = (p.medias || []).find((x) => x && x.cod === cod);
        if (m) { produto = p; variante = m; break; }
      }
    }
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
  }

  if (!produto) return paginaNaoEncontrada(res);
  if (variante && variante.esgotado) return paginaEsgotada(res, produto.nome);

  const nome = (variante && variante.nome) ? variante.nome : (produto.nome || 'Produto');
  const diferenca = variante && variante.diferenca ? variante.diferenca : '';
  const preco = parseFloat(variante ? (variante.preco || produto.preco) : produto.preco) || 0;
  const precoFmt = 'R$ ' + preco.toFixed(2).replace('.', ',');
  const desc = diferenca || produto.descricao || 'Confeitos da Manu — chocolates artesanais feitos com carinho.';
  const imagem = variante
    ? (imagemPublica(variante.data) || imagemPublica(produto.img) || '')
    : (imagemPublica(produto.img) || (produto.medias && produto.medias.length && primeiraMediaUrl(produto.medias)) || '');
  const encaixe = (produto.encaixe === 'contain') ? 'contain' : 'cover';
  const posY = (produto.posy != null && produto.posy !== '') ? produto.posy : 50;
  const zoom = (produto.zoom != null && produto.zoom !== '') ? produto.zoom : 100;
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
.foto{width:100%;position:relative;padding-top:125%;background:#f0f0f0;overflow:hidden;}
.foto img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:${encaixe};object-position:center ${variante ? 50 : posY}%;transform:scale(${variante ? 1 : zoom/100});transform-origin:center ${variante ? 50 : posY}%;}
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
<a class="voltar" href="/">← Ver catálogo completo</a>
</div>
</body>
</html>`);
};
