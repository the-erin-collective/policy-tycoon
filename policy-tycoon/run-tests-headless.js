#!/usr/bin/env node

// Script to run tests in headless mode with memory optimizations
const { spawn } = require('child_process');
const path = require('path');

// Run karma tests in headless mode
const testProcess = spawn('npx', [
  'ng',
  'test',
  '--karma-config',
  'karma.conf.headless.js',
  '--browsers',
  'ChromeHeadlessCustom'
], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=4096'
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