const categoryRepository = require("../repositories/categoryRepository");
const { createError } = require("../utils/errors");
const { parsePositiveId } = require("../utils/validation");

class CategoryService {

    // Get all categories
    async getAllCategories() {
        return await categoryRepository.getAllCategories();
    }

    // Get category by ID
    async getCategoryById(categoryId) {
        categoryId = parsePositiveId(categoryId, "category ID");

        const category = await categoryRepository.getCategoryById(categoryId);

        if (!category) {
            const error = new Error("Category not found");
            error.statusCode = 404;
            throw error;
        }

        return category;
    }

    // Create category
    async createCategory(categoryData) {
        categoryData = categoryData && typeof categoryData === "object" ? categoryData : {};
        const { category_name, description } = categoryData;

        if (typeof category_name !== "string" || !category_name.trim()) {
            throw createError("Category name is required", 400);
        }
        if (category_name.trim().length > 100 ||
            description !== undefined && description !== null &&
            (typeof description !== "string" || description.length > 255)) {
            throw createError("Category name or description exceeds the maximum length", 400);
        }

        return await categoryRepository.createCategory({
            category_name: category_name.trim(),
            description: description?.trim() || null
        });
    }

    // Update category
    async updateCategory(categoryId, categoryData) {
        categoryId = parsePositiveId(categoryId, "category ID");
        categoryData = categoryData && typeof categoryData === "object" ? categoryData : {};

        const { category_name, description } = categoryData;

        if (typeof category_name !== "string" || !category_name.trim()) {
            throw createError("Category name is required", 400);
        }
        if (category_name.trim().length > 100 ||
            description !== undefined && description !== null &&
            (typeof description !== "string" || description.length > 255)) {
            throw createError("Category name or description exceeds the maximum length", 400);
        }

        const category = await categoryRepository.updateCategory(
            categoryId,
            {
                category_name: category_name.trim(),
                description: description?.trim() || null
            }
        );

        if (!category) {
            const error = new Error("Category not found");
            error.statusCode = 404;
            throw error;
        }

        return category;
    }

    // Delete category
    async deleteCategory(categoryId) {
        categoryId = parsePositiveId(categoryId, "category ID");

        const deleted = await categoryRepository.deleteCategory(categoryId);

        if (!deleted) {
            const error = new Error("Category not found");
            error.statusCode = 404;
            throw error;
        }

        return true;
    }
}

module.exports = new CategoryService();