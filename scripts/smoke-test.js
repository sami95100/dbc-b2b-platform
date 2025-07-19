#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.SMOKE_TEST_URL || 'http://localhost:3000',
  timeout: 30000, // 30 secondes
  retries: 3
};

// Tests à effectuer
const tests = [
  {
    name: 'Health Check',
    path: '/api/healthz',
    method: 'GET',
    expectedStatus: [200, 503], // 503 acceptable si services dégradés
    critical: true
  },
  {
    name: 'Home Page',
    path: '/',
    method: 'GET',
    expectedStatus: [200, 302], // 302 si redirection auth
    critical: true
  },
  {
    name: 'Catalog API',
    path: '/api/catalog',
    method: 'GET',
    expectedStatus: [200, 401], // 401 si auth requise
    critical: false
  },
  {
    name: 'Orders API',
    path: '/api/orders',
    method: 'GET',
    expectedStatus: [200, 401],
    critical: false
  }
];

class SmokeTest {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🧪 Starting smoke tests...');
    console.log(`📍 Base URL: ${config.baseUrl}`);
    console.log(`⏱️  Timeout: ${config.timeout}ms`);
    console.log('');

    for (const test of tests) {
      await this.runTest(test);
    }

    this.printSummary();
    this.exit();
  }

  async runTest(test) {
    console.log(`🔍 Testing: ${test.name}`);
    
    let attempt = 0;
    let lastError = null;

    while (attempt < config.retries) {
      attempt++;
      
      try {
        const result = await this.makeRequest(test);
        
        if (test.expectedStatus.includes(result.statusCode)) {
          console.log(`  ✅ ${test.name} - Status: ${result.statusCode} (${result.duration}ms)`);
          this.results.push({
            ...test,
            status: 'PASS',
            statusCode: result.statusCode,
            duration: result.duration,
            attempt
          });
          return;
        } else {
          throw new Error(`Unexpected status code: ${result.statusCode}`);
        }

      } catch (error) {
        lastError = error;
        
        if (attempt < config.retries) {
          console.log(`  ⚠️  ${test.name} - Attempt ${attempt} failed: ${error.message}`);
          console.log(`  🔄 Retrying in 2 seconds...`);
          await this.sleep(2000);
        }
      }
    }

    // Tous les attempts ont échoué
    console.log(`  ❌ ${test.name} - FAILED after ${config.retries} attempts`);
    console.log(`     Error: ${lastError?.message || 'Unknown error'}`);
    
    this.results.push({
      ...test,
      status: 'FAIL',
      error: lastError?.message || 'Unknown error',
      attempt: config.retries
    });
  }

  makeRequest(test) {
    return new Promise((resolve, reject) => {
      const url = new URL(test.path, config.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const startTime = Date.now();
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: test.method,
        timeout: config.timeout,
        headers: {
          'User-Agent': 'DBC-SmokeTest/1.0',
          'Accept': 'application/json,text/html,*/*'
        }
      };

      const req = client.request(options, (res) => {
        const duration = Date.now() - startTime;
        
        // Consommer la réponse pour éviter les memory leaks
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            duration,
            data
          });
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${config.timeout}ms`));
      });

      req.end();
    });
  }

  printSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const criticalFailed = this.results.filter(r => r.status === 'FAIL' && r.critical).length;
    
    const totalDuration = Date.now() - this.startTime;

    console.log('');
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`🚨 Critical Failed: ${criticalFailed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log('');

    if (failedTests > 0) {
      console.log('❌ FAILED TESTS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(test => {
          const criticalFlag = test.critical ? '🚨 CRITICAL' : '⚠️  NON-CRITICAL';
          console.log(`  ${criticalFlag} - ${test.name}: ${test.error}`);
        });
      console.log('');
    }

    // Détails des tests réussis
    if (passedTests > 0) {
      console.log('✅ PASSED TESTS:');
      this.results
        .filter(r => r.status === 'PASS')
        .forEach(test => {
          console.log(`  ${test.name}: ${test.statusCode} (${test.duration}ms)`);
        });
      console.log('');
    }

    // Recommandations
    if (criticalFailed > 0) {
      console.log('🚨 CRITICAL ISSUES DETECTED:');
      console.log('   - Application may not be functioning correctly');
      console.log('   - Investigate failed critical tests immediately');
    } else if (failedTests > 0) {
      console.log('⚠️  NON-CRITICAL ISSUES DETECTED:');
      console.log('   - Some features may be degraded');
      console.log('   - Consider investigating failed tests');
    } else {
      console.log('🎉 ALL TESTS PASSED - Application appears healthy!');
    }
  }

  exit() {
    const criticalFailed = this.results.filter(r => r.status === 'FAIL' && r.critical).length;
    const exitCode = criticalFailed > 0 ? 1 : 0;
    
    console.log(`\n🏁 Exiting with code: ${exitCode}`);
    process.exit(exitCode);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exécution du script
if (require.main === module) {
  const smokeTest = new SmokeTest();
  smokeTest.run().catch(error => {
    console.error('💥 Smoke test crashed:', error);
    process.exit(1);
  });
}

module.exports = SmokeTest; 