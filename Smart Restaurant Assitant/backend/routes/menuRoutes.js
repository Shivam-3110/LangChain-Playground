import express from "express";
import Menu from "../models/menuModel.js";

const router = express.Router();

// GET /api/menu
// Get all menu items, with optional filters.
router.get("/", async (req, res) => {
    try {
        const filter = {};

        if (req.query.category) {
            filter.category = {
                $regex: `^${req.query.category}$`,
                $options: "i",
            };
        }

        if (req.query.isVegetarian !== undefined) {
            filter.isVegetarian = req.query.isVegetarian === "true";
        }

        if (req.query.maxPrice !== undefined) {
            const maxPrice = Number(req.query.maxPrice);

            if (!Number.isFinite(maxPrice) || maxPrice < 0) {
                return res.status(400).json({
                    message: "maxPrice must be a non-negative number",
                });
            }

            filter.price = { $lte: maxPrice };
        }

        const menuItems = await Menu.find(filter).sort({ category: 1, name: 1 });

        return res.status(200).json({
            count: menuItems.length,
            data: menuItems,
        });
    } catch (error) {
        console.error("Failed to fetch menu:", error);

        return res.status(500).json({
            message: "Failed to fetch menu",
        });
    }
});

// GET /api/menu/:id
// Get a single menu item.
router.get("/:id", async (req, res) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).json({
                message: "Invalid menu item ID",
            });
        }

        const menuItem = await Menu.findById(req.params.id);

        if (!menuItem) {
            return res.status(404).json({
                message: "Menu item not found",
            });
        }

        return res.status(200).json({
            data: menuItem,
        });
    } catch (error) {
        console.error("Failed to fetch menu item:", error);

        return res.status(500).json({
            message: "Failed to fetch menu item",
        });
    }
});

// POST /api/menu
// Create a menu item.
router.post("/", async (req, res) => {
    try {
        const menuItem = await Menu.create(req.body);

        return res.status(201).json({
            message: "Menu item created successfully",
            data: menuItem,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message,
            });
        }

        console.error("Failed to create menu item:", error);

        return res.status(500).json({
            message: "Failed to create menu item",
        });
    }
});

// PATCH /api/menu/:id
// Update a menu item.
router.patch("/:id", async (req, res) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).json({
                message: "Invalid menu item ID",
            });
        }

        const allowedFields = [
            "name",
            "category",
            "price",
            "isVegetarian",
            "spiceLevel",
            "ingredients",
            "preparationTime",
            "isAvailable",
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (Object.hasOwn(req.body, field)) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid fields provided for update",
            });
        }

        const menuItem = await Menu.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!menuItem) {
            return res.status(404).json({
                message: "Menu item not found",
            });
        }

        return res.status(200).json({
            message: "Menu item updated successfully",
            data: menuItem,
        });
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({
                message: error.message,
            });
        }

        console.error("Failed to update menu item:", error);

        return res.status(500).json({
            message: "Failed to update menu item",
        });
    }
});

// DELETE /api/menu/:id
// Delete a menu item.
router.delete("/:id", async (req, res) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).json({
                message: "Invalid menu item ID",
            });
        }

        const menuItem = await Menu.findByIdAndDelete(req.params.id);

        if (!menuItem) {
            return res.status(404).json({
                message: "Menu item not found",
            });
        }

        return res.status(200).json({
            message: "Menu item deleted successfully",
        });
    } catch (error) {
        console.error("Failed to delete menu item:", error);

        return res.status(500).json({
            message: "Failed to delete menu item",
        });
    }
});

export default router;