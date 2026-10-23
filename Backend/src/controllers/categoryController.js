const categoryService = require("../services/categoryService");
const { handleControllerError } = require("../utils/errors");

class CategoryController {

    // GET all categories
    async getAllCategories(req, res) {
        try {
            const categories = await categoryService.getAllCategories();

            res.status(200).json({
                success: true,
                count: categories.length,
                data: categories
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch categories");
        }
    }

    // GET category by ID
    async getCategoryById(req, res) {
        try {
            const categoryId = req.params.id;

            const category = await categoryService.getCategoryById(categoryId);

            res.status(200).json({
                success: true,
                data: category
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch category");
        }
    }

    // POST create category
    async createCategory(req, res) {
        try {
            const category = await categoryService.createCategory(req.body);

            res.status(201).json({
                success: true,
                message: "Category created successfully",
                data: category
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to create category");
        }
    }

    // PUT update category
    async updateCategory(req, res) {
        try {
            const categoryId = req.params.id;

            const category = await categoryService.updateCategory(
                categoryId,
                req.body
            );

            res.status(200).json({
                success: true,
                message: "Category updated successfully",
                data: category
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to update category");
        }
    }

    // DELETE category
    async deleteCategory(req, res) {
        try {
            const categoryId = req.params.id;

            await categoryService.deleteCategory(categoryId);

            res.status(200).json({
                success: true,
                message: "Category deleted successfully"
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to delete category");
        }
    }
}

module.exports = new CategoryController();