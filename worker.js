// ═══════════════════════════════════════════════════════════
//   🐺 Worker du site — Les Vieux Loups de l'EHPAD
//   Sert le site statique normalement, et gère en plus la
//   suppression protégée par mot de passe des photos de la
//   galerie (POST /api/galerie-supprimer).
//
//   Secrets nécessaires (Dashboard Cloudflare → ton Worker →
//   Settings → Variables and Secrets) :
//     GITHUB_TOKEN    → même token que celui du bot Discord
//     GITHUB_REPO     → "TonPseudo/site-vieux-loups"
//     GITHUB_BRANCH   → "main"
//     ADMIN_PASSWORD  → le mot de passe pour supprimer une photo
// ═══════════════════════════════════════════════════════════

const CHEMIN_GALERIE = 'galerie.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/galerie-supprimer' && request.method === 'POST') {
      return supprimerPhoto(request, env);
    }

    // Tout le reste : fichiers statiques du site, comme avant
    return env.ASSETS.fetch(request);
  }
};

function reponseJSON(objet, statut = 200) {
  return new Response(JSON.stringify(objet), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function supprimerPhoto(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return reponseJSON({ ok: false, erreur: 'Requête invalide.' }, 400);
  }

  const { motDePasse, photoUrl } = body || {};

  if (!env.ADMIN_PASSWORD) {
    return reponseJSON({ ok: false, erreur: 'ADMIN_PASSWORD non configuré côté serveur.' }, 500);
  }
  if (!motDePasse || motDePasse !== env.ADMIN_PASSWORD) {
    return reponseJSON({ ok: false, erreur: 'Mot de passe incorrect.' }, 401);
  }
  if (!photoUrl) {
    return reponseJSON({ ok: false, erreur: 'Photo manquante.' }, 400);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return reponseJSON({ ok: false, erreur: 'Pont GitHub non configuré côté serveur.' }, 500);
  }

  const branche = env.GITHUB_BRANCH || 'main';
  const apiBase = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(CHEMIN_GALERIE)}`;
  const entetes = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'VieuxLoups-Site-Worker',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // 1. Lire le fichier galerie.js actuel sur GitHub
  const getRep = await fetch(`${apiBase}?ref=${branche}`, { headers: entetes });
  if (!getRep.ok) {
    return reponseJSON({ ok: false, erreur: `Lecture GitHub échouée (${getRep.status}).` }, 500);
  }
  const getData = await getRep.json();
  const contenuActuel = decodeURIComponent(escape(atob(getData.content.replace(/\n/g, ''))));

  // 2. Extraire le tableau JSON du fichier
  const correspondance = contenuActuel.match(/const GALERIE = (\[[\s\S]*?\]);/);
  if (!correspondance) {
    return reponseJSON({ ok: false, erreur: 'Format de galerie.js inattendu.' }, 500);
  }

  let galerie;
  try {
    // Le fichier peut contenir un tableau JS littéral (clés non guillemetées,
    // ex: { url: "...", auteur: "..." }) plutôt que du JSON strict.
    // Cloudflare Workers interdit new Function()/eval, donc on ne peut pas
    // évaluer ça comme du JS : on ajoute des guillemets autour des clés
    // (si elles n'en ont pas déjà) puis on fait un JSON.parse classique.
    const avecGuillemets = correspondance[1].replace(
      /([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g,
      '$1"$2":'
    );
    galerie = JSON.parse(avecGuillemets);
    if (!Array.isArray(galerie)) throw new Error('pas un tableau');
  } catch {
    return reponseJSON({ ok: false, erreur: 'Impossible de lire le contenu de la galerie.' }, 500);
  }

  // 3. Retirer la photo ciblée
  const avant = galerie.length;
  galerie = galerie.filter(p => p.url !== photoUrl);
  if (galerie.length === avant) {
    return reponseJSON({ ok: false, erreur: 'Photo introuvable (déjà supprimée ?).' }, 404);
  }

  // 4. Régénérer le fichier (même format que le bot Discord)
  const lignes = galerie.map(p => '  ' + JSON.stringify(p)).join(',\n');
  const nouveauContenu = `// ═══════════════════════════════════════════════════════════
//   🖼️ GALERIE PHOTO — Les Vieux Loups de l'EHPAD
//   Mise à jour automatiquement par le bot Discord / le site.
//   Ne pas éditer à la main.
// ═══════════════════════════════════════════════════════════

const GALERIE = [
${lignes}
];

if (typeof module !== "undefined") module.exports = GALERIE;
`;

  // 5. Réécrire le fichier sur GitHub (déclenche le redéploiement automatique)
  const putRep = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...entetes, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: '🗑️ Suppression photo galerie via le site',
      content: btoa(unescape(encodeURIComponent(nouveauContenu))),
      branch: branche,
      sha: getData.sha
    })
  });

  if (!putRep.ok) {
    return reponseJSON({ ok: false, erreur: `Écriture GitHub échouée (${putRep.status}).` }, 500);
  }

  return reponseJSON({ ok: true, restantes: galerie.length });
}
