
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
        import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

        // =========================================================
        // Autenticação Firebase
        // =========================================================
                const firebaseConfig = {
                        apiKey: "AIzaSyCzZMFsQepPQcagU14TH3Ag2oeZcJ7lav0",
                        authDomain: "pesquisadesatisfacao-3d499.firebaseapp.com",
                        projectId: "pesquisadesatisfacao-3d499",
                        storageBucket: "pesquisadesatisfacao-3d499.firebasestorage.app",
                        messagingSenderId: "659023601137",
                        appId: "1:659023601137:web:c786f5e291c10fddb4b850",
                        measurementId: "G-XZSNL37MM5"
};

        // =========================================================

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        let redirectAfterModal = false;
        let selectedIndicacao = null;
        function showModal(msg, redirect = false) { redirectAfterModal = redirect; document.getElementById('modal-message').innerText = msg; document.getElementById('custom-modal').classList.remove('hidden'); }
        function closeModal() { document.getElementById('custom-modal').classList.add('hidden'); if(redirectAfterModal) window.location.href = "index.html"; }
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-close-modal-x').addEventListener('click', closeModal);

        // Lógica de Indicação
        window.selecionarIndicacao = (val) => {
            selectedIndicacao = val;
            document.getElementById('btn-indica-sim').classList.toggle('selected', val === 'SIM');
            document.getElementById('btn-indica-nao').classList.toggle('selected', val === 'NAO');
            document.getElementById('feedback-nao').classList.toggle('hidden', val !== 'NAO');
        };

        const urlParams = new URLSearchParams(window.location.search);
        const colaborador = urlParams.get('colab');
        
        if(!colaborador) {
            document.getElementById('colab-profile-box').style.display = 'none';
            showModal("Nenhum colaborador foi selecionado. Voltando para a seleção.", true);
        } else {
            document.getElementById('nome-colaborador').innerText = colaborador;
            carregarFotoColaborador(colaborador);
        }

        async function carregarFotoColaborador(nome) {
            const imgElement = document.getElementById('foto-colaborador');
            const fotoFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=random&color=fff`;
            
            try {
                const q = query(collection(db, "colaboradores"), where("nome", "==", nome));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const dados = snapshot.docs[0].data();
                    imgElement.src = dados.fotoUrl ? dados.fotoUrl : fotoFallback;
                } else { imgElement.src = fotoFallback; }
            } catch (e) { imgElement.src = fotoFallback; }
            imgElement.onerror = function() { this.onerror = null; this.src = fotoFallback; }
        }

        let selectedScore = null;
        const buttonsContainer = document.getElementById('nps-buttons');
        const emojis = ['😡', '😠', '😞', '😕', '😐', '🙂', '😊', '😀', '😁', '🤩'];

        for (let i = 1; i <= 10; i++) {
            let btn = document.createElement('button'); btn.className = 'nps-btn'; btn.setAttribute('data-val', i);
            btn.innerHTML = `<span class="emoji">${emojis[i-1]}</span><span class="num">${i}</span>`;
            btn.onclick = () => { document.querySelectorAll('.nps-btn').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); selectedScore = i; };
            buttonsContainer.appendChild(btn);
        }

        document.getElementById('btn-submit').addEventListener('click', async () => {
            if (selectedScore === null) { showModal("Por favor, selecione uma nota de 1 a 10 antes de enviar."); return; }
            
            const feedback = document.getElementById('feedback').value;
            const btn = document.getElementById('btn-submit');
            btn.innerText = 'Enviando...'; btn.disabled = true;

            try {
                await addDoc(collection(db, "avaliacoes"), {
                    colaborador: colaborador, 
                    score: selectedScore, 
                    feedback: feedback, 
                    motivoEscolha: document.getElementById('motivo-escolha').value, 
                    indicaria: selectedIndicacao,
                    feedbackNegativo: document.getElementById('feedback-nao').value,
                    date: new Date().toLocaleDateString('pt-BR'), timestamp: new Date() 
                });
                document.getElementById('survey-container').classList.add('hidden');
                document.getElementById('thank-you').classList.remove('hidden');
            } catch (error) {
                showModal("Ocorreu um erro de conexão. Tente novamente.");
                btn.innerText = 'Enviar Avaliação'; btn.disabled = false;
            }
        });
    