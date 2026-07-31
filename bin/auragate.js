#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

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

 ⚡ AuraGate v0.1.0 — Smart AI Gateway & API Key Rotator (OpenCode & LLMs)

 > Server Endpoint : http://localhost:${port}/v1
 > Web Dashboard   : http://localhost:${port}
 > RTK Token Saver : Enabled (Active)
 > Status          : Ready to route ✓

 Press Ctrl+C to stop the server
 -----------------------------------------------------------------------
`;

console.log('\x1b[36m%s\x1b[0m', banner);

// Run Next.js server
const projectRoot = path.join(__dirname, '..');
const nextCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const child = spawn(nextCmd, ['next', 'dev', '-p', String(port)], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port) },
});

child.on('error', (err) => {
  console.error('Gagal menjalankan AuraGate server:', err.message);
  process.exit(1);
});
