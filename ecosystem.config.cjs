module.exports = {
  apps: [
    {
      name: "ef-whatsapp-prod",
      script: "./server.js",
      instances: 1,
      autorestart: true,
      watch: false,

      max_memory_restart: "2G",
      env: {
        NODE_ENV: "production",
      },
      restartOnError: true,
      exp_backoff_restart_delay: 100,
    },
    {
      name: "ef-whatsapp-dev",
      script: "./server.js",
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "dev",
      },
      restartOnError: true,
      exp_backoff_restart_delay: 100,
    },
  ],
};
