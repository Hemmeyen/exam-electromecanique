#!/usr/bin/env node
/**
 * Valide le manifeste et tous les fichiers d'examen.
 * Usage : node tools/valider.mjs
 * Sort en code 1 si une erreur bloquante est trouvée (utilisé par la CI).
 */
import { readFileSync, existsSync } from "node:fs";

const AUCUNE = "aucune des réponses proposées";
let erreurs = 0, avertissements = 0;

const err = (m) => { console.error("  ERREUR   " + m); erreurs++; };
const avt = (m) => { console.warn ("  attention " + m); avertissements++; };

function lire(chemin){
  if(!existsSync(chemin)){ err(`fichier introuvable : ${chemin}`); return null; }
  try { return JSON.parse(readFileSync(chemin, "utf8")); }
  catch(e){ err(`JSON invalide dans ${chemin} — ${e.message}`); return null; }
}

const manifeste = lire("exams/manifest.json");
if(!manifeste) process.exit(1);
if(!Array.isArray(manifeste.epreuves)) { err("manifest.json : clé « epreuves » manquante ou non tableau"); process.exit(1); }

const slugs = new Set();

for(const ep of manifeste.epreuves){
  console.log(`\n▸ ${ep.slug}  (${ep.fichier})`);
  if(slugs.has(ep.slug)) err(`slug dupliqué : ${ep.slug}`);
  slugs.add(ep.slug);
  if(!ep.titre) err("titre manquant dans le manifeste");

  const ex = lire(ep.fichier);
  if(!ex) continue;
  if(!Array.isArray(ex.questions) || !ex.questions.length){ err("aucune question"); continue; }

  const ids = new Set();
  const domaines = {};
  let nbAucuneCorrecte = 0, nbMultiple = 0;

  ex.questions.forEach((q, i) => {
    const p = `Q#${i+1} (${q.id || "sans id"})`;
    if(!q.id) err(`${p} : champ « id » manquant`);
    else if(ids.has(q.id)) err(`${p} : id dupliqué`);
    ids.add(q.id);

    if(!q.domaine) err(`${p} : champ « domaine » manquant`);
    else domaines[q.domaine] = (domaines[q.domaine] || 0) + 1;

    if(!["unique","multiple"].includes(q.type)) err(`${p} : type doit valoir "unique" ou "multiple"`);
    if(!q.enonce) err(`${p} : énoncé vide`);
    if(!Array.isArray(q.options) || q.options.length < 3) err(`${p} : au moins 3 options attendues`);
    if(!q.options) return;

    const oids = new Set();
    q.options.forEach(o => {
      if(!o.id) err(`${p} : une option sans id`);
      else if(oids.has(o.id)) err(`${p} : id d'option dupliqué « ${o.id} »`);
      oids.add(o.id);
      if(!o.texte) err(`${p} : option ${o.id} sans texte`);
      if(typeof o.correcte !== "boolean") err(`${p} : option ${o.id} — « correcte » doit être true/false`);
      if(!o.feedback) avt(`${p} : option ${o.id} sans feedback (le candidat n'aura pas d'explication)`);
    });

    const bonnes = q.options.filter(o => o.correcte);
    if(bonnes.length === 0) err(`${p} : aucune option correcte`);
    if(q.type === "unique" && bonnes.length !== 1) err(`${p} : type "unique" mais ${bonnes.length} bonnes réponses`);
    if(q.type === "multiple"){
      nbMultiple++;
      if(bonnes.length === 1) avt(`${p} : type "multiple" avec une seule bonne réponse — vérifier`);
    }

    const opt = q.options.find(o => (o.texte || "").toLowerCase().includes(AUCUNE));
    if(!opt) avt(`${p} : pas d'option « Aucune des réponses proposées » (signature du concours)`);
    else if(opt.correcte){
      nbAucuneCorrecte++;
      if(bonnes.length > 1) err(`${p} : « Aucune des réponses proposées » correcte en même temps qu'une autre option`);
    }

    if(!q.feedback_general) avt(`${p} : pas de feedback général`);
    if(!q.source) avt(`${p} : pas de source citée`);
    if(![1,2,3].includes(q.difficulte)) avt(`${p} : difficulté absente ou hors de 1–3`);
  });

  const n = ex.questions.length;
  const tauxAucune = nbAucuneCorrecte / n;
  console.log(`  ${n} questions · ${nbMultiple} à réponses multiples · « Aucune » correcte ${nbAucuneCorrecte} fois (${(tauxAucune*100).toFixed(0)} %)`);
  if(n >= 20 && (tauxAucune < 0.04 || tauxAucune > 0.16))
    avt(`ratio « Aucune des réponses » correcte hors de la cible 4–16 % observée dans les corpus`);
  console.log("  Répartition : " + Object.entries(domaines).map(([d,c]) => `${d} ${c}`).join(" | "));

  if(ep.questions && ep.questions !== n) avt(`le manifeste annonce ${ep.questions} questions, le fichier en contient ${n}`);
}

console.log(`\n${erreurs} erreur(s), ${avertissements} avertissement(s).`);
process.exit(erreurs ? 1 : 0);
