module.exports = {
  apps: [
    {
      name: "ef-whatsapp-prod",
      script: "./server.js",
      instances: 1,
      max_memory_restart: "2G",
      cron_restart: "0 5 * * *",
      env: {
        INSTANCE: "1",
        PORT: 9001,
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
