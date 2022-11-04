const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

const MONGO_URI = 'mongodb://127.0.0.1:27017/serialKeys';
const SerialKeys = require('./serialKeys');

const mondoconfig = { useNewUrlParser: true, useUnifiedTopology: true }

mongoose.connect(MONGO_URI, mondoconfig).then(_ => console.log('MongoDB connected'));


app.post('/assign/serialKey', async function (req, res) {
    const { machineId, userId, serialKey } = req.body;
    if (!(machineId && userId && serialKey))
        return res.status(400).json({ status: false, msg: 'Provide required fields' });

    try {
        const isValidKey = await SerialKeys.findOne({ serialKey });
        if (!isValidKey) return res.status(400).json({ status: false, msg: 'Invalid serial key' });

        const currentSerialKey = await SerialKeys.findOne({ serialKey });
        if (currentSerialKey) return res.status(400).json({ status: false, msg: 'This key is already used' });

        const key = new SerialKeys(req.body);
        await key.save();
        return res.status(200).json({ status: true, msg: 'Serial key added for the user' });

    } catch (err) {
        return res.status(500).json({ status: false, msg: err.message })
    }
});

app.listen(3000, _ => console.log('Server is running'));