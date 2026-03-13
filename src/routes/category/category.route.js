const express = require('express');
const { addCategory, fetchCategory } = require('../../controllers/category/category.controller');
const multer = require('multer');
const { storage } = require('../../middlewares/storage.middleware');
const categoryRoute = express.Router();

const upload = multer({ storage: storage });

categoryRoute.post('/', upload.single('category_image'), addCategory);
categoryRoute.get('/', fetchCategory);

module.exports = categoryRoute;