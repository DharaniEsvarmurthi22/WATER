#!/usr/bin/env node

/**
 * Water Dashboard Deployment Script
 * Helps with deployment to various platforms
 */

const fs = require('fs');
const path = require('path');

class DeploymentHelper {
    constructor() {
        this.projectRoot = __dirname;
        this.requiredFiles = [
            'index.html',
            'login.html', 
            'location.html',
            'config.js',
            'auth.js',
            'map.js',
            'data.js',
            'location.js',
            'style.css',
            'env-config.js',
            'package.json'
        ];
    }

    checkFiles() {
        console.log('🔍 Checking required files...');
        const missingFiles = [];
        
        for (const file of this.requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (!fs.existsSync(filePath)) {
                missingFiles.push(file);
            }
        }

        if (missingFiles.length > 0) {
            console.error('❌ Missing required files:', missingFiles);
            return false;
        }

        console.log('✅ All required files present');
        return true;
    }

    checkEnvironment() {
        console.log('🔧 Checking environment configuration...');
        
        const envExamplePath = path.join(this.projectRoot, '.env.example');
        const envPath = path.join(this.projectRoot, '.env');
        
        if (!fs.existsSync(envExamplePath)) {
            console.warn('⚠️  .env.example file not found');
        }

        if (!fs.existsSync(envPath)) {
            console.warn('⚠️  .env file not found - you may need to configure environment variables');
        }

        console.log('✅ Environment check complete');
        return true;
    }

    generateNetlifyConfig() {
        console.log('📝 Generating Netlify configuration...');
        
        const netlifyToml = `[build]
  publish = "."
  command = "echo 'Static site - no build required'"

[[redirects]]
  from = "/*"
  to = "/login.html"
  status = 200
  conditions = {Role = ["anonymous"]}

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' https://cdnjs.cloudflare.com;"`;

        fs.writeFileSync(path.join(this.projectRoot, 'netlify.toml'), netlifyToml);
        console.log('✅ netlify.toml generated');
    }

    generateVercelConfig() {
        console.log('📝 Generating Vercel configuration...');
        
        const vercelJson = {
            "version": 2,
            "routes": [
                {
                    "src": "/(.*)",
                    "dest": "/$1"
                }
            ],
            "headers": [
                {
                    "source": "/(.*)",
                    "headers": [
                        {
                            "key": "X-Frame-Options",
                            "value": "DENY"
                        },
                        {
                            "key": "X-Content-Type-Options", 
                            "value": "nosniff"
                        }
                    ]
                }
            ]
        };

        fs.writeFileSync(
            path.join(this.projectRoot, 'vercel.json'), 
            JSON.stringify(vercelJson, null, 2)
        );
        console.log('✅ vercel.json generated');
    }

    validateSupabaseConfig() {
        console.log('🔍 Validating Supabase configuration...');
        
        try {
            const configPath = path.join(this.projectRoot, 'config.js');
            const configContent = fs.readFileSync(configPath, 'utf8');
            
            if (configContent.includes('YOUR_SUPABASE_URL') || 
                configContent.includes('YOUR_SUPABASE_ANON_KEY')) {
                console.warn('⚠️  Supabase configuration contains placeholder values');
                console.log('   Please update config.js with your actual Supabase credentials');
                return false;
            }
            
            console.log('✅ Supabase configuration appears valid');
            return true;
        } catch (error) {
            console.error('❌ Error reading config.js:', error.message);
            return false;
        }
    }

    showDeploymentInstructions() {
        console.log('\n🚀 Deployment Instructions:\n');
        
        console.log('📋 Pre-deployment Checklist:');
        console.log('  1. ✅ Update Supabase credentials in config.js');
        console.log('  2. ✅ Create sensor_data table in Supabase');
        console.log('  3. ✅ Enable Row Level Security policies');
        console.log('  4. ✅ Enable Supabase Realtime for sensor_data table');
        console.log('  5. ✅ Test authentication locally');
        
        console.log('\n🌐 Deployment Options:');
        
        console.log('\n  Option 1: Netlify');
        console.log('    • Run: npm install -g netlify-cli');
        console.log('    • Run: netlify deploy --prod --dir .');
        console.log('    • Set environment variables in Netlify dashboard');
        
        console.log('\n  Option 2: Vercel');
        console.log('    • Run: npm install -g vercel');
        console.log('    • Run: vercel');
        console.log('    • Set environment variables: vercel env add');
        
        console.log('\n  Option 3: Manual Upload');
        console.log('    • Upload all files to your web server');
        console.log('    • Ensure HTTPS is enabled');
        console.log('    • Configure environment variables');
        
        console.log('\n📝 Post-deployment:');
        console.log('  1. Test login functionality');
        console.log('  2. Verify map loads correctly');
        console.log('  3. Test ESP32 data integration');
        console.log('  4. Check real-time updates');
        
        console.log('\n🔗 Useful Links:');
        console.log('  • Supabase Dashboard: https://app.supabase.com');
        console.log('  • Netlify Dashboard: https://app.netlify.com');
        console.log('  • Vercel Dashboard: https://vercel.com/dashboard');
        console.log('  • ESP32 Integration Guide: ./ESP32_INTEGRATION.md');
    }

    run() {
        console.log('🌊 Water Dashboard Deployment Helper\n');
        
        let allChecksPass = true;
        
        allChecksPass &= this.checkFiles();
        allChecksPass &= this.checkEnvironment();
        allChecksPass &= this.validateSupabaseConfig();
        
        this.generateNetlifyConfig();
        this.generateVercelConfig();
        
        if (allChecksPass) {
            console.log('\n✅ All checks passed! Ready for deployment.');
        } else {
            console.log('\n⚠️  Some issues found. Please resolve before deploying.');
        }
        
        this.showDeploymentInstructions();
    }
}

// Run if called directly
if (require.main === module) {
    const helper = new DeploymentHelper();
    helper.run();
}

module.exports = DeploymentHelper;
