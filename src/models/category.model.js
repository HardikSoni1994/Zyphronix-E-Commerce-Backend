const mongoose = require('mongoose');

const categorySchema = mongoose.Schema ({
    category_name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    category_image: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDelete: {
        type: Boolean,
        default: false
    },
    create_at: {
        type: String, 
        required: true
    },
    update_at: {
        type: String,
        required: true
    }
});

const Category = mongoose.model("Category", categorySchema, "Category");
module.exports = Category;