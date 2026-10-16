import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },

        content: {
            type: String,
            required: true,
        },

        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: true,
    }
);

const conversationSchema = new mongoose.Schema(
    {
        conversationId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        messages: {
            type: [messageSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const Conversation = mongoose.model(
    "Conversation",
    conversationSchema
);

export default Conversation;