const oracledb = require('oracledb');
const axios = require('axios');
const bcrypt = require('bcrypt');

// 회원가입
async function signUp(nickname, password, email) {
    const connection = await oracledb.getConnection();
    try {
        // 암호화된 비밀번호 생성
        const hashedPassword = await bcrypt.hash(password, 10);

        // 회원가입 쿼리 실행
        const sql = `INSERT INTO USER_TABLE (NICKNAME, PASSWORD, EMAIL) VALUES (:nickname, :password, :email)`;
        const binds = { nickname, password: hashedPassword, email };

        await connection.execute(sql, binds);
        console.log('User registered successfully!');
    } catch (err) {
        console.error('Error registering user:', err.message);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err.message);
            }
        }
    }
}

// 로그인
async function login(email, password) {
    const connection = await oracledb.getConnection();
    try {
        // 사용자 정보 조회
        const sql = 'SELECT ID, NICKNAME, PASSWORD FROM USER_TABLE WHERE EMAIL = :email';
        const binds = { email };

        const result = await connection.execute(sql, binds);

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        const user = result.rows[0];
        const hashedPassword = user[2];

        // 비밀번호 일치 확인
        if (!hashedPassword) {
            throw new Error('Hashed password not found');
        }

        const passwordMatch = await bcrypt.compare(password, hashedPassword);

        if (!passwordMatch) {
            throw new Error('Incorrect password');
        }

        console.log('User logged in successfully!');
        return { id: user[0], name: user[1] };
    } catch (err) {
        console.error('Error logging in:', err.message);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err.message);
            }
        }
    }
}

// 마이페이지
async function myPage(email) {
    const connection = await oracledb.getConnection();
    try {
        // 사용자 정보 가져오기
        const sql = 'SELECT RECORD, RECORD_DATE FROM USER_RECORD WHERE EMAIL = :email';
        const binds = { email };

        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) {
            console.log('No records found for the user.');
            return [];
        }

        const userRecords = result.rows.map((row) => {
            return {
                record: JSON.parse(row.RECORD), // JSON 형식으로 저장된 데이터를 객체로 변환
                recordDate: row.RECORD_DATE,
            };
        });

        console.log('User records fetched successfully:', userRecords);
        return userRecords;
    } catch (error) {
        console.error('Error fetching user records:', err.message);
        throw err;
    } finally {
        // 연결 닫기
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err.message);
            }
        }
    }
}

// 카카오 토큰 받아오기
async function getKakaoToken(code) {
    try {
        const clientID = process.env.KAKAO_ID;
        const clientSecret = process.env.KAKAO_SECRET;
        const redirectURI = process.env.KAKAO_URL;

        const auth = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');
        const tokenResponse = await axios.post(
            'https://kauth.kakao.com/oauth/token',
            `grant_type=authorization_code&client_id=${clientID}&client_secret=${clientSecret}&redirect_uri=${redirectURI}&code=${code}`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        const kakaoToken = tokenResponse.data.access_token;

        return kakaoToken;
    } catch (error) {
        console.error('Error getting Kakao token:', error);
        throw error;
    }
}

// 카카오 사용자 정보 가져오기
async function getKakaoUserInfo(accessToken) {
    try {
        const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        // 로그인한 사용자의 전체 정보를 콘솔에 출력
        console.log('카카오 사용자 전체 정보:', userResponse.data);

        // 사용자의 닉네임 및 이메일 가져오기
        const profileNickname = userResponse.data.properties?.nickname;
        const accountEmail = userResponse.data.kakao_account?.email;

        console.log('프로필 닉네임:', profileNickname);
        console.log('계정 이메일:', accountEmail);

        return {
            profileNickname,
            accountEmail,
        };
    } catch (error) {
        console.error('Error getting Kakao user info:', error);
        throw error;
    }
}

module.exports = {
    signUp,
    login,
    myPage,
    getKakaoToken,
    getKakaoUserInfo,
};
