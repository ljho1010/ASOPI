const tf = require('@tensorflow/tfjs-node');
// 모델 파일의 경로 및 모델 변수 초기화
const modelPath = 'models/ResNet50V2_epoch10_2'; // 모델 파일 경로
const model = tf.node.loadSavedModel(modelPath);

async function loadModel() {
    try {
        const model = await tf.node.loadSavedModel(modelPath);
        console.log('모델이 성공적으로 로드되었습니다.', model);
    } catch (error) {
        console.error('모델 로드 중 에러:', error);
    }
}
// 모델에 이미지 제출
async function submitToModel(imageTensor) {
    try {
        // 모델이 로드되지 않은 경우 에러 메시지 출력
        if (!model) {
            console.error('모델이 로드 되지 않았습니다.');
            return 'Error submitting to model';
        }
        // 모델 예측 수행
        const predictions = model.predict(imageTensor);

        // 모델 예측 결과 반환
        return predictions.dataSync();
    } catch (error) {
        // 예외 발생 시 에러 메시지 출력
        console.error('Error submitting to model:', error);
        return 'Error submitting to model';
    }
}

module.exports = { submitToModel, loadModel };
