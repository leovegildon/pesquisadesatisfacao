
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
        import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

    

        window.autenticar = async function() {
            const userIn = document.getElementById('username').value;
            const passIn = document.getElementById('password').value;
            const errorDiv = document.getElementById('error-message');
            const btnLogin = document.getElementById('btn-login');

            btnLogin.innerText = "Verificando..."; btnLogin.disabled = true;

            try {
                const q = query(collection(db, "usuarios"), where("login", "==", userIn), where("senha", "==", passIn));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const dadosUsuario = snapshot.docs[0].data();
                    const perfil = dadosUsuario.perfil || 'gerente';
                    concluirLogin(perfil);
                } else {
                    errorDiv.innerText = "Usuário ou senha incorretos!"; errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.innerText = "Erro de conexão. Verifique a internet."; errorDiv.style.display = 'block';
            }

            btnLogin.innerText = "Acessar Sistema"; btnLogin.disabled = false;
        };

        function concluirLogin(perfil) {
            sessionStorage.setItem('leovtech_auth', 'true');
            sessionStorage.setItem('leovtech_role', perfil);
            iniciarSistema();
        }

        window.logout = function() {
            sessionStorage.removeItem('leovtech_auth');
            sessionStorage.removeItem('leovtech_role');
            location.reload();
        };

        if (sessionStorage.getItem('leovtech_auth') === 'true') {
            iniciarSistema();
        }

        function iniciarSistema() {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            
            // Controle de Acesso: Oculta o botão Dashboard se for Consultor
            if (sessionStorage.getItem('leovtech_role') === 'consultor') {
                document.getElementById('btn-dashboard').style.display = 'none';
            }

            carregarColaboradores();
        }

        async function carregarColaboradores() {
            const grid = document.getElementById('grid-colaboradores');
            try {
                const q = query(collection(db, "colaboradores"), where("status", "==", "ativo"));
                const querySnapshot = await getDocs(q);

                grid.innerHTML = ''; 
                if (querySnapshot.empty) { grid.innerHTML = '<p style="color: #666; width: 100%; text-align: center;">Nenhum colaborador ativo encontrado.</p>'; return; }

                querySnapshot.forEach((doc) => {
                    const dados = doc.data(); const nome = dados.nome || 'Desconhecido'; const cargo = dados.cargo || '';
                    const fotoFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=random&color=fff`;
                    const fotoUrl = dados.fotoUrl || fotoFallback;

                    const card = document.createElement('a');
                    card.href = `pesquisa.html?colab=${encodeURIComponent(nome)}`;
                    card.className = 'colaborador-card';
                    card.innerHTML = `<img src="${fotoUrl}" class="foto" onerror="this.src='${fotoFallback}'"><div class="nome">${nome}</div><div class="cargo">${cargo}</div>`;
                    grid.appendChild(card);
                });
            } catch (error) { grid.innerHTML = '<p style="color: red; width: 100%; text-align: center;">Erro de conexão.</p>'; }
        }
    