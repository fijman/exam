let currentAccess = [];
let currentTestType = '';
let questions = [];
let Rolle = '';
document.getElementById('loginBtn').addEventListener('click', () => {
  const codeInput = document.getElementById('password').value.trim();

  fetch('code.json')
    .then(response => response.json())
    .then(data => {
      const entry = data.codes.find(c => c.code === codeInput && c.valid);
      if (entry) {
        currentAccess = entry.access;

        if (!currentAccess.includes('advocate')) {
          document.getElementById('btn-advocate').style.display = 'none';
        }
        if (!currentAccess.includes('senior_advocate')) {
          document.getElementById('btn-senior').style.display = 'none';
        }
        if (!currentAccess.includes('zpka')) {
          document.getElementById('btn-zpka').style.display = 'none';
        }

        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('roleSelection').classList.remove('hidden');
      } else {
        alert('Неверный или недействительный код');
      }
    })
    .catch(error => console.error('Ошибка загрузки кода: ', error));
});


function startTest(type) {
  currentTestType = type;

  let questionCount = type === 'advocate' ? 10 : type === 'senior_advocate' ? 15 : 20;

  if (type === 'advocate') Rolle = 'Экзамен на Адвоката';
  else if (type === 'senior_advocate') Rolle = 'Экзамен на Старшего Адвоката';
  else if (type === 'zpka') Rolle = 'Экзамен на Заместителя Председателя Коллегии Адвокатов';

  // Загрузка вопросов с backend
  fetch(`/api/questions/${type}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        // Фильтрация по баллам
        const ones = shuffleArray(data.filter(q => q.points === 1));
        const twos = shuffleArray(data.filter(q => q.points === 2));
        const threes = shuffleArray(data.filter(q => q.points === 3));

        // Количество вопросов по баллам
        const count1 = Math.round(questionCount * 0.4);
        const count2 = Math.round(questionCount * 0.3);
        const count3 = questionCount - count1 - count2;

        // Выбираем нужное количество из каждой категории
        const selectedQuestions = [
          ...ones.slice(0, count1),
          ...twos.slice(0, count2),
          ...threes.slice(0, count3)
        ];

        // Перемешиваем финальный список
        questions = shuffleArray(selectedQuestions);

        renderQuestions();
        document.getElementById('roleSelection').classList.add('hidden');
        document.getElementById('examPanel').classList.remove('hidden');
      } else {
        console.error('Нет вопросов в базе данных для', type);
      }
    })
    .catch(error => console.error('Ошибка при загрузке вопросов: ', error));
}

function renderQuestions() {
  const container = document.getElementById('questions');
  container.innerHTML = '';

  questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.innerHTML = `
      <p>${index + 1}. ${q.text} <span class="question-points">(кол-во баллов: ${q.points})</span></p>
      <div class="answer-group">
        <input type="radio" name="q${index}" id="q${index}v" value="Верно">
        <label for="q${index}v">Верно</label>

        <input type="radio" name="q${index}" id="q${index}n" value="Неверно">
        <label for="q${index}n">Неверно</label>
      </div>
      <div id="explanation${index}">
        <p id="pos"><strong>Пояснение:</strong> ${q.explanation}</p>
      </div>
    `;
    container.appendChild(div);
  });
}


function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

document.getElementById('submitBtn').addEventListener('click', () => {
  const examinee = document.getElementById('examineeName').value.trim();
  const examiner = document.getElementById('examinerName').value.trim();

  if (!examinee || !examiner) {
    alert('Пожалуйста, заполните все поля.');
    return;
  }

  let totalScore = 0;
  let maxScore = 0;

  questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    const isCorrect = selected && selected.value === 'Верно';
    if (isCorrect) totalScore += q.points;
    maxScore += q.points;

    // Показываем пояснение
    const explanationDiv = document.getElementById(`explanation${index}`);
    if (explanationDiv) {
      explanationDiv.classList.remove('hidden');
    }
  });

  const percent = Math.round((totalScore / maxScore) * 100);

  // Устанавливаем проходной балл в зависимости от типа теста
  let passThreshold = 60;
  if (currentTestType === 'advocate') passThreshold = 40;
  else if (currentTestType === 'senior_advocate') passThreshold = 60;
  else if (currentTestType === 'zpka') passThreshold = 75;
  
  const passed = percent >= passThreshold;


  // Сбросим старые результаты, чтобы убрать рамку (если она осталась)
  const resultElement = document.getElementById('result');
  resultElement.classList.remove('success', 'fail'); // Убираем классы 'success' и 'fail'

  // Добавляем новый класс для результата
  resultElement.classList.add(passed ? 'success' : 'fail');
  resultElement.innerText = `Результат: ${percent}% (${totalScore} из ${maxScore} баллов)`;

  // Отправляем данные в Discord
  sendToWebhook(totalScore, maxScore, percent, passed, examinee, examiner);

  // Вернуть к выбору
  setTimeout(() => {
    // Скрываем панель с результатами и показываем выбор экзамена
    document.getElementById('examPanel').classList.add('hidden');
    document.getElementById('roleSelection').classList.remove('hidden');
    
    // Очищаем результат
    resultElement.innerText = '';
    
    // Сбрасываем форму и скрываем пояснения
    document.getElementById('examForm').reset();
    
    // Убираем старые результаты
    resultElement.classList.remove('success', 'fail'); // Сброс рамки
  }, 5000);
});



function sendToWebhook(score, total, percent, passed, examineeName, examinerName) {
  const fields = [

    { 
      name: "Экзаменуемый:", 
      value: `**<@${examineeName}>**` 
    },
    { 
      name: "Экзаменатор:", 
      value: `**<@${examinerName}>**` 
    },
    { name: "Баллы:", value: "`" + `${score} из ${total}` + "`" },
    { name: "Процент:", value: "`" + `${percent.toFixed(1)}%` + "`" }
  ];
  const webhookUrl = 'https://discord.com/api/webhooks/1359949504689995796/1Me_7B3yai5YDC_7K6ck_YDg9aWvke9qLGEAIfAB00b_0dBX8XDcd5Qdkk55V2mGylfT';

  const payload = {
    username: "Секретарь адвокатуры",
    avatar_url: "https://images-ext-1.discordapp.net/external/_E6k2LyPCkITZ8Yw-NHt5II-3orcFJb8cGjVk_ts4Lg/https/i.imgur.com/hdNDCt0.png?format=webp&quality=lossless",
    content: `**<@${examineeName}>**` + `${passed ? ' прошел экзамен ✅' : ' не прошел экзамен ❌'}`,
    embeds: [
      {
        title: 'Результаты экзамена',
        description: Rolle,
        fields: fields,
        color: passed ? 3857994 : 16719659,
        footer: {
          text: "Частная Коллегия Адвокатов IronSide Justice.",
          icon_url: 'https://cdn.discordapp.com/attachments/1303450766236979252/1303454138801324134/undefined_-_Imgur_5.png'
        },
        thumbnail: {
          url: 'https://media.discordapp.net/attachments/1302639052008456258/1359502002899648758/249b84c349454074.png'
        },
        image: {
          url: 'https://media.discordapp.net/attachments/1302639052008456258/1359517606947852390/a4ea191ad79b03f3.png'
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (response.ok) {
      console.log("Сообщение успешно отправлено на вебхук.");
    } else {
      console.error("Ошибка отправки на вебхук:", response.status, response.statusText);
    }
  })
  .catch(error => {
    console.error("Ошибка при отправке запроса:", error);
  });
}
