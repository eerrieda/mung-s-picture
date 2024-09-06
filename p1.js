const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// 파일 저장 설정
const upload = multer({
    dest: 'uploads/', // 업로드된 파일이 저장될 디렉토리
    limits: { fileSize: 5 * 1024 * 1024 } // 최대 파일 크기 5MB
});

// IP 로그 기록을 위한 스트림
const logStream = fs.createWriteStream(path.join(__dirname, 'ip-logs.txt'), { flags: 'a' });

// 미들웨어: 모든 요청의 IP 주소 기록
app.use((req, res, next) => {
    const ip = req.ip;
    logStream.write(`${new Date().toISOString()} - IP: ${ip}\n`);
    next();
});

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 업로드 페이지
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 파일 업로드 처리
app.post('/upload', upload.array('files'), (req, res) => {
    res.send('파일 업로드 완료!');
});

// 파일 삭제 처리
app.post('/delete', express.json(), (req, res) => {
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

// 관리자 페이지
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
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

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
