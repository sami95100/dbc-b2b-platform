// Utilitaires pour la gestion des commandes et notifications entre pages

export const OrdersUtils = {
  // Marquer qu'il faut recharger les commandes
  markOrdersAsStale: () => {
    localStorage.setItem('ordersNeedRefresh', Date.now().toString());
  },

  // Vérifier si les commandes doivent être rechargées
  shouldRefreshOrders: (): boolean => {
    const timestamp = localStorage.getItem('ordersNeedRefresh');
    if (!timestamp) return false;

    // Si le timestamp est récent (moins de 5 minutes), considérer qu'il faut recharger
    const now = Date.now();
    const staleTime = parseInt(timestamp);
    const fiveMinutes = 5 * 60 * 1000;

    return (now - staleTime) < fiveMinutes;
  },

  // Marquer les commandes comme fraîches (rechargées)
  markOrdersAsFresh: () => {
    localStorage.removeItem('ordersNeedRefresh');
  },

  // Nettoyer le localStorage des commandes orphelines
  cleanupOrphanedOrders: (validOrderIds: string[]) => {
    try {
      // Nettoyer currentDraftOrder
      const currentOrderId = localStorage.getItem('currentDraftOrder');
      if (currentOrderId && !validOrderIds.includes(currentOrderId)) {
        console.log('🧹 Nettoyage commande active orpheline:', currentOrderId);
        localStorage.removeItem('currentDraftOrder');
      }

      // Nettoyer draftOrders
      const draftOrdersStr = localStorage.getItem('draftOrders');
      if (draftOrdersStr) {
        try {
          const draftOrders = JSON.parse(draftOrdersStr);
          const cleanedOrders = Object.fromEntries(
            Object.entries(draftOrders).filter(([id]) => validOrderIds.includes(id))
          );
          
          if (Object.keys(cleanedOrders).length !== Object.keys(draftOrders).length) {
            console.log('🧹 Nettoyage brouillons orphelins:', 
              Object.keys(draftOrders).length - Object.keys(cleanedOrders).length, 'supprimés');
            localStorage.setItem('draftOrders', JSON.stringify(cleanedOrders));
          }
        } catch (error) {
          console.error('Erreur nettoyage draftOrders:', error);
        }
      }
    } catch (error) {
      console.error('Erreur générale nettoyage localStorage:', error);
    }
  },

  // Rediriger vers les commandes avec un refresh forcé
  redirectToOrdersWithRefresh: (router: any) => {
    OrdersUtils.markOrdersAsStale();
    router.push('/orders?refresh=' + Date.now());
  }
}; 