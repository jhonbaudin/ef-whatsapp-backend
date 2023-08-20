module.exports = {
  apps: [
    {
      name: "ef-whatsapp-prod-1",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "21-40/20 * * * * *",
      env: {
        INSTANCE: "1",
        PORT: 50001,
      },
    },
    {
      name: "ef-whatsapp-prod-2",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "0-20/20 * * * * *",
      env: {
        INSTANCE: "2",
        PORT: 50002,
      },
    },
    {
      name: "ef-whatsapp-prod-3",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "40-59/20 * * * * *",
      env: {
        INSTANCE: "3",
        PORT: 50003,
      },
    },
  ],
};
