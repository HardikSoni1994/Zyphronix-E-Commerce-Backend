const Category = require('../../models/category.model');

module.exports = class CategoryService {
    async insertNewCategory(body) {
        try {
            return await Category.create(body);
        } catch (error) {
            console.log("Add New Category Error", error);
            
        }
    }
    async fetchAllCategories() {
        return await Category.find();
    }
}