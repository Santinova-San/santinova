
document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // ** COLE AQUI O SEU ÚNICO WEBHOOK DO MAKE **
    const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/61m7xod5nq2qsiumlotwegkdxyl3welo'; 

    // ** GERA UM ID ÚNICO PARA ESTA SESSÃO DE CONVERSA **
    const threadId = 'thread_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    console.log("ID da Conversa (Thread ID):", threadId); // Para você poder ver o ID no console

    // --- FUNÇÕES AUXILIARES ---
    function addMessageToChat(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.innerHTML = `<p>${message}</p>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function disableInput(message = "Aguardando sua escolha...") {
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = message;
    }

    function enableInput() {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.placeholder = "Digite sua mensagem...";
        userInput.focus();
    }
    
    // --- FUNÇÕES PRINCIPAIS ---
    async function handleApiResponse(data) {
        console.log("Resposta recebida do Make:", data); 

        if (!data || typeof data.type === 'undefined' || typeof data.text === 'undefined') {
            addMessageToChat("Desculpe, recebi uma resposta do servidor em um formato inesperado.", 'bot');
            enableInput();
            return;
        }

        if (data.type === 'reply') {
            addMessageToChat(data.text, 'bot');
            enableInput();
        } else if (data.type === 'prompt_ouvidoria') {
            addMessageToChat(data.text, 'bot');
            disableInput();
            createOuvidoriaButtons();
        } else if (data.type === 'confirmation') {
             addMessageToChat(data.text, 'bot');
             enableInput();
        } else {
            addMessageToChat("Desculpe, recebi uma resposta com um tipo desconhecido.", 'bot');
            enableInput();
        }
    }
    
    function createOuvidoriaButtons() {
        const existingButtonContainers = chatMessages.querySelectorAll('.button-container');
        existingButtonContainers.forEach(container => container.remove());

        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');

        const yesButton = document.createElement('button');
        yesButton.innerText = 'Sim';
        yesButton.classList.add('choice-button');

        const noButton = document.createElement('button');
        noButton.innerText = 'Não';
        noButton.classList.add('choice-button');

        buttonContainer.appendChild(yesButton);
        buttonContainer.appendChild(noButton);
        chatMessages.appendChild(buttonContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        yesButton.addEventListener('click', () => sendChoice('sim', buttonContainer));
        noButton.addEventListener('click', () => sendChoice('nao', buttonContainer));
    }
    
    async function sendDataToMake(body) {
        const existingTypingIndicator = document.querySelector('.typing-indicator');
        if (existingTypingIndicator) {
            chatMessages.removeChild(existingTypingIndicator);
        }

        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.innerHTML = '<p>Digitando...</p>';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // Adiciona o thread_id ao corpo da requisição
            const fullBody = { ...body, thread_id: threadId };

            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullBody)
            });
            const data = await response.json();
            handleApiResponse(data);
        } catch (error) {
            console.error('Erro ao comunicar com o Make:', error);
            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                 addMessageToChat('Desculpe, o servidor enviou uma resposta inválida (não-JSON).', 'bot');
            } else {
                addMessageToChat('Desculpe, houve um erro de rede ao processar sua solicitação.', 'bot');
            }
            enableInput();
        } finally {
            const currentTypingIndicator = document.querySelector('.typing-indicator');
            if (currentTypingIndicator) {
                chatMessages.removeChild(currentTypingIndicator);
            }
        }
    }

    function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;
        addMessageToChat(messageText, 'user');
        userInput.value = '';
        sendDataToMake({ type: 'message', text: messageText });
    }

    function sendChoice(choice, container) {
        container.innerHTML = `<p class="choice-made">Sua escolha: ${choice === 'sim' ? 'Sim' : 'Não'}. Processando...</p>`;
        sendDataToMake({ type: 'choice', value: choice }); 
    }
    
    // --- EVENT LISTENERS ---
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
