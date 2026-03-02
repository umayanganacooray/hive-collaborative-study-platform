const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authMiddleware = require('./middleware/authMiddleware');
const services = require('./config/services');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(helmet());
app.use(express.json());

//
// HEALTH CHECK
//
app.get('/', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));
app.get('/health', (req, res) => res.json({ status: 'OK', service: 'api-gateway' }));

//
// PUBLIC ROUTES (NO FIREBASE VERIFICATION)
//
app.use(
  '/auth',
  createProxyMiddleware({
    target: services.AUTH_SERVICE,
    changeOrigin: true,
  })
);

//
// PROTECTED ROUTES (VERIFY FIREBASE TOKEN FIRST)
//
app.use(
  '/users',
  authMiddleware,
  createProxyMiddleware({
    target: services.USER_SERVICE,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      // Pass Firebase decoded user to downstream service
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.uid);
        proxyReq.setHeader('x-user-role', req.user.role || 'student');
      }
    },
  })
);

app.listen(PORT, () => {
  console.log('API Gateway running on port', PORT);
});