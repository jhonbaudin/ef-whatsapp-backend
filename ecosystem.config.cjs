module.exports = {
  apps: [
    {
      name: "ef-whatsapp-prod-1",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "4G",
      cron_restart: "0 5 * * *",
      env: {
        INSTANCE: "1",
        PORT: 9002,
      },
    },
    {
      name: "ef-whatsapp-dev",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "200M",
      watch: true,
    },
  ],
};
