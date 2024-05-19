const express = require("express");
const app = express();
const mongoose = require("mongoose");
const { EmployeeModel } = require("../../Functions/databaseSchema");
const multer = require("multer");
const upload = multer();
const { generateToken, verifyToken } = require("../../Functions/middleware/authorisation");
const { s3Upload, s3Retrieve } = require("../../Functions/configuration");
const { SupportApp } = require("aws-sdk");

// This middleware is necessary to parse the request body in JSON format
app.use(express.json());

// Endpoint used to add new posts to the logged-in user
app.post("/upload", verifyToken, upload.any(), async (req, res) => {
    try {
        console.log("being called")
        const { title } = req.body;
        const date = new Date();
        const createdAt = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} @ ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        const time = createdAt.split(" ")[0]
        if (!title || title.length < 1 || !createdAt || createdAt.length < 1) {
            return res.status(400).json({ response: "Ensure to add title and the date created" });
        }
        const TradesmanId = req.user.id;


        const exists = await EmployeeModel.findById(TradesmanId);

        if (!exists) {
            return res.status(404).json({ response: "Tradesman's id could not be found" });
        }

        // Assuming you want to upload the first file in the req.files array
        if (req.files.length === 0) {
            return res.status(400).json({ response: "No files uploaded" });
        }

        // Save post to database
        await EmployeeModel.findByIdAndUpdate(TradesmanId, {
            $push: {
                posts: {
                    title,
                    createdAt,
                    videoName: `${req.files[0].originalname}${time}`,
                    TradesmanId
                }
            }
        });
        await s3Upload(req.files[0], time);

        res.status(200).json({ response: "Successfully posted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ response: "Internal Server Error" });
    }
});

app.get("/posts", verifyToken, async (req, res) => {
    try {
        const TradesmanId = req.user.id
        const exists = await EmployeeModel.findById(TradesmanId);
        const posts = exists.posts

        for (let i = 0; i < posts.length; i++) {
            if (posts[i].videoName != null) {
                posts[i].videoName = await s3Retrieve(posts[i].videoName)
            }
        }
        return res.status(200).json({ videos: posts })

    }
    catch (err) {
        console.log(err)
    }
})

module.exports = app;
