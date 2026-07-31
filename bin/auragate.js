#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse CLI flags
const args = process.argv.slice(2);
let port = 20128;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-p' || args[i] === '--port') && args[i + 1]) {
    port = parseInt(args[i + 1], 10) || 20128;
    break;
  }
}

const banner = `
  █████╗ ██╗   ██╗██████╗  █████╗  ██████╗  █████╗ ████████╗███████╗
 ██╔══██╗██║   ██║██╔══██╗██╔══██╗██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝
 ███████║██║   ██║██████╔╝███████║██║  ███╗███████║   ██║   █████╗  
 ██╔══██║██║   ██║██╔══██╗██╔══██║██║   ██║██╔══██║   ██║   ██╔══╝  
 ██║  ██║╚██████╔╝██║  ██║██║  ██║╚██████╔╝██║  ██║   ██║   ███████╗
 ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

 ⚡ AuraGate v0.1.6 — Smart AI Gateway & API Key Rotator (OpenCode & LLMs)

 > Server Endpoint : http://localhost:${port}/v1
 > Web Dashboard   : http://localhost:${port}
 > RTK Token Saver : Enabled (Active)
 > Status          : Ready to route ✓

 Press Ctrl+C to stop the server
 -----------------------------------------------------------------------
`;

console.log('\x1b[36m%s\x1b[0m', banner);

const projectRoot = path.join(__dirname, '..');
const dbPath = path.join(projectRoot, 'prisma', 'dev.db');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Ensure Prisma Client is generated
try {
  execSync(`${npxCmd} prisma generate`, { cwd: projectRoot, stdio: 'ignore' });
} catch (pErr) {
  // Silent catch
}

// Ensure SQLite database schema exists on first run
if (!fs.existsSync(dbPath)) {
  console.log('\x1b[33m%s\x1b[0m', '⚙️  Menginisialisasi SQLite Database Schema...');
  try {
    execSync(`${npxCmd} prisma db push`, { cwd: projectRoot, stdio: 'ignore' });
    console.log('\x1b[32m%s\x1b[0m', '✓ Database SQLite berhasil diinisialisasi!\n');
  } catch (dbErr) {
    console.warn('Inisialisasi database otomatis tertunda:', dbErr.message);
  }
}

// Run Next.js dev server (with typescript pre-installed in dependencies)
const child = spawn(npxCmd, ['next', 'dev', '-p', String(port)], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: String(port) },
});

child.on('error', (err) => {
  console.error('Gagal menjalankan AuraGate server:', err.message);
  process.exit(1);
});
