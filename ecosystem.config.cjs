module.exports = {
  apps: [
    {
      name: "ef-whatsapp-prod-1",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "*/40 * * * * *",
      env: {
        INSTANCE: "1",
        PORT: 50001,
      },
    },
    {
      name: "ef-whatsapp-pro-2",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "*/50 * * * * *",
      env: {
        INSTANCE: "2",
        PORT: 50002,
      },
    },
    {
      name: "ef-whatsapp-pro-3",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "1 * * * * *",
      env: {
        INSTANCE: "3",
        PORT: 50003,
      },
    },
    {
      name: "ef-whatsapp-dev",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "200M",
      cron_restart: "*/20 * * * * *",
      // watch: true,
    },
  ],
};
