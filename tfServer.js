const express = require('express');
const multer = require('multer');
const database = require('./database');
const path = require('path');
const fs = require('fs').promises;
const tf = require('@tensorflow/tfjs-node');
const { submitToModel, preprocessImage, loadModel } = require('./tfFunction'); // TensorFlow 관련 함수

loadModel();
const tfServer = express.Router();

// multer를 사용해 이미지 업로드 처리
const storage = multer.memoryStorage(); // Buffer에 직접 파일을 저장
// const upload = multer({ storage: storage });

const upload = multer({
    storage: storage,
    // limits: {
    //   fileSize: 5 * 1024 * 1024, // 5MB 제한
    // },
    fileFilter: (req, file, cb) => {
        // 파일 형식 제한
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    },
});

// 이미지 업로드 및 모델에 제출 처리
tfServer.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    //이미지 정보 로깅
    console.log('image received: ', req.file);

    const imageBuffer = req.file.buffer;

    const imageTensor = tf.node.decodeImage(imageBuffer);

    // 모델이 로드 되지 않은 경우
    if (!model) {
        return res.status(500).send('Model not loaded. Please try again later.');
    }
    // 모델에 이미지 제출 및 결과 출력
    const modelResult = await submitToModel(imageTensor);

    // 데이터 베이스에 모델 결과 저장
    try {
        await database.saveModelResult(modelResult);
    } catch (error) {
        console.error('Error saving model result to database:', error);
        res.status(500).json({ error: 'saving failed' });
    }

    // 데이터 베이스에서 symptom을 불러오기
    try {
        const symptom = await database.getSymptom(modelResult);

        // 웹 페이지에 이미지 띄우기
        res.json({ image: `/uploads/${req.file.filename}`, modelResult, symptom });
    } catch (error) {
        console.error('can not load symptom:', error);
        res.status(500).json({ error: 'Failed to load symptoms' });
    }
});

// 이미지 삭제 처리
tfServer.delete('/delete/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    try {
        await fs.unlink(filePath);
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Error deleting image' });
    }
});

module.exports = tfServer;
