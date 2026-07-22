// ═══════════════════════════════════════════════════════════
//   🎥 STREAMERS PARTENAIRES — Les Vieux Loups de l'EHPAD
//
//   Pour ajouter/modifier/supprimer un streamer :
//   → ouvre "admin.html" dans ton navigateur, remplis le
//     formulaire, clique "Générer le code", et colle le
//     résultat ci-dessous à la place de la liste actuelle.
//
//   Un réseau laissé vide ("") ne s'affichera pas sur le site.
//   Ex: pas de Kick → laisse kick: "" et la case n'apparaît pas.
// ═══════════════════════════════════════════════════════════

const STREAMERS = [
  {
    nom: "Streamer Exemple",
    description: "Streamer partenaire officiel des Vieux Loups sur FratWorld.",
    photo: "", // lien vers une photo (optionnel)
    tiktok: "https://www.tiktok.com/@exemple",
    twitch: "https://www.twitch.tv/exemple",
    kick: "" // vide → la case Kick ne s'affiche pas
  }
];

// Ne pas toucher à cette ligne
if (typeof module !== "undefined") module.exports = STREAMERS;
