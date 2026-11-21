# Architecture locale

L’application conserve les briques TypeScript d’import et utilise un serveur HTTP Node écoutant sur `127.0.0.1`, sur un port libre. Les fichiers HTML, CSS et JavaScript sont servis depuis la même origine. Les routes JSON vérifient le nom d’hôte et l’origine et appliquent une limite de 24 Mio au corps d’une requête.

```text
CSV Sparrow ou générique / bundle CLI
→ lignes sources et événements normalisés
→ dossier JSON et qualifications explicites
→ calcul 2026
→ détails 2086, synthèse 2042 C, checklist 3916-bis
```

Le serveur travaille en mémoire. Le navigateur télécharge le dossier `fiscalutxo-project.v1` quand l’utilisateur l’enregistre. Son fichier regroupe le texte des imports CSV, les lignes et leurs événements, l’état d’ouverture, les qualifications et la liste de comptes. Les rapports sont des fichiers distincts. Le dossier s’ouvre localement après validation de son schéma et de ses liens. Aucune copie automatique du dossier n’est écrite par le serveur.

La CLI reste disponible pour l’import Sparrow indépendant. Le schéma [SQLite V0](SQLITE_SCHEMA_V0.md) est un document historique de conception. La syntaxe des imports figure dans [IMPORTS.md](IMPORTS.md).


## Édition statique

`npm run build:pages` génère `dist/pages/` pour GitHub Pages. Le build assemble le moteur TypeScript et la même interface. Le transport navigateur traite le dossier, les imports et les exports en mémoire. La politique de sécurité de la page bloque les connexions applicatives sortantes. La version avec Node.js conserve son serveur de boucle locale et ses routes.
