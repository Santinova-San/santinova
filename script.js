document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // ** COLE AQUI O SEU ÚNICO WEBHOOK DO MAKE **
    const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/61m7xod5nq2qsiumlotwegkdxyl3welo'; 

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
        if (!data || !data.type) {
            addMessageToChat("Desculpe, recebi uma resposta que não entendi.", 'bot');
            return;
        }

        // Lógica para decidir o que fazer com base na resposta do Make
        if (data.type === 'reply') {
            addMessageToChat(data.text, 'bot');
        } else if (data.type === 'prompt_ouvidoria') {
            addMessageToChat(data.text, 'bot');
            disableInput();
            createOuvidoriaButtons();
        } else if (data.type === 'confirmation') {
             addMessageToChat(data.text, 'bot');
             enableInput();
        }
    }
    
    function createOuvidoriaButtons() {
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
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.innerHTML = '<p>Digitando...</p>';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            handleApiResponse(data);
        } catch (error) {
            console.error('Erro ao comunicar com o Make:', error);
            addMessageToChat('Desculpe, houve um erro ao processar sua solicitação.', 'bot');
            enableInput(); // Reabilita o input em caso de erro
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
