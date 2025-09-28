#!/usr/bin/env node

// Simple script to run Angular tests in headless mode
const { spawn } = require('child_process');
const path = require('path');

// Ensure we're using the correct shell that has npx in PATH
const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
const shellArg = process.platform === 'win32' ? '/c' : '-c';

// Run Angular tests in headless mode using npx with explicit PATH
const testProcess = spawn(shell, [
  shellArg,
  'npx ng test --browsers=ChromeHeadless --watch=false'
], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: process.env.PATH
  }
});

testProcess.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('Failed to start test process:', error);
  process.exit(1);
});