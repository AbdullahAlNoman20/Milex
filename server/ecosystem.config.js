module.exports = {
  apps: [
    {
      name: 'milex-api',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 3000,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};