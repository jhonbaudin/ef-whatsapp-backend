module.exports = {
  apps: [
    {
      name: "ef-whatsapp-prod",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      exp_backoff_restart_delay: 100,
    },
    {
      name: "ef-whatsapp-dev",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "200M",
      exp_backoff_restart_delay: 100,
    },
  ],
};
