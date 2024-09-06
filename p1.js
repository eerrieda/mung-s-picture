const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

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

// 파일 저장 설정
const upload = multer({
    dest: 'uploads/', // 업로드된 파일이 저장될 디렉토리
    limits: { fileSize: 5 * 1024 * 1024 } // 최대 파일 크기 5MB
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // JSON 바디 파싱

// IP 로그 기록을 위한 스트림
const logStream = fs.createWriteStream(path.join(__dirname, 'ip-logs.txt'), { flags: 'a' });

// 세션 설정
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// 미들웨어: 모든 요청의 IP 주소 기록
app.use((req, res, next) => {
    const ip = req.ip;
    logStream.write(`${new Date().toISOString()} - IP: ${ip}\n`);
    next();
});

// 정적 파일 제공
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

// 업로드 페이지
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
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

// 파일 업로드 처리
app.post('/upload', upload.array('files'), (req, res) => {
    res.send('파일 업로드 완료!');
});

// 사진 업로드 페이지 (로그인 상태 확인)
app.get('/upload', (req, res) => {
    if (req.session.user) {
        res.sendFile(__dirname + '/public/upload.html');  // 로그인 상태일 경우 업로드 페이지 제공
    } else {
        res.redirect('/');
    }
});

// 파일 삭제 처리
app.post('/delete', (req, res) => {
    const { imageUrl, password } = req.body;
    if (password === 'admin123') {
        const filePath = path.join(__dirname, 'uploads', path.basename(imageUrl));
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).send('파일 삭제 실패');
            }
            res.send('파일 삭제 완료');
        });
    } else {
        res.status(403).send('권한이 없습니다.');
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

// 관리자 페이지
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

// 사진 삭제 처리 (관리자만 가능)
app.post('/delete-image', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        const { imageUrl } = req.body;

        // 해당 이미지를 찾아서 배열에서 제거
        uploadedImages = uploadedImages.filter(image => image.imageUrl !== imageUrl);
        res.send('이미지 삭제 완료!');
    } else {
        res.status(403).send('권한이 없습니다.');
    }
});

// 관리자 페이지의 IP 로그 요청 처리
app.get('/admin/ip-logs', (req, res) => {
    const adminPassword = req.query.password;
    if (adminPassword === 'admin123') {  // 관리자 비밀번호 확인
        fs.readFile(path.join(__dirname, 'ip-logs.txt'), 'utf8', (err, data) => {
            if (err) {
                res.status(500).send('로그 파일 읽기 실패');
                return;
            }
            res.send(`<pre>${data}</pre>`);
        });
    } else {
        res.status(403).send('권한이 없습니다.');
    }
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 서버 실행
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
