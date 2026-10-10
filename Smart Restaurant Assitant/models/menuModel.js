import mongoose from "mongoose";

const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      enum: ["Breakfast", "Lunch", "Dinner"]
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    isVegetarian: {
      type: Boolean,
      default: true
    },

    spiceLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },

    ingredients: {
      type: [String],
      default: []
    },

    preparationTime: {
      type: Number,
      min: 0,
      default: 15
    },

    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Menu = mongoose.model("Menu", menuSchema);

export default Menu;