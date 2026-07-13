// Ações administrativas do catálogo — TUDO que edita/apaga dados passa por aqui.
// A senha é conferida aqui no servidor (nunca no navegador), e a chave "master"
// do Supabase (service_role) fica só nas variáveis de ambiente da Vercel, invisível
// pra qualquer pessoa que abrir o código-fonte do site.

const SB_URL = 'https://jhjchfesrxnpbabhylxs.supabase.co';

async function sbServiceFetch(path, opts) {
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  var headers = Object.assign({
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': (opts && opts.prefer) || 'return=representation'
  }, (opts && opts.headers) || {});
  return fetch(SB_URL + path, Object.assign({}, opts || {}, { headers: headers }));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }

  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  var acao = body.acao;
  var senha = body.senha;

  if (!process.env.ADMIN_PASSWORD || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, erro: 'Servidor ainda não configurado (faltam variáveis de ambiente).' });
  }

  if (senha !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, erro: 'Senha incorreta.' });
  }

  try {
    if (acao === 'login') {
      return res.status(200).json({ ok: true });
    }

    if (acao === 'salvarProduto') {
      var p = body.produto || {};
      var row = {
        nome: p.nome || '',
        preco: parseFloat(p.preco) || 0,
        img: p.img || '',
        imgoriginal: p.imgOriginal || '',
        descricao: p.desc || p.descricao || '',
        cat: p.cat || '',
        tam: p.tam || '',
        cod: p.cod || '',
        status: p.status || 'ativo',
        order_num: p.order || 0,
        medias: (p.medias || []).filter(function (m) { return m && (m.tipo === 'ref' || (m.data && m.data.startsWith('http'))); }),
        encaixe: p.encaixe || 'cover',
        posy: (p.posy != null) ? p.posy : 50,
        zoom: (p.zoom != null) ? p.zoom : 100
      };
      var r1 = await sbServiceFetch('/rest/v1/catalogo?on_conflict=cod', {
        method: 'POST',
        body: JSON.stringify([row]),
        prefer: 'resolution=merge-duplicates,return=representation'
      });
      if (!r1.ok) return res.status(500).json({ ok: false, erro: await r1.text() });
      var dados1 = await r1.json();
      return res.status(200).json({ ok: true, dados: dados1 });
    }

    if (acao === 'deletarProduto') {
      var cod = body.cod;
      if (!cod) return res.status(400).json({ ok: false, erro: 'Código não informado.' });
      await sbServiceFetch('/rest/v1/catalogo?cod=eq.' + encodeURIComponent(cod), { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    if (acao === 'salvarDestaques') {
      var lista = body.destaques || [];
      await sbServiceFetch('/rest/v1/destaques?order_num=gte.0', { method: 'DELETE' });
      if (lista.length) {
        var rows = lista.map(function (h, i) {
          return {
            id_local: h.id, emoji: h.emoji || '⭐', nome: h.nome || '', texto: h.texto || '',
            produtos: h.produtos || [], order_num: i
          };
        });
        var r2 = await sbServiceFetch('/rest/v1/destaques', { method: 'POST', body: JSON.stringify(rows) });
        if (!r2.ok) return res.status(500).json({ ok: false, erro: await r2.text() });
      }
      return res.status(200).json({ ok: true });
    }

    if (acao === 'salvarInspiracao') {
      var insp = body.inspiracao || {};
      var rowInsp = {
        id_local: insp.id,
        cod: insp.cod || '',
        img: insp.img || '',
        imgoriginal: insp.imgOriginal || '',
        descricao: insp.desc || '',
        encaixe: insp.encaixe || 'cover',
        posy: (insp.posy != null) ? insp.posy : 50,
        zoom: (insp.zoom != null) ? insp.zoom : 100,
        order_num: insp.order || 0
      };
      var r4 = await sbServiceFetch('/rest/v1/inspiracoes?on_conflict=cod', {
        method: 'POST',
        body: JSON.stringify([rowInsp]),
        prefer: 'resolution=merge-duplicates,return=representation'
      });
      if (!r4.ok) return res.status(500).json({ ok: false, erro: await r4.text() });
      var dados4 = await r4.json();
      return res.status(200).json({ ok: true, dados: dados4 });
    }

    if (acao === 'deletarInspiracao') {
      var codInsp = body.cod;
      if (!codInsp) return res.status(400).json({ ok: false, erro: 'Código não informado.' });
      await sbServiceFetch('/rest/v1/inspiracoes?cod=eq.' + encodeURIComponent(codInsp), { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    if (acao === 'upload') {
      var base64Data = body.base64Data;
      var nomeArquivo = body.nomeArquivo;
      if (!base64Data || !nomeArquivo) return res.status(400).json({ ok: false, erro: 'Dados incompletos.' });
      var arr = base64Data.split(',');
      var mimeMatch = arr[0].match(/:(.*?);/);
      var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      var buffer = Buffer.from(arr[1], 'base64');
      var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      var r3 = await fetch(SB_URL + '/storage/v1/object/medias/' + nomeArquivo, {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': mime, 'x-upsert': 'true' },
        body: buffer
      });
      if (!r3.ok) return res.status(500).json({ ok: false, erro: await r3.text() });
      return res.status(200).json({ ok: true, url: SB_URL + '/storage/v1/object/public/medias/' + nomeArquivo });
    }

    return res.status(400).json({ ok: false, erro: 'Ação desconhecida.' });
  } catch (err) {
    console.error('Erro admin:', err);
    return res.status(500).json({ ok: false, erro: 'Erro interno no servidor.' });
  }
};
