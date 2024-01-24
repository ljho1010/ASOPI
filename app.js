const express = require('express');
const http = require('http');
const axios = require('axios');
const tfServer = require('./tfServer'); // TensorFlow 서버 모듈
const tfFunction = require('./tfFunction');
const database = require('./database');
const user = require('./user');
const jwt = require('jsonwebtoken'); // jwt 모듈 추가
const cookieParser = require('cookie-parser'); // 쿠키 파서 모듈 추가
const path = require('path');
const app = express();
require('dotenv').config();
const port = process.env.PORT;

// 쿠키 파서 미들웨어 등록
app.use(cookieParser());

// 정적 파일 서비스 설정
app.use(express.static('public'));
// TensorFlow 서버 라우터 등록
app.use('/tf', tfServer);
// 이미지 저장경로 설정
app.use('/uploads', express.static('uploads'));
// body-parser 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 회원가입 처리
app.post('/signup', async (req, res) => {
    const { name, password, email } = req.body;

    try {
        await user.signUp(name, password, email);
        res.json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// 로그인 처리
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userInfo = await user.login(email, password);
        const redirectTo = 'http://localhost:3000';

        // JWT 생성 및 쿠키에 저장
        const token = jwt.sign({ userId: userInfo.id, userName: userInfo.name }, process.env.JWT_SECRET, {
            expiresIn: '2h',
        });
        res.cookie('token', token, { httpOnly: true });
        // 클라이언트에게 리다이렉트 URL을 전달
        res.json({ message: 'Login successful!', user: userInfo, redirectTo: redirectTo || '/' });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(401).json({ error: 'Login failed' });
    }
});

app.get('/login/kakao', (req, res) => {
    const clientID = process.env.KAKAO_ID;
    const redirectURI = process.env.KAKAO_URL;

    res.redirect(
        `https://kauth.kakao.com/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&response_type=code`
    );
});

app.get('/oauth', async (req, res) => {
    const { code } = req.query;
    const clientID = process.env.KAKAO_ID;
    const clientSecret = '';
    const redirectURI = process.env.KAKAO_URL;

    try {
        // 카카오 토큰 받아오기
        const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', {
            grant_type: 'authorization_code',
            client_id: clientID,
            client_secret: clientSecret,
            redirect_uri: redirectURI,
            code,
        });

        const accessToken = tokenResponse.data.access_token;

        // 카카오 사용자 정보 가져오기
        const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const userInfo = userResponse.data;
        // 여기에서 userInfo를 사용하여 로그인 로직을 처리할 수 있습니다.

        res.json(userInfo);
    } catch (error) {
        console.error('카카오 API 오류:', error);
        res.status(500).json({ error: '카카오 API 오류' });
    }
});

// JWT 검증 미들웨어
function verifyToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    });
}

// 마이페이지
app.get('/mypage/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const userRecords = await user.myPage(email);

        // 마이페이지 정보를 클라이언트에게 전달
        res.json({ success: true, data: userRecords });
    } catch (error) {
        console.error('Error in /mypage/:email API:', error.message);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// 업로드 폼 보여주기
app.get('/diagnosis', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'diagnosis.html'));
});

// 서버 시작 시 Oracle DB 연결
app.listen(port, async () => {
    await database.connectToDB();
    await tfFunction.loadModel();
    console.log(`${port}번 포트에서 열렸습니다.`);
});
