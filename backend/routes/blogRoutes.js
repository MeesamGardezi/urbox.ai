const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// All blog routes will be prefixed with /blog in server.js
// So this handles /blog/:slug
router.get('/:slug', blogController.getPost);

module.exports = router;
