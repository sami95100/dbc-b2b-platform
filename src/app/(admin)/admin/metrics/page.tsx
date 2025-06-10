'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import { supabase } from '../../../../lib/supabase';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Calendar,
  Filter,
  Download,
  Eye,
  ArrowLeft,
  Target,
  Percent,
  PieChart,
  Activity,
  Zap,
  Star,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MetricsData {
  // Données globales
  totalRevenue: number;
  totalMargin: number;
  marginPercent: number;
  totalOrders: number;
  totalClients: number;
  avgOrderValue: number;
  
  // Évolution temporelle
  monthlyData: any[];
  weeklyData: any[];
  
  // Top performers
  topProducts: any[];
  topClients: any[];
  
  // Analyses avancées
  marginAnalysis: any[];
  clientSegmentation: any[];
  performanceKPIs: any;
  alertes: any[];
  
  // Prévisions
  projections: any;
}

// Composant de sélection de dates avancé
function DateRangePicker({ 
  dateRange, 
  setDateRange, 
  customStartDate, 
  setCustomStartDate,
  customEndDate,
  setCustomEndDate 
}: {
  dateRange: string;
  setDateRange: (range: string) => void;
  customStartDate: Date | null;
  setCustomStartDate: (date: Date | null) => void;
  customEndDate: Date | null;
  setCustomEndDate: (date: Date | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fonction pour obtenir le libellé de la période
  const getPeriodLabel = () => {
    if (dateRange === 'CUSTOM' && customStartDate && customEndDate) {
      return `${customStartDate.toLocaleDateString('fr-FR')} - ${customEndDate.toLocaleDateString('fr-FR')}`;
    }
    switch (dateRange) {
      case '1M': return 'Ce mois';
      case '3M': return '3 derniers mois';
      case '6M': return '6 derniers mois';
      case '1Y': return 'Cette année';
      case 'ALL': return 'Toute la période';
      default: return 'Sélectionner une période';
    }
  };

  // Fonction pour définir une période prédéfinie
  const setPredefinedPeriod = (period: string) => {
    setDateRange(period);
    setIsCustom(false);
    setIsOpen(false);
    
    // Mise à jour des dates personnalisées selon la période
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Fin du mois actuel
    let startDate = new Date();
    
    switch (period) {
      case '1M':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Début du mois actuel
        break;
      case '3M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case '6M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case '1Y':
        startDate = new Date(now.getFullYear(), 0, 1); // 1er janvier de cette année
        break;
      case 'ALL':
        startDate = new Date(2020, 0, 1);
        break;
    }
    
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  // Fonction pour naviguer dans le calendrier
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Générer les jours du calendrier
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Commencer le dimanche

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 semaines max
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-dbc-light-green"
      >
        <Calendar className="h-4 w-4" />
        <span>{getPeriodLabel()}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Onglets */}
            <div className="flex mb-4 border-b">
              <button
                onClick={() => setIsCustom(false)}
                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                  !isCustom 
                    ? 'border-dbc-light-green text-dbc-dark-green' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Périodes prédéfinies
              </button>
              <button
                onClick={() => setIsCustom(true)}
                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                  isCustom 
                    ? 'border-dbc-light-green text-dbc-dark-green' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Période personnalisée
              </button>
            </div>

            {!isCustom ? (
              /* Périodes prédéfinies */
              <div className="space-y-2">
                {[
                  { value: '1M', label: 'Ce mois' },
                  { value: '3M', label: '3 derniers mois' },
                  { value: '6M', label: '6 derniers mois' },
                  { value: '1Y', label: 'Cette année' },
                  { value: 'ALL', label: 'Toute la période' }
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setPredefinedPeriod(period.value)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      dateRange === period.value && !isCustom
                        ? 'bg-dbc-light-green text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            ) : (
              /* Sélection personnalisée */
              <div>
                {/* Navigation du calendrier */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h3 className="font-medium">
                    {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Calendrier */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isSelected = (customStartDate && day.toDateString() === customStartDate.toDateString()) ||
                                     (customEndDate && day.toDateString() === customEndDate.toDateString());
                    const isInRange = customStartDate && customEndDate &&
                                     day >= customStartDate && day <= customEndDate;

                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (!customStartDate || (customStartDate && customEndDate)) {
                            setCustomStartDate(day);
                            setCustomEndDate(null);
                          } else if (day >= customStartDate) {
                            setCustomEndDate(day);
                            setDateRange('CUSTOM');
                          } else {
                            setCustomStartDate(day);
                            setCustomEndDate(null);
                          }
                        }}
                        className={`p-1 text-xs rounded ${
                          !isCurrentMonth
                            ? 'text-gray-400'
                            : isSelected
                            ? 'bg-dbc-light-green text-white'
                            : isInRange
                            ? 'bg-dbc-light-green bg-opacity-20'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Sélection actuelle */}
                {customStartDate && (
                  <div className="text-sm text-gray-600 mb-4">
                    <div>Début: {customStartDate.toLocaleDateString('fr-FR')}</div>
                    {customEndDate && (
                      <div>Fin: {customEndDate.toLocaleDateString('fr-FR')}</div>
                    )}
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setCustomStartDate(null);
                      setCustomEndDate(null);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Effacer
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-3 py-2 text-sm bg-dbc-light-green text-white rounded-md hover:bg-dbc-dark-green"
                    disabled={!customStartDate || !customEndDate}
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData>({
    totalRevenue: 0,
    totalMargin: 0,
    marginPercent: 0,
    totalOrders: 0,
    totalClients: 0,
    avgOrderValue: 0,
    monthlyData: [],
    weeklyData: [],
    topProducts: [],
    topClients: [],
    marginAnalysis: [],
    clientSegmentation: [],
    performanceKPIs: {},
    alertes: [],
    projections: {}
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('1M'); // Par défaut le mois actuel
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, products, clients, trends
  const [productSortBy, setProductSortBy] = useState<'quantity' | 'margin' | 'revenue' | 'marginPercent'>('quantity');
  const [productsPerPage, setProductsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadMetricsData();
  }, [dateRange, customStartDate, customEndDate]);

  const loadMetricsData = async () => {
    setLoading(true);
    try {
      // Définir la date de début selon la période sélectionnée
      let startDate = new Date();
      let endDate = new Date();

      if (dateRange === 'CUSTOM' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        // Périodes prédéfinies par défaut basées sur le mois actuel
        const now = new Date();
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Fin du mois actuel
        
        switch (dateRange) {
          case '1M':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Début du mois actuel
            break;
          case '3M':
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            break;
          case '6M':
            startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            break;
          case '1Y':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date('2020-01-01'); // ALL
        }
      }

      // Charger toutes les données en parallèle
      const [
        ordersRes,
        clientsRes,
        marginRes,
        topProductsRes,
        monthlyStatsRes
      ] = await Promise.all([
        // Commandes avec détails
        supabase
          .from('orders')
          .select(`
            id, total_amount, status, created_at, updated_at,
            users(id, company_name, email),
            order_items(
              id, quantity, unit_price,
              order_item_imei(
                id, product_name, dbc_price, supplier_price, imei
              )
            )
          `)
          .neq('status', 'draft')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false }),

        // Clients actifs
        supabase
          .from('users')
          .select('id, company_name, email, created_at')
          .eq('role', 'client')
          .eq('is_active', true),

        // Marge totale
        supabase.rpc('get_total_margin_completed_orders'),

        // Tous les produits vendus avec détails complets (filtrés par date)
        supabase
          .from('order_item_imei')
          .select(`
            product_name,
            dbc_price,
            supplier_price,
            order_items!inner(
              order_id,
              orders!inner(
                id,
                status,
                created_at
              )
            )
          `)
          .eq('order_items.orders.status', 'completed')
          .gte('order_items.orders.created_at', startDate.toISOString())
          .lte('order_items.orders.created_at', endDate.toISOString()),

        // Statistiques mensuelles
        supabase
          .from('orders')
          .select('total_amount, status, created_at')
          .neq('status', 'draft')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      const orders = ordersRes.data || [];
      const clients = clientsRes.data || [];
      const totalMargin = marginRes.data || 0;
      const allProductImeis = topProductsRes.data || [];
      
      // Regrouper les produits par nom et calculer les métriques
      const productMap = new Map();
      
      allProductImeis.forEach(item => {
        const productName = item.product_name;
        if (!productName) return;
        
        if (!productMap.has(productName)) {
          productMap.set(productName, {
            modelName: productName,
            totalQuantity: 0,
            totalRevenue: 0,
            totalMargin: 0,
            totalSupplierCost: 0,
            averageSalePrice: 0
          });
        }
        
        const product = productMap.get(productName);
        product.totalQuantity += 1;
        product.totalRevenue += (item.dbc_price || 0);
        product.totalSupplierCost += (item.supplier_price || 0);
        product.totalMargin += ((item.dbc_price || 0) - (item.supplier_price || 0));
        product.averageSalePrice = product.totalRevenue / product.totalQuantity;
      });
      
      // Convertir en array et trier par quantité
      const topProducts = Array.from(productMap.values())
        .map(product => ({
          ...product,
          marginPercent: product.totalRevenue > 0 ? (product.totalMargin / product.totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      // Calculs des métriques principales
      const completedOrders = orders.filter(o => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalOrders = completedOrders.length;
      const avgOrderValue = totalRevenue / (totalOrders || 1);
      const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

      // Analyse temporelle (données mensuelles)
      const monthlyStats = processMonthlyData(orders);
      
      // Top clients par CA
      const clientStats = processClientData(completedOrders);
      
      // Analyse des marges par produit (utilisation directe des données calculées)
      const marginAnalysis = topProducts.map(product => ({
        ...product,
        profitability: categorizeProduct(product)
      }));
      
      console.log('🔍 DEBUG Metrics - allProductImeis count:', allProductImeis.length);
      console.log('🔍 DEBUG Metrics - topProducts count:', topProducts.length);
      console.log('🔍 DEBUG Metrics - marginAnalysis sample:', marginAnalysis.slice(0, 3));
      
      // Segmentation client
      const clientSegmentation = processClientSegmentation(clientStats);
      
      // KPIs de performance
      const performanceKPIs = calculatePerformanceKPIs(orders, totalRevenue, totalMargin);
      
      // Alertes automatiques
      const alertes = generateAlerts(metrics, topProducts, clientStats);
      
      // Projections
      const projections = calculateProjections(monthlyStats);

      setMetrics({
        totalRevenue,
        totalMargin,
        marginPercent,
        totalOrders,
        totalClients: clients.length,
        avgOrderValue,
        monthlyData: monthlyStats,
        weeklyData: [], // À implémenter si nécessaire
        topProducts: topProducts.slice(0, 10),
        topClients: clientStats.slice(0, 10),
        marginAnalysis,
        clientSegmentation,
        performanceKPIs,
        alertes,
        projections
      });

    } catch (error) {
      console.error('❌ Erreur chargement métriques:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions utilitaires pour traitement des données
  const processMonthlyData = (orders: any[]) => {
    const monthlyMap = new Map();
    
    orders.forEach(order => {
      if (order.status === 'completed') {
        const date = new Date(order.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            revenue: 0,
            orders: 0,
            avgOrder: 0
          });
        }
        
        const monthData = monthlyMap.get(monthKey);
        monthData.revenue += order.total_amount || 0;
        monthData.orders += 1;
        monthData.avgOrder = monthData.revenue / monthData.orders;
      }
    });
    
    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processClientData = (orders: any[]) => {
    const clientMap = new Map();
    
    orders.forEach(order => {
      const clientId = order.users?.id;
      const clientName = order.users?.company_name || order.users?.email;
      
      if (clientId) {
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            id: clientId,
            name: clientName,
            totalRevenue: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            lastOrderDate: null
          });
        }
        
        const clientData = clientMap.get(clientId);
        clientData.totalRevenue += order.total_amount || 0;
        clientData.totalOrders += 1;
        clientData.avgOrderValue = clientData.totalRevenue / clientData.totalOrders;
        
        const orderDate = new Date(order.created_at);
        if (!clientData.lastOrderDate || orderDate > new Date(clientData.lastOrderDate)) {
          clientData.lastOrderDate = order.created_at;
        }
      }
    });
    
    return Array.from(clientMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const processMarginAnalysis = (products: any[]) => {
    return products.map(product => ({
      ...product,
      marginPercent: product.totalRevenue > 0 ? 
        ((product.totalMargin || 0) / product.totalRevenue) * 100 : 0,
      profitability: categorizeProduct(product)
    }));
  };

  const categorizeProduct = (product: any) => {
    const marginPercent = product.totalRevenue > 0 ? 
      ((product.totalMargin || 0) / product.totalRevenue) * 100 : 0;
    
    if (marginPercent >= 15) return 'Excellent';
    if (marginPercent >= 10) return 'Bon';
    if (marginPercent >= 5) return 'Moyen';
    return 'Faible';
  };

  const processClientSegmentation = (clientStats: any[]) => {
    const segments = {
      'VIP (>10k€)': clientStats.filter(c => c.totalRevenue > 10000),
      'Premium (5k-10k€)': clientStats.filter(c => c.totalRevenue >= 5000 && c.totalRevenue <= 10000),
      'Standard (1k-5k€)': clientStats.filter(c => c.totalRevenue >= 1000 && c.totalRevenue < 5000),
      'Nouveaux (<1k€)': clientStats.filter(c => c.totalRevenue < 1000)
    };
    
    return Object.entries(segments).map(([segment, clients]) => ({
      segment,
      count: clients.length,
      totalRevenue: clients.reduce((sum, c) => sum + c.totalRevenue, 0),
      avgRevenue: clients.length > 0 ? 
        clients.reduce((sum, c) => sum + c.totalRevenue, 0) / clients.length : 0
    }));
  };

  const calculatePerformanceKPIs = (orders: any[], totalRevenue: number, totalMargin: number) => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const lastMonthOrders = orders.filter(o => 
      new Date(o.created_at) >= lastMonth && 
      new Date(o.created_at) < currentMonth &&
      o.status === 'completed'
    );
    
    const currentMonthOrders = orders.filter(o => 
      new Date(o.created_at) >= currentMonth &&
      o.status === 'completed'
    );
    
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    const revenueGrowth = lastMonthRevenue > 0 ? 
      ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    
    return {
      revenueGrowth,
      conversionRate: 0, // À calculer avec plus de données
      customerLifetimeValue: totalRevenue / (orders.filter(o => o.status === 'completed').length || 1),
      repeatCustomerRate: 0 // À calculer avec plus de données
    };
  };

  const generateAlerts = (currentMetrics: any, products: any[], clients: any[]) => {
    const alerts = [];
    
    // Alerte marge faible
    const lowMarginProducts = products.filter(p => {
      const marginPercent = p.totalRevenue > 0 ? ((p.totalMargin || 0) / p.totalRevenue) * 100 : 0;
      return marginPercent < 5 && p.totalQuantity > 5;
    });
    
    if (lowMarginProducts.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Produits à marge faible',
        message: `${lowMarginProducts.length} produits ont une marge <5% avec des volumes significatifs`,
        action: 'Revoir la stratégie prix'
      });
    }
    
    // Alerte clients inactifs
    const inactiveClients = clients.filter(c => {
      const daysSinceLastOrder = (new Date().getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastOrder > 90;
    });
    
    if (inactiveClients.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Clients inactifs',
        message: `${inactiveClients.length} clients n'ont pas commandé depuis 90+ jours`,
        action: 'Campagne de réactivation'
      });
    }
    
    return alerts;
  };

  const calculateProjections = (monthlyData: any[]) => {
    if (monthlyData.length < 3) return {};
    
    const lastThreeMonths = monthlyData.slice(-3);
    const avgGrowth = lastThreeMonths.reduce((sum, month, index) => {
      if (index === 0) return sum;
      const prevMonth = lastThreeMonths[index - 1];
      const growth = prevMonth.revenue > 0 ? 
        ((month.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
      return sum + growth;
    }, 0) / (lastThreeMonths.length - 1);
    
    const lastMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const projectedNextMonth = lastMonthRevenue * (1 + avgGrowth / 100);
    
    return {
      avgGrowthRate: avgGrowth,
      projectedNextMonth,
      projectedQuarter: projectedNextMonth * 3 * (1 + avgGrowth / 200) // Approximation
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des métriques avancées...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Retour</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Metrics & Business Intelligence</h1>
                <p className="text-gray-600">Analyses avancées pour décisions stratégiques</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Sélecteur de période */}
              <DateRangePicker
                dateRange={dateRange}
                setDateRange={setDateRange}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
              />
              <button className="flex items-center space-x-2 bg-dbc-light-green text-white px-4 py-2 rounded-lg hover:bg-dbc-dark-green transition-colors">
                <Download className="h-4 w-4" />
                <span>Exporter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
              { id: 'products', label: 'Analyse Produits', icon: Package },
              { id: 'clients', label: 'Analyse Clients', icon: Users },
              { id: 'trends', label: 'Tendances', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-dbc-light-green text-dbc-dark-green'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 py-8">
        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {/* KPIs principaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">CA Total</p>
                    <p className="text-3xl font-bold text-gray-800">{metrics.totalRevenue.toFixed(0)} €</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-600 text-sm font-medium">
                        +{metrics.performanceKPIs.revenueGrowth?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Marge Totale</p>
                    <p className="text-3xl font-bold text-gray-800">{metrics.totalMargin.toFixed(0)} €</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {metrics.marginPercent.toFixed(1)}% du CA
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Percent className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Panier Moyen</p>
                    <p className="text-3xl font-bold text-gray-800">{metrics.avgOrderValue.toFixed(0)} €</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {metrics.totalOrders} commandes
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Clients Actifs</p>
                    <p className="text-3xl font-bold text-gray-800">{metrics.totalClients}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Base client totale
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Alertes */}
            {metrics.alertes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Alertes & Recommandations</h3>
                </div>
                <div className="space-y-3">
                  {metrics.alertes.map((alert, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' : 'bg-blue-50 border-blue-400'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{alert.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {alert.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projections */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Projections</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Croissance moyenne</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.projections.avgGrowthRate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Projection mois prochain</p>
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.projections.projectedNextMonth?.toFixed(0) || 0} €
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Projection trimestre</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics.projections.projectedQuarter?.toFixed(0) || 0} €
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'products' && (
          <div className="space-y-8">
            {/* Filtres et info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  <strong>Produits analysés:</strong> {metrics.marginAnalysis.length} produits uniques | 
                  Période: {dateRange} | Loading: {loading ? 'En cours...' : 'Terminé'}
                </p>
              </div>
            </div>
            
            {/* Analyse des marges */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Analyse de Rentabilité par Produit</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Produit</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Quantité</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">CA Total</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Prix Moyen</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Marge €</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">% Marge</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Rentabilité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (metrics.marginAnalysis.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-8 px-4 text-center">
                              <div className="text-gray-500">
                                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-lg font-medium">Aucune donnée produit disponible</p>
                                <p className="text-sm">Les analyses apparaîtront après les premières ventes</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      
                      return metrics.marginAnalysis.map((product, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{product.modelName}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {product.totalQuantity}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {product.totalRevenue?.toFixed(0)} €
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-blue-600">
                            {product.averageSalePrice?.toFixed(0)} €
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-green-700">
                            {product.totalMargin?.toFixed(0)} €
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {product.marginPercent?.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              product.profitability === 'Excellent' ? 'bg-green-100 text-green-800' :
                              product.profitability === 'Bon' ? 'bg-blue-100 text-blue-800' :
                              product.profitability === 'Moyen' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {product.profitability}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'clients' && (
          <div className="space-y-8">
            {/* Segmentation client */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Segmentation Clients</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {metrics.clientSegmentation.map((segment, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800">{segment.segment}</h4>
                    <p className="text-2xl font-bold text-dbc-dark-green">{segment.count}</p>
                    <p className="text-sm text-gray-600">
                      CA: {segment.totalRevenue.toFixed(0)} €
                    </p>
                    <p className="text-sm text-gray-600">
                      Moy: {segment.avgRevenue.toFixed(0)} €
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top clients */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Clients par CA</h3>
              <div className="space-y-4">
                {metrics.topClients.slice(0, 10).map((client, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-dbc-light-green to-dbc-dark-green rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{client.name}</p>
                        <p className="text-sm text-gray-500">
                          {client.totalOrders} commandes • Panier moyen: {client.avgOrderValue.toFixed(0)} €
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{client.totalRevenue.toFixed(0)} €</p>
                      <p className="text-sm text-gray-500">
                        Dernière commande: {new Date(client.lastOrderDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'trends' && (
          <div className="space-y-8">
            {/* Évolution mensuelle */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Évolution Mensuelle du CA</h3>
              <div className="h-64 flex items-end space-x-2">
                {metrics.monthlyData.map((month, index) => {
                  const maxRevenue = Math.max(...metrics.monthlyData.map(m => m.revenue));
                  const height = (month.revenue / maxRevenue) * 200;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-gradient-to-t from-dbc-light-green to-dbc-dark-green rounded-t-lg w-full"
                        style={{ height: `${height}px` }}
                      ></div>
                      <div className="mt-2 text-center">
                        <p className="text-xs text-gray-600">{month.month}</p>
                        <p className="text-sm font-medium">{month.revenue.toFixed(0)}€</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tendances détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Évolution du Panier Moyen</h4>
                <div className="space-y-3">
                  {metrics.monthlyData.slice(-6).map((month, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600">{month.month}</span>
                      <span className="font-medium">{month.avgOrder.toFixed(0)} €</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Nombre de Commandes</h4>
                <div className="space-y-3">
                  {metrics.monthlyData.slice(-6).map((month, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600">{month.month}</span>
                      <span className="font-medium">{month.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(MetricsPage, 'admin'); 