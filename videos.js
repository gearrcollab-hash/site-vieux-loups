// ═══════════════════════════════════════════════════════════
//   🎬 Vidéos d'accueil du site
//   Stockées dans database.json → videos[] (3 emplacements),
//   puis poussées vers GitHub pour mettre à jour le site.
// ═══════════════════════════════════════════════════════════

const Github = require('./github');

const DEFAUTS = [
  { url: '', image: '', titre: '🎬 Dernière opération', desc: 'La meute en action sur FratWorld.' },
  { url: '', image: '', titre: '🦽 Best-of de la meute', desc: 'Les moments cultes des Vieux Loups.' },
  { url: '', image: '', titre: '⚔️ Guerre de territoire', desc: "Quand l'EHPAD montre les crocs." }
];

function lire(client) {
  const db = client.db.load();
  if (!db.videos || db.videos.length !== 3) db.videos = JSON.parse(JSON.stringify(DEFAUTS));
  // Assurer que chaque entrée a un champ image
  db.videos.forEach(v => { if (v.image === undefined) v.image = ''; });
  return db.videos;
}

function definir(client, index, url, image) {
  const videos = lire(client);
  videos[index].url = url;
  if (image !== undefined) videos[index].image = image;
  const db = client.db.load();
  db.videos = videos;
  client.db.save(db);
  return videos;
}

/** Génère le contenu texte du fichier videos.js à envoyer sur GitHub */
function genererFichier(videos) {
  const lignes = videos.map(v =>
    `  { url: ${JSON.stringify(v.url)}, image: ${JSON.stringify(v.image || '')}, titre: ${JSON.stringify(v.titre)}, desc: ${JSON.stringify(v.desc)} }`
  ).join(',\n');

  return `// ═══════════════════════════════════════════════════════════
//   🎬 VIDÉOS D'ACCUEIL — Les Vieux Loups de l'EHPAD
//   Mis à jour automatiquement par le bot Discord (+video).
//   Ne pas éditer à la main.
// ═══════════════════════════════════════════════════════════

const VIDEOS = [
${lignes}
];

if (typeof module !== "undefined") module.exports = VIDEOS;
`;
}

/** Pousse les vidéos vers GitHub (déclenche le redéploiement Netlify) */
async function publier(client, videos) {
  const contenu = genererFichier(videos);
  await Github.ecrireFichier('videos.js', contenu, '🎬 Mise à jour des vidéos via le bot');
}

module.exports = { lire, definir, genererFichier, publier };
