const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');

// Load env vars
dotenv.config();

// Tạo HTTP server
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected...');
    
    // In ra tất cả các routes đã đăng ký
    console.log('==== API ROUTES ====');
    app._router.stack
      .filter(r => r.route)
      .map(r => {
        console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
      });
    
    app._router.stack
      .filter(r => r.name === 'router' && r.handle.stack)
      .forEach(r => {
        console.log(`\n==== ROUTER: ${r.regexp} ====`);
        r.handle.stack
          .filter(h => h.route)
          .map(h => {
            console.log(`${Object.keys(h.route.methods).join(',')} ${h.route.path}`);
          });
      });

    // Start server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Debug server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }); 