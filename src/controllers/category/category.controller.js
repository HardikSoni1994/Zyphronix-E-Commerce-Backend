const statusCode = require('http-status-codes');
const moment = require('moment');
const { errorResponse, successResponse } = require('../../utils/response');
const { MSG } = require('../../utils/msg');
const CategoryService = require('../../services/category/category.service');

const categoryService = new CategoryService();

// Add category Logic
module.exports.addCategory = async (req, res) => {
    try {
        if (req.user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }
        console.log(req.body);

        req.body.create_at = moment().format('DD/MM/YYYY, h:mm:ss A');
        req.body.update_at = moment().format('DD/MM/YYYY, h:mm:ss A');

        if (req.file) {
            req.body.category_image = req.file.path;
        }

        await categoryService.insertNewCategory(req.body);

        return res.status(statusCode.CREATED).json(successResponse(statusCode.CREATED, false, MSG.CATEGORY_ADD_SUCCESS))
        
    } catch (error) {
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR))
    }
};

module.exports.fetchCategory = async (req, res) => {
    try {
        const categories = await categoryService.fetchAllCategories();

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.CATEGORY_FETCH_SUCCESS, categories));

    } catch (error) {
        console.log("Category Fetch Error", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
    }
}