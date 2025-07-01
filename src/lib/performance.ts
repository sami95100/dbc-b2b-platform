'use client';

// Performance monitoring utilities
export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // First Contentful Paint
    this.observePerformanceEntry('paint', (entries) => {
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
          this.reportMetric('FCP', entry.startTime);
        }
      });
    });

    // Largest Contentful Paint
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
      this.reportMetric('LCP', lastEntry.startTime);
    });

    // First Input Delay
    this.observePerformanceEntry('first-input', (entries) => {
      const firstEntry = entries[0] as any;
      this.metrics.fid = firstEntry.processingStart - firstEntry.startTime;
      this.reportMetric('FID', this.metrics.fid);
    });

    // Cumulative Layout Shift
    this.observePerformanceEntry('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      this.metrics.cls = clsValue;
      this.reportMetric('CLS', clsValue);
    });

    // Time to First Byte
    if ('navigation' in performance) {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      this.metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
      this.reportMetric('TTFB', this.metrics.ttfb);
    }
  }

  private observePerformanceEntry(type: string, callback: (entries: PerformanceEntry[]) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  private reportMetric(name: string, value: number) {
    console.log(`📊 Performance Metric - ${name}: ${Math.round(value)}ms`);
    
    // Send to analytics service (e.g., Google Analytics, Vercel Analytics)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: name,
        value: Math.round(value),
        non_interaction: true,
      });
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return;

  const scripts = document.querySelectorAll('script[src]');
  let totalSize = 0;

  scripts.forEach(async (script) => {
    const src = script.getAttribute('src');
    if (src && src.includes('/_next/static/')) {
      try {
        const response = await fetch(src, { method: 'HEAD' });
        const size = parseInt(response.headers.get('content-length') || '0');
        totalSize += size;
        console.log(`📦 Bundle: ${src.split('/').pop()} - ${(size / 1024).toFixed(2)}KB`);
      } catch (error) {
        console.warn('Failed to analyze bundle size for:', src);
      }
    }
  });

  console.log(`📦 Total Bundle Size: ${(totalSize / 1024).toFixed(2)}KB`);
}

// Resource loading performance
export function trackResourceLoading() {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as PerformanceResourceTiming;
        const loadTime = resourceEntry.responseEnd - resourceEntry.startTime;
        
        if (loadTime > 1000) { // Log slow resources (>1s)
          console.warn(`🐌 Slow Resource: ${resourceEntry.name} - ${Math.round(loadTime)}ms`);
        }
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
}

// Memory usage monitoring
export function trackMemoryUsage() {
  if (typeof window === 'undefined' || !(performance as any).memory) return;

  const memory = (performance as any).memory;
  console.log('💾 Memory Usage:', {
    used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
    total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
    limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
  });
}

// Initialize performance monitoring
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Track resource loading
  trackResourceLoading();
  
  // Track memory usage periodically
  setInterval(trackMemoryUsage, 30000); // Every 30 seconds
  
  // Analyze bundle size after load
  window.addEventListener('load', () => {
    setTimeout(analyzeBundleSize, 1000);
  });
}

// Performance budget checker
export function checkPerformanceBudget() {
  const metrics = performanceMonitor.getMetrics();
  const budgets = {
    fcp: 1500, // 1.5s
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    ttfb: 600, // 600ms
  };

  const violations: string[] = [];

  Object.entries(budgets).forEach(([metric, budget]) => {
    const value = metrics[metric as keyof PerformanceMetrics];
    if (value && value > budget) {
      violations.push(`${metric.toUpperCase()}: ${Math.round(value)} > ${budget}`);
    }
  });

  if (violations.length > 0) {
    console.warn('⚠️ Performance Budget Violations:', violations);
  } else {
    console.log('✅ Performance Budget: All metrics within budget');
  }

  return violations;
}