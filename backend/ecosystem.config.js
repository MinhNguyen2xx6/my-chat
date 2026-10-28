module.exports = {
  apps: [
    {
      name: 'chat-api',
      script: 'src/server.js',
      instances: 1, // Socket.io chạy 1 tiến trình; nhiều tiến trình cần thêm Redis adapter
      env: { NODE_ENV: 'production' },
    },
  ],
};
