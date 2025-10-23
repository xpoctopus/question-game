// (★★★★★ 중요 ★★★★★)
// HTML 문서가(버튼, 화면 등이) 완전히 준비된 후에 스크립트를 실행하라는 "안전장치"입니다.
// 이 'DOMContentLoaded' 리스너 안에 모든 코드를 넣었습니다.
window.addEventListener('DOMContentLoaded', (event) => {

    // DOM 요소 가져오기
    const screens = {
        home: document.getElementById('screen-home'),
        game: document.getElementById('screen-game'),
        result: document.getElementById('screen-result'),
        myQuestions: document.getElementById('screen-my-questions'),
    };
    const commonButtons = document.querySelector('.common-buttons');

    // 모달(팝업) 요소
    const modals = {
        rules: document.getElementById('modal-rules'),
        hint: document.getElementById('modal-hint'),
        alert: document.getElementById('modal-alert'),
        detail: document.getElementById('modal-question-detail'),
        feedback: document.getElementById('modal-feedback'),
    };
    const closeButtons = document.querySelectorAll('.close-btn');
    const alertMessage = document.getElementById('alert-message');
    const btnAlertConfirm = document.getElementById('btn-alert-confirm');

    // 게임 진행 요소
    const questionCounter = document.getElementById('question-counter');
    const gameImage = document.getElementById('game-image');
    const questionInput = document.getElementById('question-input');

    // 결과 화면 요소
    const totalScoreEl = document.getElementById('total-score');
    const analysisTextEl = document.getElementById('analysis-text');
    const analysisTipEl = document.getElementById('analysis-tip');
    const questionListEl = document.getElementById('question-list');

    // 질문 상세 팝업 요소
    const detailImage = document.getElementById('detail-image');
    const detailQuestionText = document.getElementById('detail-question-text');
    const detailScore = document.getElementById('detail-score');
    const detailEvaluation = document.getElementById('detail-evaluation');

    // 즉시 피드백 팝업 요소
    const feedbackQuestion = document.getElementById('feedback-question');
    const feedbackScore = document.getElementById('feedback-score');
    const feedbackEvaluation = document.getElementById('feedback-evaluation');
    const btnNextQuestion = document.getElementById('btn-next-question');

    // 게임 데이터
    let currentQuestionIndex = 0;
    let totalScore = 0;
    let userSubmissions = []; 
    let retryCount = 0; 
    let gameSessionId = 0; 

    const questionSeeds = [
        'park', 'family', 'cat', 'library', 'drawing', 
        'baking', 'classroom', 'garden', 'rain', 'guitar'
    ];

    const hints = [
        "사진 속 사람들이 *무슨 생각*을 하고 있을까요? 곰곰이 상상해보세요.",
        "'만약에...'로 시작하면 어떨까요? (예: 만약 내가 저 안에 있다면?)",
        "사진에 *보이지 않는* 부분을 상상해보세요. (예: 이 사진이 찍히기 10분 전에는?)",
        "'왜?'라는 질문은 생각을 깊게 만들어요! (예: 왜 저기에 있을까?)",
        "나라면 어떻게 했을지, 나의 *경험*과 연결해서 질문해보세요.",
        "이 사진에 어울리는 다른 *제목*을 질문으로 만들어보는 건 어떨까요?",
    ];

    // --- 유틸리티 함수 ---

    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
        if (screenName === 'game' || screenName === 'result' || screenName === 'myQuestions') {
            commonButtons.style.display = 'block';
        } else {
            commonButtons.style.display = 'none';
        }
    }

    function showModal(modalName) {
        if (modalName === 'feedback') {
            modals.feedback.classList.add('active');
        } else {
            Object.values(modals).forEach(modal => modal.classList.remove('active'));
            if (modals[modalName]) modals[modalName].classList.add('active');
        }
    }

    function closeModal() {
        Object.values(modals).forEach(modal => modal.classList.remove('active'));
    }

    function showAlert(message, onConfirm = null) {
        alertMessage.textContent = message;
        showModal('alert');
        btnAlertConfirm.onclick = () => {
            closeModal();
            if (onConfirm) onConfirm();
        };
    }

    // --- 게임 로직 함수 ---

    function startGame() {
        currentQuestionIndex = 0;
        totalScore = 0;
        userSubmissions = [];
        gameSessionId = Math.floor(Math.random() * 1000); 
        showScreen('game');
        loadQuestion();
    }

    function restartGame() {
        if (confirm("정말 다시 하시겠습니까?")) {
            startGame();
        }
    }

    function quitGame() {
        if (confirm("정말 게임을 종료하시겠습니까?")) {
            showScreen('home');
        }
    }

    function loadQuestion() {
        if (currentQuestionIndex < questionSeeds.length) {
            retryCount = 0; 
            const seed = questionSeeds[currentQuestionIndex];
            gameImage.src = `https://picsum.photos/seed/${seed}${gameSessionId}/600/400`;
            questionCounter.textContent = `"${currentQuestionIndex + 1}번째 사진 (${currentQuestionIndex + 1}/${questionSeeds.length})"`;
            questionInput.value = '';
        } else {
            showResult();
        }
    }

    function showHint() {
        const randomHint = hints[Math.floor(Math.random() * hints.length)];
        document.getElementById('hint-text').textContent = randomHint;
        showModal('hint');
    }

    function checkQuestionFormat(text) {
        const pattern = /[?까요가냐니죠어야지나]$/; 
        if (pattern.test(text)) {
            return { isValid: true };
        }
        return { isValid: false };
    }

    function submitQuestion() {
        const questionText = questionInput.value.trim();
        let submission;

        // 1. 빈칸 검사
        if (questionText.length === 0) {
            showAlert("질문을 입력해주세요!");
            return;
        }

        // 2. 욕설/성의 없는 표현 검사
        const profanityCheck = checkProfanity(questionText);
        if (profanityCheck.isBad) {
            if (retryCount < 1) {
                retryCount++;
                showAlert("적절하지 않은 질문입니다. 질문을 다시 한 번 확인해주세요.");
            } else {
                submission = saveSubmission(questionText, 0, profanityCheck.reason, "inappropriate");
                showImmediateFeedback(submission);
            }
            return;
        }

        // 3. 오탈자 검사
        const typoCheck = checkTypos(questionText);
        if (typoCheck.hasTypo) {
            if (retryCount < 1) {
                retryCount++;
                showAlert(`질문에 오탈자가 있습니다. ('${typoCheck.found}' 발견) 확인해주세요.`);
            } else {
                submission = saveSubmission(questionText, 0, "오탈자 미수정", "typo");
                showImmediateFeedback(submission);
            }
            return;
        }

        // 4. 질문 형식 검사
        const formatCheck = checkQuestionFormat(questionText);
        if (!formatCheck.isValid) {
            if (retryCount < 1) {
                retryCount++;
                showAlert("질문의 형식을 갖춰주세요. (예: ~일까?, ~인가요?)");
            } else {
                submission = saveSubmission(questionText, 0, "질문 형식 오류", "format");
                showImmediateFeedback(submission);
            }
            return;
        }

        // 5. 점수 책정 (모든 검사 통과)
        const scoreResult = calculateScore(questionText);
        submission = saveSubmission(questionText, scoreResult.score, "정상 처리", scoreResult.type);
        totalScore += scoreResult.score;

        // 6. 즉시 피드백
        showImmediateFeedback(submission);
    }

    function showImmediateFeedback(submission) {
        feedbackQuestion.textContent = submission.question;
        feedbackScore.textContent = `${submission.score}점`;
        feedbackEvaluation.textContent = getEvaluationText(submission); 

        if (currentQuestionIndex >= questionSeeds.length - 1) {
            btnNextQuestion.textContent = "최종 결과 보러 가기";
            btnNextQuestion.onclick = () => {
                closeModal();
                showResult();
            };
        } else {
            btnNextQuestion.textContent = "다음 문제";
            btnNextQuestion.onclick = () => {
                closeModal();
                nextQuestion();
            };
        }
        showModal('feedback');
    }

    function nextQuestion() {
        currentQuestionIndex++;
        loadQuestion();
    }

    function saveSubmission(question, score, reason, type) {
        const submission = {
            question: question,
            score: score,
            reason: reason,
            imageSrc: gameImage.src,
            analysisType: type,
        };
        userSubmissions.push(submission);
        return submission;
    }

    function checkProfanity(text) {
        const badWordPattern = /바보|멍청이|ㅅㅂ|ㅂㅅ|존[나|맛]|몰루/; 
        if (badWordPattern.test(text)) {
            return { isBad: true, reason: '욕설/비속어/성의 없는 표현' };
        }
        const onlyConsonants = /^[ㄱ-ㅎ]+$/;
        const onlyVowels = /^[ㅏ-ㅣ]+$/;
        const repeatedChars = /(.)\1{2,}/;
        const onlyNumbers = /^[0-9]+$/;
        if (onlyConsonants.test(text) || onlyVowels.test(text) || repeatedChars.test(text) || onlyNumbers.test(text)) {
             return { isBad: true, reason: '성의 없는 표현 (자음/모음 반복 등)' };
        }
        return { isBad: false };
    }

    function checkTypos(text) {
        const commonTypos = ['않되', '됬', '됌', '됬어', '어떻해', '맜', '있었슴', '할께']; 
        for (const typo of commonTypos) {
            if (text.includes(typo)) {
                return { hasTypo: true, found: typo }; 
            }
        }
        return { hasTypo: false };
    }

    function calculateScore(text) {
        let score = 500;
        let type = 'middle';

        if (text.length < 7) {
            return { score: 50, type: 'too_short' }; 
        }

        const highKeywords = ['만약', '왜', '어떻게 생각', '나라면', '상상', '이유가 뭘까', '경험'];
        const lowKeywords = ['몇 개', '누구', '어디', '무슨 색', '이름이', '언제'];

        for (const k of highKeywords) {
            if (text.includes(k)) {
                score += 300 + Math.floor(Math.random() * 100); 
                type = 'creative';
                break;
            }
        }
        if (type !== 'creative') {
            for (const k of lowKeywords) {
                if (text.includes(k)) {
                    score -= 300 + Math.floor(Math.random() * 100);
                    type = 'simple';
                    break;
                }
            }
        }
        
        if (text.length > 50) {
            score += 150; 
            if (type === 'middle') type = 'creative'; 
        }
        
        score = Math.min(1000, Math.max(50, score)); 
        return { score: score, type: type };
    }

    function getEvaluationText(sub) {
        if (sub.score === 0) {
            return `앗! 점수를 받지 못했어요. 😢 [${sub.reason}] (으)로 인해 점수를 받지 못했네요. 다음 질문은 꼭 규칙을 지켜서 멋진 점수를 받아봐요!`;
        } else if (sub.analysisType === 'too_short') {
            return "앗! 질문이 너무 짧아요. 😅 (예: 이게 뭐야?) 사진을 조금만 더 자세히 보고, 구체적으로 질문해 줄래요?";
        } else if (sub.analysisType === 'creative') {
            return "정말 멋진 질문이에요! 💯 사진 너머의 이야기나 이유를 궁금해하는, 생각을 깊게 만드는 훌륭한 질문입니다. 계속 이렇게 상상력을 펼쳐보세요!";
        } else if (sub.analysisType === 'simple') {
            return "꼼꼼하게 잘 관찰했어요! 👀 사진에 무엇이 있는지 정확하게 짚어냈네요. 다음엔 보이는 것에서 한 걸음 더 나아가, '그래서 어떨까?', '왜 그럴까?' 하고 상상해보는 건 어떨까요?";
        } else { // middle
            return "좋은 질문이에요! 사진을 잘 관찰하고 표현했네요. 여기서 한 걸음만 더 나아가 '왜 그럴까?' 하고 이유를 묻거나 '만약에'를 붙여보면 최고 점수를 받을 수 있을 거예요!";
        }
    }

    function showResult() {
        totalScoreEl.textContent = totalScore;
        const typeCounts = { simple: 0, middle: 0, creative: 0, zero: 0, too_short: 0 };
        userSubmissions.forEach(sub => {
            if (sub.score === 0) typeCounts.zero++;
            else typeCounts[sub.analysisType]++;
        });

        typeCounts.simple += typeCounts.too_short;

        let mainType = 'middle';
        if (typeCounts.creative > typeCounts.simple && typeCounts.creative > typeCounts.middle) {
            mainType = 'creative';
        } else if (typeCounts.simple > typeCounts.creative && typeCounts.simple > typeCounts.middle) {
            mainType = 'simple';
        }

        if (typeCounts.zero > 3) {
            mainType = 'zero';
        }
        
        switch (mainType) {
            case 'creative':
                analysisTextEl.innerHTML = "당신은... <strong>[호기심 많은 돌고래형]</strong> 🐬";
                analysisTipEl.textContent = "지적인 호기심이 넘쳐나는군요! 사진 너머의 이유('왜?')나 미래('만약에?')를 상상하는 깊이 있는 질문을 던졌어요. 세상을 남다른 시각으로 바라보는 멋진 질문가입니다!";
                break;
            case 'simple':
                analysisTextEl.innerHTML = "당신은... <strong>[날카로운 독수리형]</strong> 🦅";
                analysisTipEl.textContent = "매우 뛰어난 관찰력을 가졌네요! 남들이 놓치기 쉬운 부분을 정확하게 포착해서('누가?', '무엇을?') 질문했어요. 이 관찰력에 상상력을 더하면 완벽할 거예요!";
                break;
            case 'zero':
                analysisTextEl.innerHTML = "당신은... <strong>[아직 깨어날 알형]</strong> 🥚";
                analysisTipEl.textContent = "앗! 아직 껍질을 깨지 못했군요. 규칙(욕설X, 오탈자X, 질문형식O)을 지키지 않아 점수를 받지 못한 질문이 많아요. 게임 방법을 다시 확인하고 멋진 새로 태어나 봐요!";
                break;
            case 'middle':
            default:
                analysisTextEl.innerHTML = "당신은... <strong>[따뜻한 곰형]</strong> 🐻";
                analysisTipEl.textContent = "관찰과 상상 사이에서 균형을 잘 잡았어요! 다양한 유형의 질문을 골고루 던졌네요. 곰처럼 든든한 잠재력을 가졌으니, 다음엔 조금 더 과감하게 '왜 그럴까?' 하고 파고들어 볼까요?";
        }
        showScreen('result');
    }

    function showMyQuestions() {
        questionListEl.innerHTML = '';
        userSubmissions.forEach((sub, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${index + 1}. ${sub.question}
                <span class="score-preview">${sub.score}점</span>
            `;
            li.onclick = () => showQuestionDetail(index);
            questionListEl.appendChild(li);
        });
        showScreen('myQuestions');
    }

    function showQuestionDetail(index) {
        const sub = userSubmissions[index];
        detailImage.src = sub.imageSrc;
        detailQuestionText.textContent = sub.question;
        detailScore.textContent = sub.score;
        detailEvaluation.textContent = getEvaluationText(sub);
        modals.detail.classList.add('active'); 
    }

    // --- 이벤트 리스너 연결 ---
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-rules-home').addEventListener('click', () => showModal('rules'));
    document.getElementById('btn-quit-home').addEventListener('click', quitGame);
    document.getElementById('btn-common-rules').addEventListener('click', () => showModal('rules'));
    document.getElementById('btn-common-quit').addEventListener('click', quitGame);
    document.getElementById('btn-hint').addEventListener('click', showHint);
    document.getElementById('btn-submit').addEventListener('click', submitQuestion);
    document.getElementById('btn-view-my-questions').addEventListener('click', showMyQuestions);
    document.getElementById('btn-restart').addEventListener('click', restartGame);
    document.getElementById('btn-back-home').addEventListener('click', () => showScreen('home'));
    document.getElementById('btn-back-to-result').addEventListener('click', () => showScreen('result'));

    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal') && !event.target.id.includes('feedback')) {
            closeModal();
        }
    });

    // 시작!
    showScreen('home');

}); // (★★★★★) DOMContentLoaded 리스너 닫기