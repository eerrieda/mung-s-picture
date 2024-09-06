const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

// 사용자 데이터를 저장할 메모리 저장소 (실제 구현 시 데이터베이스 사용)
let users = [];
let uploadedImages = [];  // 업로드된 이미지를 저장하는 배열 (파일 경로 혹은 데이터)

// 임시 관리자 계정 생성
const admin = {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'  // role을 통해 관리자 여부를 구분
};

users.push(admin);

app.use(bodyParser.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// 정적 파일 제공
app.use(express.static('public'));

// 회원가입 처리
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;

    // 이미 존재하는 이메일 확인
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
        return res.send('이미 존재하는 이메일입니다.');
    }

    // 새로운 사용자 추가 (일반 사용자로 기본 생성)
    users.push({ username, email, password, role: 'user' });
    res.send('회원가입 완료! 로그인 페이지로 이동하세요.');
});

// 로그인 처리
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // 사용자 인증
    const user = users.find(user => user.email === email && user.password === password);
    if (user) {
        req.session.user = user;  // 세션에 사용자 정보 저장
        res.redirect('/upload');  // 로그인 성공 시 업로드 페이지로 리다이렉트
    } else {
        res.send('로그인 실패. 이메일 또는 비밀번호를 확인하세요.');
    }
});

// 사진 업로드 페이지 (로그인 상태 확인)
app.get('/upload', (req, res) => {
    if (req.session.user) {
        res.sendFile(__dirname + '/public/upload.html');  // 로그인 상태일 경우 업로드 페이지 제공
    } else {
        res.redirect('/login.html');  // 로그인하지 않은 경우 로그인 페이지로 이동
    }
});

// 사진 업로드 처리
app.post('/upload-image', (req, res) => {
    if (req.session.user) {
        const { imageUrl } = req.body;  // 클라이언트에서 이미지 URL을 전송
        uploadedImages.push({ imageUrl, uploadedBy: req.session.user.username });
        res.send('이미지 업로드 완료!');
    } else {
        res.status(403).send('로그인된 사용자만 업로드할 수 있습니다.');
    }
});

// 사진 삭제 처리 (관리자만 가능)
app.post('/delete-image', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        const { imageUrl } = req.body;

        // 해당 이미지를 찾아서 배열에서 제거
        uploadedImages = uploadedImages.filter(image => image.imageUrl !== imageUrl);
        res.send('이미지 삭제 완료!');
    } else {
        res.status(403).send('관리자만 이미지를 삭제할 수 있습니다.');
    }
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 서버 실행
app.listen(3000, () => {
    console.log('서버가 http://localhost:3000 에서 실행 중입니다.');
});
