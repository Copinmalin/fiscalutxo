# CryptoFiscaFacile et FiscalUTXO

Revue de l’issue [#24](https://github.com/Copinmalin/fiscalutxo/issues/24) sur le `main` FiscalUTXO `65d92ba`, comparé à la [documentation et au dépôt CryptoFiscaFacile](https://gitlab.com/c1560/cryptofiscafacile/-/tree/develop).

| Sujet | CryptoFiscaFacile | FiscalUTXO au point de comparaison | Décision pour le MVP |
|---|---|---|---|
| Usage et confidentialité | Application publique avec traitement des données personnelles dans le navigateur. | Interface locale qui demande de lancer Node.js sur l’ordinateur. | Offrir une version statique de la même interface. Les fichiers, calculs et exports passent par le code exécuté dans le navigateur. Ajouter un dossier fictif pour essayer sans données personnelles. |
| Périmètre et imports | Plusieurs crypto-actifs et import de CSV, XLS ou JSON. | Bitcoin, CSV Sparrow et générique, bundle JSON et qualification explicite. | Conserver le périmètre Bitcoin et les formats actuels. |
| Sparrow et cours | Le guide recommande l’export Sparrow avec la source de cours réglée sur `None`. | Le format avec unité est accepté. Une valeur fiat importée reste indicative. | Conserver la même recommandation. Demander des justificatifs identifiables pour le prix de cession et le portefeuille avant cession. |
| Architecture et tests | Moteur Go/Wasm, interface distincte et tests par couche. Un proxy peut servir à certaines requêtes externes en local. | Moteur TypeScript séparé, tests Vitest et interface web. | Réutiliser le moteur et les tests existants, rediriger les appels de l’interface vers le navigateur dans la version statique et vérifier qu’elle fonctionne sans appels réseau une fois chargée. |
| Exports fiscaux | Génération de déclarations et tests dédiés au rapport 2086 dans le dépôt. | Exports préparatoires 2086, 2042 C et checklist 3916-bis, avec tests de seuil et de fractions de capital. | Conserver les exports et rendre le résultat de l’exemple DGFiP visible dans la démo. Vérifier les formulaires de la campagne 2027 avant usage déclaratif. |
| Licence | MIT. | Dépôt FiscalUTXO déclaré `UNLICENSED`. | L’étude porte sur les usages et décisions de conception. Aucun code, texte de documentation ni visuel de CryptoFiscaFacile repris. |

Sources consultées dans la référence : [présentation](https://gitlab.com/c1560/cryptofiscafacile/-/blob/develop/README.md), [export Sparrow](https://gitlab.com/c1560/cryptofiscafacile/-/blob/develop/docs/plateformes/sparrow.md), [compilation](https://gitlab.com/c1560/cryptofiscafacile/-/blob/develop/docs/build.md), [tests](https://gitlab.com/c1560/cryptofiscafacile/-/blob/develop/docs/tests.md), [licence](https://gitlab.com/c1560/cryptofiscafacile/-/blob/develop/LICENSE).
