# Checklist tests et sécurité — FiscalUTXO

Cette checklist doit être utilisée avant de valider une issue, une PR ou une intervention IA.

FiscalUTXO manipule des données fiscales et patrimoniales Bitcoin. La barre de sécurité est donc élevée, même pour un MVP.

---

## 1. Scope

```text
[ ] La tâche correspond à une issue GitHub.
[ ] Le périmètre est clair.
[ ] Le hors périmètre est indiqué.
[ ] Aucun changement opportuniste n’est ajouté.
[ ] Le changement rapproche directement le projet du MVP.
[ ] Le changement respecte Bitcoin-only, local-first et CSV-first.
```

Questions :

```text
Cette PR traite-t-elle une seule tâche ?
Cette PR ajoute-t-elle une fonctionnalité hors MVP ?
Cette PR introduit-elle une complexité non nécessaire ?
```

---

## 2. Données sensibles Bitcoin

```text
[ ] Aucun seed n’est demandé, stocké, loggé ou documenté.
[ ] Aucune clé privée n’est demandée, stockée, loggée ou documentée.
[ ] Aucun xpriv n’est présent.
[ ] Aucun xpub n’est demandé dans le MVP.
[ ] Aucun mot de passe plateforme n’est demandé.
[ ] Aucun token API réel n’est ajouté.
[ ] Aucun fichier `.env` réel n’est ajouté.
[ ] Aucun txid personnel réel n’est ajouté dans les exemples.
[ ] Aucune adresse Bitcoin personnelle réelle n’est ajoutée dans les exemples.
[ ] Aucun historique fiscal réel non anonymisé n’est ajouté.
```

Règle : tout exemple doit être fictif ou manifestement anonymisé.

---

## 3. Imports CSV

```text
[ ] Les fichiers CSV sont traités comme données non fiables.
[ ] Les colonnes manquantes sont gérées.
[ ] Les dates invalides sont gérées.
[ ] Les montants invalides sont gérés.
[ ] Les lignes vides sont gérées.
[ ] Les doublons sont identifiables.
[ ] Les lignes brutes sont conservées.
[ ] La version du parseur est traçable.
[ ] Aucune donnée source n’est supprimée silencieusement.
```

Interdiction : exécuter ou interpréter du contenu CSV comme du code.

---

## 4. Qualification fiscale

```text
[ ] Une sortie Bitcoin n’est pas automatiquement considérée comme une cession imposable.
[ ] Les cas ambigus sont marqués `needs_review`.
[ ] Les transferts personnels peuvent être distingués des ventes et dépenses.
[ ] Les opérations professionnelles sont hors 2086 privée.
[ ] Les règles fiscales sont documentées dans `docs/TAX_FR.md`.
[ ] Aucune règle fiscale n’est inventée.
```

Règle : en cas de doute fiscal, ne pas calculer en silence. Marquer à revoir.

---

## 5. Tests fonctionnels

À exécuter dès que les commandes existent :

```bash
npm run lint
npm run test
npm run build
```

À couvrir progressivement :

```text
[ ] Import CSV valide.
[ ] Import CSV invalide.
[ ] Conservation des lignes brutes.
[ ] Normalisation `NormalizedEvent`.
[ ] Classification `needs_review`.
[ ] Détection de transfert personnel possible.
[ ] Calcul fiscal cas simple.
[ ] Seuil annuel de 305 €.
[ ] Export JSON.
[ ] Export CSV.
[ ] Export XLSX.
```

Si un test n’est pas exécuté, expliquer pourquoi.

---

## 6. Sécurité applicative

```text
[ ] Le fonctionnement local reste possible sans réseau.
[ ] Aucun cloud implicite n’est introduit.
[ ] Aucun appel externe obligatoire n’est introduit.
[ ] Les erreurs ne divulguent pas de données sensibles.
[ ] Les logs sont minimisés.
[ ] Les exports de debug sont absents ou nettoyés.
[ ] Les dépendances nouvelles sont justifiées.
[ ] Le comportement par défaut est sûr.
```

---

## 7. Dépendances

```text
[ ] Aucune dépendance nouvelle n’est ajoutée sans justification.
[ ] La dépendance est nécessaire au MVP.
[ ] La dépendance est maintenue.
[ ] La dépendance n’ajoute pas d’accès réseau inutile.
[ ] Le lockfile est cohérent.
[ ] Les scripts d’installation ne sont pas dangereux.
```

Question : peut-on faire simple sans cette dépendance ?

---

## 8. Documentation

```text
[ ] La documentation est mise à jour si le comportement change.
[ ] La documentation reste courte et actionnable.
[ ] La documentation ne contredit pas `SOURCE_OF_TRUTH.md`.
[ ] Les avertissements fiscaux sont conservés.
[ ] Les limites sont explicites.
```

---

## 9. IA et revue humaine

```text
[ ] L’agent a respecté `AGENTS.md`.
[ ] L’agent a respecté `docs/AI_RULES.md`.
[ ] L’agent a limité le diff au scope.
[ ] L’agent a indiqué les tests exécutés.
[ ] L’agent a indiqué les tests non exécutés.
[ ] Une revue humaine reste nécessaire avant merge.
```

Règle : l’IA accélère. Elle ne valide pas seule.

---

## 10. Verdict

Utiliser un verdict clair :

```text
APPROVE_SECURITY
REQUEST_CHANGES_SECURITY
COMMENT_SECURITY
```

Ne jamais approuver si :

- une donnée sensible est exposée ;
- le scope MVP est contredit ;
- une règle fiscale est inventée ;
- une dépendance risquée est ajoutée sans justification ;
- les tests nécessaires sont absents sans explication ;
- une opération ambiguë est traitée automatiquement sans `needs_review`.