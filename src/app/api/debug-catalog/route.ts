import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

export async function POST(request: NextRequest) {
  console.log('=== DEBUG CATALOG IMPORT ===');
  
  try {
    const formData = await request.formData();
    const file = formData.get('catalog') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    console.log('1. Fichier reçu:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Vérifier les variables d'environnement
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('2. Variables d\'environnement:', envCheck);

    // Sauvegarder le fichier temporairement
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const timestamp = Date.now();
    const tempDir = join(process.cwd(), 'temp');
    const tempPath = join(tempDir, `debug_catalog_${timestamp}.xlsx`);
    
    console.log('3. Paths:', {
      cwd: process.cwd(),
      tempDir,
      tempPath
    });

    // Créer le dossier temp
    try {
      await mkdir(tempDir, { recursive: true });
      console.log('4. Dossier temp créé avec succès');
    } catch (err) {
      console.log('4. Erreur création dossier temp:', err);
    }
    
    await writeFile(tempPath, buffer);
    console.log('5. Fichier sauvegardé avec succès');

    // Test 1: Vérifier que Python3 existe
    console.log('6. Test disponibilité Python...');
    const pythonTest = spawn('python3', ['--version']);
    
    let pythonOutput = '';
    let pythonError = '';
    
    pythonTest.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });
    
    pythonTest.stderr.on('data', (data) => {
      pythonError += data.toString();
    });
    
    const pythonExitCode = await new Promise((resolve) => {
      pythonTest.on('close', resolve);
    });
    
    console.log('7. Python test result:', {
      exitCode: pythonExitCode,
      output: pythonOutput,
      error: pythonError
    });

    // Test 2: Vérifier les dépendances Python
    console.log('8. Test dépendances Python...');
    const depsTest = spawn('python3', ['-c', 'import pandas, supabase, dotenv; print("Dependencies OK")']);
    
    let depsOutput = '';
    let depsError = '';
    
    depsTest.stdout.on('data', (data) => {
      depsOutput += data.toString();
    });
    
    depsTest.stderr.on('data', (data) => {
      depsError += data.toString();
    });
    
    const depsExitCode = await new Promise((resolve) => {
      depsTest.on('close', resolve);
    });
    
    console.log('9. Dependencies test result:', {
      exitCode: depsExitCode,
      output: depsOutput,
      error: depsError
    });

    // Test 3: Exécuter le script avec maximum de debug
    console.log('10. Exécution du script catalog_processor...');
    const scriptPath = join(process.cwd(), 'backend/scripts/catalog_processor.py');
    console.log('Script path:', scriptPath);
    
    const pythonProcess = spawn('python3', [scriptPath, tempPath], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'  // Pour avoir les logs en temps réel
      }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('PYTHON STDOUT:', text);
    });

    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.log('PYTHON STDERR:', text);
    });

    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    console.log('11. Script execution result:', {
      exitCode,
      hasOutput: !!output,
      hasError: !!errorOutput
    });

    // Nettoyer le fichier temporaire
    try {
      await require('fs/promises').unlink(tempPath);
      console.log('12. Fichier temporaire nettoyé');
    } catch (err) {
      console.warn('12. Impossible de supprimer le fichier temporaire:', err);
    }

    // Retourner tous les détails de debug
    return NextResponse.json({
      success: exitCode === 0,
      debug: {
        file: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        environment: envCheck,
        paths: {
          cwd: process.cwd(),
          tempDir,
          scriptPath
        },
        python: {
          available: pythonExitCode === 0,
          version: pythonOutput || pythonError,
          exitCode: pythonExitCode
        },
        dependencies: {
          available: depsExitCode === 0,
          output: depsOutput,
          error: depsError,
          exitCode: depsExitCode
        },
        execution: {
          exitCode,
          output,
          errorOutput
        }
      }
    });

  } catch (error) {
    console.error('Erreur debug:', error);
    
    // Diagnostic plus détaillé des erreurs
    let errorDetails = error instanceof Error ? error.message : String(error);
    let errorType = 'Erreur générale';
    
    if (error instanceof Error) {
      if (error.message.includes('SUPABASE')) {
        errorType = 'Erreur de connexion Supabase';
      } else if (error.message.includes('spawn')) {
        errorType = 'Erreur de lancement Python';
      } else if (error.message.includes('timeout')) {
        errorType = 'Timeout';
      } else if (error.message.includes('file')) {
        errorType = 'Erreur de fichier';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorType,
      details: errorDetails,
      recommendation: errorType === 'Erreur de lancement Python' 
        ? 'Utilisez l\'import TypeScript comme alternative' 
        : 'Vérifiez les variables d\'environnement et la connexion réseau'
    }, { status: 500 });
  }
} 