module.exports = {
  apps: [
    {
      name: 'milex-api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 3000,
      // A full backup (database rows plus embedded files) is the single
      // largest thing this process ever holds. 400M cut it off part-way
      // through and restarted the server mid-download.
      max_memory_restart: '1G',
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