# Référence des Statuts de Commandes

Ce document définit les 4 statuts utilisés dans l'application DBC B2B.

## Statuts Disponibles

| Code Technique    | Label Affiché          | Description                                     | Couleur | Icône       |
| ----------------- | ---------------------- | ----------------------------------------------- | ------- | ----------- |
| `draft`           | Brouillon              | Commande en cours de création, non validée      | Gris    | Clock       |
| `pending_payment` | En attente de paiement | Commande validée, en attente du paiement client | Jaune   | AlertCircle |
| `shipping`        | En cours de livraison  | Commande payée, en cours de livraison           | Bleu    | Truck       |
| `completed`       | Terminée               | Commande livrée et finalisée                    | Vert    | CheckCircle |

## Workflow des Statuts

```
draft → pending_payment → shipping → completed
```

### Transitions Possibles

1. **draft → pending_payment** : Validation de la commande par l'utilisateur
2. **pending_payment → shipping** : Confirmation du paiement, passage en livraison
3. **shipping → completed** : Livraison effectuée, commande terminée

### Actions par Statut

#### `draft` (Brouillon)

- ✅ Modification des quantités
- ✅ Ajout/suppression de produits
- ✅ Validation vers `pending_payment`
- ❌ Modification du statut directement

#### `pending_payment` (En attente de paiement)

- ❌ Modification du contenu
- ✅ Passage en `shipping` (paiement confirmé)
- ✅ Vue en lecture seule

#### `shipping` (En cours de livraison)

- ❌ Modification du contenu
- ✅ Passage en `completed` (livraison confirmée)
- ✅ Vue en lecture seule

#### `completed` (Terminée)

- ❌ Aucune modification possible
- ✅ Vue en lecture seule uniquement

## Migration depuis l'ancien système

Les anciens statuts ont été mappés comme suit :

- `draft`, `editing` → `draft`
- `pending`, `validated` → `pending_payment`
- `processing`, `shipped` → `shipping`
- `delivered` → `completed`
