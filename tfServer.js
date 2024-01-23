const express = require('express');
const multer = require('multer');
const database = require('./database');
const path = require('path');
const fs = require('fs').promises;
const tf = require('@tensorflow/tfjs-node');
const { submitToModel, preprocessImage } = require('./tfFunction'); // TensorFlow 관련 함수

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

// 모델 파일의 경로 및 모델 변수 초기화
const modelPath = 'models/your_model'; // 모델 파일 경로
let model;

// 모델 로드 간격 설정
const modelLoadInterval = 5000; // 5초 간격으로 모델 로드를 시도

// 모델 로드 함수
function loadModel() {
    let count = modelLoadInterval / 1000;

    function printCountdown() {
        console.log(`모델 로드를 시도합니다... (남은 시간: ${count}초)`);
        count--;

        if (count >= 0) {
            setTimeout(printCountdown, 1000); // 1초마다 호출
        } else {
            // 5초 경과 후에 모델 로드 시도
            tf.loadLayersModel(`file://${modelPath}`)
                .then((loadedModel) => {
                    model = loadedModel;
                    console.log('모델이 성공적으로 로딩되었습니다.');
                })
                .catch((error) => {
                    console.error('모델을 불러오는데 실패했습니다', error);
                    console.log(`5초 뒤 다시 모델 로드를 시도합니다...`);
                    setTimeout(loadModel, modelLoadInterval);
                });
        }
    }

    // 초기 카운트다운 시작
    printCountdown();
}

// 초기 모델 로드
loadModel();

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
