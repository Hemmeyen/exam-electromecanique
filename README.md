# Examens blancs — Concours Ingénieur Électromécanique

Application statique d'entraînement au concours. Aucune base de données, aucun serveur :
tout tient dans des fichiers JSON versionnés dans ce dépôt.

---

## 1. Mise en ligne (une seule fois)

```bash
git init
git add .
git commit -m "Mise en place de la plateforme d'entraînement"
git branch -M main
git remote add origin https://github.com/<votre-compte>/<votre-depot>.git
git push -u origin main
```

Puis, sur GitHub : **Settings → Pages → Source : `main` / `/ (root)` → Save**.

Le lien à partager apparaît après une minute :
`https://<votre-compte>.github.io/<votre-depot>/`

> Dépôt **public** obligatoire pour GitHub Pages en formule gratuite.
> Les examens seront donc visibles de tous — c'est le but ici, mais gardez-le en tête.

---

## 2. Ajouter une épreuve (à chaque fois)

Trois gestes, dans cet ordre.

**a. Déposer le fichier** dans `exams/`, par exemple `exams/exam-B.json`.

**b. Ajouter une entrée** dans `exams/manifest.json` :

```json
{
  "slug": "exam-B",
  "fichier": "exams/exam-B.json",
  "titre": "Épreuve B — variante",
  "resume": "50 questions, mêmes domaines que l'épreuve A, angles différents.",
  "niveau": "Confirmé",
  "questions": 50,
  "duree_min": 120,
  "statut": "publie"
}
```

`"statut": "brouillon"` affiche l'épreuve grisée et non cliquable — pratique pour
pousser un travail en cours sans l'exposer.

**c. Valider puis pousser :**

```bash
node tools/valider.mjs   # doit afficher « 0 erreur(s) »
git add exams/
git commit -m "Ajout de l'épreuve B"
git push
```

Le site se met à jour tout seul en une à deux minutes. Rien à modifier dans `index.html`.

Chaque épreuve a son lien direct : `.../?exam=exam-B`

---

## 3. Le validateur

`node tools/valider.mjs` contrôle avant publication :

| Bloquant (erreur) | Signalé (avertissement) |
|---|---|
| JSON malformé, fichier absent | Option sans feedback |
| `id` de question ou d'option dupliqué | Pas de feedback général |
| `type: "unique"` avec plusieurs bonnes réponses | Pas de source citée |
| Aucune option correcte | Difficulté absente ou hors 1–3 |
| Moins de 3 options | Pas d'option « Aucune des réponses proposées » |
| « Aucune des réponses » correcte en même temps qu'une autre | Ratio « Aucune » hors de 4–16 % |

Le workflow `.github/workflows/valider.yml` relance ces contrôles à chaque push.
Un examen cassé fait échouer la CI au lieu d'atterrir en ligne devant vos amis.

---

## 4. Structure d'une question

```json
{
  "id": "Q12",
  "domaine": "Équipements tournants",
  "difficulte": 2,
  "type": "multiple",
  "enonce": "Texte de la question. Les sauts de ligne sont respectés.",
  "options": [
    { "id": "a", "texte": "…", "correcte": true,  "feedback": "Correct. …" },
    { "id": "z", "texte": "Aucune des réponses proposées.", "correcte": false, "feedback": "…" }
  ],
  "feedback_general": "Explication complète affichée après la correction.",
  "source": "Norme ou ouvrage de référence."
}
```

`domaine` alimente le tableau de bord par domaine affiché en fin d'épreuve :
gardez des libellés **strictement identiques** d'une question à l'autre, sinon les
jauges se dédoublent.

---

## 5. Barème

Reproduit celui du concours, déduit des copies corrigées fournies :

- option correcte cochée : **+ 1 / n**
- option fausse cochée : **− 1 / n**
- `n` = nombre de bonnes réponses de la question ; plancher à **0** par question.

Contrôle : 3 bonnes réponses, le candidat coche 2 bonnes + 1 fausse
→ 2/3 − 1/3 = **0,33**, exactement la note observée dans le corpus.

---

## 6. Travailler en local

```bash
npx serve
```

Puis ouvrir l'adresse affichée. Un double-clic sur `index.html` ne suffit pas :
le navigateur bloque le chargement des JSON en protocole `file://`.
