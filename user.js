const oracledb = require('oracledb');
const bcrypt = require('bcrypt');

// 회원가입
async function signUp(name, password, email) {
    const connection = await oracledb.getConnection();
    try {
        // 암호화된 비밀번호 생성
        const hashedPassword = await bcrypt.hash(password, 10);

        // 회원가입 쿼리 실행
        const sql = `INSERT INTO USER_TABLE (NAME, PASSWORD, EMAIL) VALUES (:name, :password, :email)`;
        const binds = { name, password: hashedPassword, email };

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
        const sql = 'SELECT ID, NAME, PASSWORD FROM USER_TABLE WHERE EMAIL = :email';
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

module.exports = {
    signUp,
    login,
};
