module.exports = {
  apps: [
    {
      name: "ef-whatsapp-prod",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "*/20 * * * * *",
    },
    {
      name: "ef-whatsapp-dev",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "200M",
      cron_restart: "1 * * * * *",
    },
  ],
};
