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
        messageDiv.innerHTML = `<p>${message}</p>`; // Usamos <p> para o texto
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll para o final
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
        // Log para depuração: veja o que o Make está enviando
        console.log("Resposta recebida do Make:", data); 

        // Verifique se 'data' e 'data.type' existem e são válidos
        if (!data || typeof data.type === 'undefined' || typeof data.text === 'undefined') {
            addMessageToChat("Desculpe, recebi uma resposta do servidor em um formato inesperado.", 'bot');
            enableInput(); // Reabilita para o usuário tentar novamente
            return;
        }

        // Lógica para decidir o que fazer com base na resposta do Make
        if (data.type === 'reply') {
            addMessageToChat(data.text, 'bot');
            enableInput(); // Sempre reabilita o input após uma resposta normal
        } else if (data.type === 'prompt_ouvidoria') {
            addMessageToChat(data.text, 'bot');
            disableInput(); // Desabilita o input de texto normal
            createOuvidoriaButtons(); // Cria os botões Sim/Não
        } else if (data.type === 'confirmation') {
             addMessageToChat(data.text, 'bot');
             enableInput(); // Habilita o input novamente após confirmação
        } else {
            addMessageToChat("Desculpe, recebi uma resposta com um tipo desconhecido.", 'bot');
            enableInput();
        }
    }
    
    function createOuvidoriaButtons() {
        // Primeiro, remova quaisquer botões de ouvidoria anteriores para evitar duplicatas
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
        // Remova qualquer indicador de digitação existente antes de adicionar um novo
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
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json(); // Tenta parsear a resposta como JSON
            handleApiResponse(data);
        } catch (error) {
            console.error('Erro ao comunicar com o Make:', error);
            // Mensagem de erro mais específica se o JSON não puder ser parseado
            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                 addMessageToChat('Desculpe, o servidor enviou uma resposta inválida (não-JSON).', 'bot');
            } else {
                addMessageToChat('Desculpe, houve um erro de rede ao processar sua solicitação.', 'bot');
            }
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
        sendDataToMake({ type: 'message', text: messageText }); // Envia como tipo 'message'
    }

    function sendChoice(choice, container) {
        // Desabilitar os botões clicados e mostrar a escolha do usuário
        container.innerHTML = `<p class="choice-made">Sua escolha: ${choice === 'sim' ? 'Sim' : 'Não'}. Processando...</p>`;
        
        // Envia a escolha como tipo 'choice'
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
