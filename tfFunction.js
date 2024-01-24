const tf = require('@tensorflow/tfjs-node');
// 모델 파일의 경로 및 모델 변수 초기화
const modelPath = 'models/ResNet50V2_epoch10_2'; // 모델 파일 경로
let model;

// class_dictionary 전역으로 선언
const class_dictionary = {
    A01: 'melanocytic nevus',
    A02: 'mongolian spot',
    A03: 'Beckers nevus',
    A04: 'cafe au lait spot',
    A05: 'salmon patch',
    A06: 'epidermal nevi',
    A07: 'nevus sebaceus',
    A08: 'port-wine mark',
    A09: 'infantile hemangioma',
    B01: 'baby Psoriasis',
    B02: 'urticaria',
    B03: 'baby Acne',
    B04: 'baby atopic dermatitis',
    B05: 'lichen simplex chronicus',
    B06: 'Nummular eczema',
    C01: 'Herpes Simplex',
    C02: 'Varicella',
    C03: 'Molluscum Contagiosum',
    C04: 'Impetigo',
    C05: 'Hives Urticaria Acute',
    C06: 'Tinea',
    C07: 'hand-foot-and-mouth disease',
    D01: 'vitiligo',
    D02: 'juvenile xanthogranuloma',
    D03: 'melanoma',
    D04: 'keloids',
    D05: 'mastocytoma',
    D06: 'lichen striatus',
    D07: 'seborrhoeic dermatitis baby',
    D08: 'heat rash',
};

async function loadModel() {
    try {
        if (!model) {
            // 모델이 이미 로드되어 있지 않은 경우에만 로드
            model = await tf.node.loadSavedModel(modelPath);
            console.log('모델이 성공적으로 로드되었습니다.', model);
        } else {
            console.log('모델이 이미 로드되어 있습니다.');
        }
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

        // 가장 큰 값을 갖는 인덱스 찾기
        const predictedIndex = predictions.indexOf(Math.max(...predictions));

        // 해당 클래스 찾기
        const predictedClass = Object.keys(class_dictionary)[predictedIndex];

        // 예측 결과 반환
        return class_dictionary[predictedClass];
    } catch (error) {
        // 예외 발생 시 에러 메시지 출력
        console.error('Error submitting to model:', error);
        return 'Error submitting to model';
    }
}

module.exports = { submitToModel, loadModel };
