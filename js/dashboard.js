
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
        
        let editandoId = null; 
        let editandoUsuarioId = null;

        window.mostrarAlerta = function(msg, icone = '⚠️') { document.getElementById('alert-icon').innerText = icone; document.getElementById('alert-message').innerText = msg; document.getElementById('custom-alert-modal').classList.remove('hidden'); };
        window.fecharAlerta = () => document.getElementById('custom-alert-modal').classList.add('hidden');

        let confirmCallback = null; 
        window.mostrarConfirmacao = function(msg, callback) { document.getElementById('confirm-message').innerText = msg; confirmCallback = callback; document.getElementById('custom-confirm-modal').classList.remove('hidden'); };
        window.fecharConfirmacao = () => { document.getElementById('custom-confirm-modal').classList.add('hidden'); confirmCallback = null; };
        document.getElementById('btn-confirm-action').addEventListener('click', () => { if (confirmCallback) confirmCallback(); fecharConfirmacao(); });

        // AUTENTICAÇÃO
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
                    
                    if(perfil === 'consultor') {
                        sessionStorage.setItem('leovtech_auth', 'true');
                        sessionStorage.setItem('leovtech_role', 'consultor');
                        window.location.href = 'index.html';
                    } else {
                        concluirLogin(perfil);
                    }
                } else {
                    errorDiv.innerText = "Usuário ou senha incorretos!"; errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.innerText = "Erro de conexão. Verifique a internet."; errorDiv.style.display = 'block';
            }
            btnLogin.innerText = "Entrar no Dashboard"; btnLogin.disabled = false;
        };

        function concluirLogin(perfil) { sessionStorage.setItem('leovtech_auth', 'true'); sessionStorage.setItem('leovtech_role', perfil); iniciarDashboard(); }
        window.logout = function() { sessionStorage.removeItem('leovtech_auth'); sessionStorage.removeItem('leovtech_role'); location.reload(); };

        window.mudarAba = function(aba) {
            ['resultados', 'equipe', 'usuarios'].forEach(id => {
                document.getElementById(`tab-${id}`).classList.remove('active');
                document.getElementById(`secao-${id}`).classList.add('hidden');
            });
            document.getElementById(`tab-${aba}`).classList.add('active');
            document.getElementById(`secao-${aba}`).classList.remove('hidden');

            if(aba === 'resultados') carregarNPS();
            if(aba === 'equipe') carregarEquipe();
            if(aba === 'usuarios') carregarUsuarios();
        };

        if (sessionStorage.getItem('leovtech_auth') === 'true' && sessionStorage.getItem('leovtech_role') === 'gerente') { iniciarDashboard(); }
        else if (sessionStorage.getItem('leovtech_auth') === 'true' && sessionStorage.getItem('leovtech_role') === 'consultor') { window.location.href = "index.html"; }

        function iniciarDashboard() { document.getElementById('login-screen').classList.add('hidden'); document.getElementById('dashboard-content').classList.remove('hidden'); carregarNPS(); }

        // =========================================================
        // ABA 1: LÓGICA DE CARREGAMENTO DO NPS EXPANDIDO
        // =========================================================
        // =========================================================
        // ABA 1: LÓGICA DE CARREGAMENTO DO NPS EXPANDIDO
        // =========================================================
        async function carregarNPS() {
            const grid = document.getElementById('dashboard-grid'); 
            document.getElementById('loading-nps').style.display = 'block';
            grid.innerHTML = '';
            
            try {
                // Ordena por ordem de envio (timestamp)
                const q = query(collection(db, "avaliacoes"), orderBy("timestamp", "asc"));
                const snapshot = await getDocs(q);
                document.getElementById('loading-nps').style.display = 'none';

                if (snapshot.empty) { grid.innerHTML = '<p style="color:#666;">Nenhuma avaliação registrada ainda.</p>'; return; }
                
                const colaboradores = {};
                
                snapshot.forEach(docSnap => {
                    const r = docSnap.data(); 
                    let nome = r.colaborador || "Desconhecido";
                    
                    if (!colaboradores[nome]) colaboradores[nome] = { promoters: 0, passives: 0, detractors: 0, total: 0, feedbacks: [] };
                    
                    let score = parseInt(r.score); 
                    colaboradores[nome].total++;
                    
                    let typeClass = '';
                    if (score >= 9) { colaboradores[nome].promoters++; typeClass = 'promoter'; } 
                    else if (score >= 7) { colaboradores[nome].passives++; typeClass = 'passive'; } 
                    else { colaboradores[nome].detractors++; typeClass = 'detractor'; }
                    
                    // Salva todos os campos do novo formato E O FEEDBACK ORIGINAL
                    colaboradores[nome].feedbacks.push({
                        score: score,
                        feedback: r.feedback || '', // <-- LINHA ADICIONADA: Resgatando a motivação da nota
                        motivoEscolha: r.motivoEscolha || '',
                        indicaria: r.indicaria || '',
                        feedbackNegativo: r.feedbackNegativo || '',
                        class: typeClass,
                        date: r.date || 'Sem data'
                    });
                });

                for (let nome in colaboradores) {
                    let c = colaboradores[nome]; 
                    let nps = Math.round(((c.promoters / c.total) - (c.detractors / c.total)) * 100);
                    let npsColor = nps >= 50 ? '#28a745' : (nps > 0 ? '#ffc107' : '#dc3545');

                    // Mapeamento HTML renderizando todas as respostas
                    let feedbacksHTML = c.feedbacks.reverse().map(f => `
                        <div class="feedback-item" style="border-left-color: ${f.class === 'promoter' ? '#28a745' : (f.class === 'passive' ? '#ffc107' : '#dc3545')}">
                            <div class="feedback-item-header">
                                <span>📅 ${f.date}</span>
                                <span style="background:${f.class === 'promoter' ? '#28a745' : (f.class === 'passive' ? '#ffc107' : '#dc3545')}; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">Nota: ${f.score}</span>
                            </div>
                            
                            <!-- EXIBINDO O FEEDBACK ORIGINAL SE ELE EXISTIR -->
                            ${f.feedback.trim() ? `
                            <div class="feedback-text-block" style="margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 8px;">
                                <strong style="color: #007bff;">Comentário da nota:</strong> <br>
                                ${f.feedback}
                            </div>
                            ` : ''}

                            <div class="feedback-text-block">
                                <strong>Motivo da escolha:</strong> <br>
                                ${f.motivoEscolha.trim() ? f.motivoEscolha : '<span style="color:#aaa; font-style:italic;">Não comentado</span>'}
                            </div>
                            <div style="margin-top: 5px;">
                                <strong>Indicaria a empresa?</strong> 
                                ${f.indicaria === 'SIM' ? '<span style="color:#28a745; font-weight:bold;">👍 SIM</span>' : (f.indicaria === 'NAO' ? '<span style="color:#dc3545; font-weight:bold;">👎 NÃO</span>' : '<span style="color:#aaa; font-style:italic;">Não respondeu</span>')}
                            </div>
                            ${f.indicaria === 'NAO' && f.feedbackNegativo.trim() ? `
                                <div class="feedback-negative-box">
                                    <strong>Motivo da não indicação:</strong><br>
                                    ${f.feedbackNegativo}
                                </div>
                            ` : ''}
                        </div>
                    `).join('');
                    
                    let card = document.createElement('div'); card.className = 'colab-card';
                    card.innerHTML = `
                        <div class="colab-header">
                            <h2>${nome}</h2>
                            <span class="nps-score" style="color: ${npsColor}">${nps}</span>
                        </div>
                        <div class="stats">
                            <span>Votos: <strong>${c.total}</strong></span>
                            <span style="color:#28a745">P: ${c.promoters}</span>
                            <span style="color:#ffc107">N: ${c.passives}</span>
                            <span style="color:#dc3545">D: ${c.detractors}</span>
                        </div>
                        <div class="feedback-list">${feedbacksHTML}</div>
                    `;
                    grid.appendChild(card);
                }
            } catch (error) { 
                console.error(error); 
                document.getElementById('loading-nps').innerHTML = '<span style="color:red">Erro ao carregar os dados.</span>';
            }
        }

        // ABA 2: EQUIPE (Base64)
        async function carregarEquipe() {
            const listContainer = document.getElementById('team-list-container'); listContainer.innerHTML = '';
            try {
                const snapshot = await getDocs(query(collection(db, "colaboradores")));
                if(snapshot.empty) { listContainer.innerHTML = '<p style="color:#666; font-size: 14px;">Nenhum colaborador cadastrado.</p>'; return; }
                snapshot.forEach(docSnap => {
                    const dados = docSnap.data(); const id = docSnap.id;
                    const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(dados.nome)}&background=random&color=fff`;
                    const fotoExibicao = dados.fotoUrl ? dados.fotoUrl : fallbackImg;
                    const nomeSafe = dados.nome.replace(/'/g, "\\'"); const cargoSafe = dados.cargo.replace(/'/g, "\\'");
                    let div = document.createElement('div'); div.className = 'team-item';
                    div.innerHTML = `<div class="team-item-info"><img src="${fotoExibicao}" class="team-item-img"><div class="team-item-text"><strong>${dados.nome}</strong><span>${dados.cargo}</span></div></div><div class="action-btns"><button class="btn-edit" onclick="prepararEdicao('${id}', '${nomeSafe}', '${cargoSafe}')">Editar</button><button class="btn-delete" onclick="excluirColaborador('${id}', '${nomeSafe}')">Excluir</button></div>`;
                    listContainer.appendChild(div);
                });
            } catch (error) { console.error(error); }
        }

        window.prepararEdicao = function(id, nome, cargo) {
            editandoId = id; document.getElementById('colab-nome').value = nome; document.getElementById('colab-cargo').value = cargo;
            document.getElementById('form-titulo').innerText = "Editar Colaborador"; document.getElementById('form-box-container').classList.add('modo-edicao');
            document.getElementById('btn-save-colab').innerText = "Atualizar Colaborador"; document.getElementById('btn-save-colab').classList.add('btn-update'); document.getElementById('btn-cancel-edit').style.display = 'block'; window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        window.cancelarEdicao = function() {
            editandoId = null; document.getElementById('form-add-colab').reset(); document.getElementById('form-titulo').innerText = "Novo Colaborador";
            document.getElementById('form-box-container').classList.remove('modo-edicao'); document.getElementById('btn-save-colab').innerText = "Salvar Colaborador"; document.getElementById('btn-save-colab').classList.remove('btn-update'); document.getElementById('btn-cancel-edit').style.display = 'none';
        };

        function converterParaBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); }

        document.getElementById('form-add-colab').addEventListener('submit', async (e) => {
            e.preventDefault(); const btn = document.getElementById('btn-save-colab'); btn.innerText = "Salvando..."; btn.disabled = true;
            try {
                const fotoFile = document.getElementById('colab-foto').files[0]; let fotoUrlNova = null;
                if (fotoFile) fotoUrlNova = await converterParaBase64(fotoFile);
                const dados = { nome: document.getElementById('colab-nome').value, cargo: document.getElementById('colab-cargo').value, status: "ativo" };
                if (fotoUrlNova) dados.fotoUrl = fotoUrlNova; 
                if (editandoId) { await updateDoc(doc(db, "colaboradores", editandoId), dados); cancelarEdicao(); mostrarAlerta("Colaborador atualizado!", "✅"); } 
                else { await addDoc(collection(db, "colaboradores"), dados); document.getElementById('form-add-colab').reset(); mostrarAlerta("Salvo com sucesso!", "✅"); }
                carregarEquipe(); 
            } catch (error) { mostrarAlerta("Erro ao salvar.", "❌"); }
            btn.disabled = false; btn.innerText = editandoId ? "Atualizar Colaborador" : "Salvar Colaborador";
        });

        window.excluirColaborador = function(id, nome) { mostrarConfirmacao(`Excluir "${nome}"?`, async () => { try { await deleteDoc(doc(db, "colaboradores", id)); if (editandoId === id) cancelarEdicao(); carregarEquipe(); } catch (error) { mostrarAlerta("Erro ao excluir.", "❌"); } }); };

        // ABA 3: ACESSOS
        async function carregarUsuarios() {
            const listContainer = document.getElementById('user-list-container'); listContainer.innerHTML = '';
            try {
                const snapshot = await getDocs(query(collection(db, "usuarios")));
                if(snapshot.empty) { listContainer.innerHTML = '<p style="color:#666;">Nenhum usuário cadastrado.</p>'; return; }
                snapshot.forEach(docSnap => {
                    const dados = docSnap.data(); const id = docSnap.id;
                    const nomeSafe = dados.nome.replace(/'/g, "\\'"); const loginSafe = dados.login.replace(/'/g, "\\'"); const senhaSafe = dados.senha.replace(/'/g, "\\'");
                    const perfil = dados.perfil || 'gerente';
                    const badgeClass = perfil === 'gerente' ? 'badge-gerente' : 'badge-consultor';
                    const badgeText = perfil === 'gerente' ? 'Gerente' : 'Consultor';
                    
                    let div = document.createElement('div'); div.className = 'team-item';
                    div.innerHTML = `<div class="team-item-info"><div style="font-size: 24px; padding: 5px;">👤</div><div class="team-item-text"><strong>${dados.nome} <span class="${badgeClass}">${badgeText}</span></strong><span>Login: ${dados.login}</span></div></div><div class="action-btns"><button class="btn-edit" onclick="prepararEdicaoUsuario('${id}', '${nomeSafe}', '${loginSafe}', '${senhaSafe}', '${perfil}')">Editar</button><button class="btn-delete" onclick="excluirUsuario('${id}', '${nomeSafe}')">Excluir</button></div>`;
                    listContainer.appendChild(div);
                });
            } catch (error) { console.error(error); }
        }

        window.prepararEdicaoUsuario = function(id, nome, login, senha, perfil) {
            editandoUsuarioId = id; document.getElementById('user-nome').value = nome; document.getElementById('user-login').value = login; document.getElementById('user-senha').value = senha; document.getElementById('user-perfil').value = perfil;
            document.getElementById('form-user-titulo').innerText = "Editar Usuário"; document.getElementById('form-user-container').classList.add('modo-edicao'); document.getElementById('btn-save-user').innerText = "Atualizar"; document.getElementById('btn-save-user').classList.add('btn-update'); document.getElementById('btn-cancel-user-edit').style.display = 'block'; window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        window.cancelarEdicaoUsuario = function() {
            editandoUsuarioId = null; document.getElementById('form-add-user').reset(); document.getElementById('form-user-titulo').innerText = "Novo Usuário"; document.getElementById('form-user-container').classList.remove('modo-edicao'); document.getElementById('btn-save-user').innerText = "Salvar Usuário"; document.getElementById('btn-save-user').classList.remove('btn-update'); document.getElementById('btn-cancel-user-edit').style.display = 'none';
        };

        document.getElementById('form-add-user').addEventListener('submit', async (e) => {
            e.preventDefault(); const btn = document.getElementById('btn-save-user'); btn.innerText = "Salvando..."; btn.disabled = true;
            try {
                const dadosUser = { nome: document.getElementById('user-nome').value, login: document.getElementById('user-login').value, senha: document.getElementById('user-senha').value, perfil: document.getElementById('user-perfil').value };
                if (editandoUsuarioId) { await updateDoc(doc(db, "usuarios", editandoUsuarioId), dadosUser); cancelarEdicaoUsuario(); mostrarAlerta("Usuário Atualizado!", "✅"); } 
                else { await addDoc(collection(db, "usuarios"), dadosUser); document.getElementById('form-add-user').reset(); mostrarAlerta("Novo usuário criado!", "✅"); }
                carregarUsuarios(); 
            } catch (error) { mostrarAlerta("Erro ao salvar.", "❌"); }
            btn.disabled = false; btn.innerText = editandoUsuarioId ? "Atualizar Usuário" : "Salvar Usuário";
        });

        window.excluirUsuario = function(id, nome) { mostrarConfirmacao(`Excluir acesso de "${nome}"?`, async () => { try { await deleteDoc(doc(db, "usuarios", id)); if (editandoUsuarioId === id) cancelarEdicaoUsuario(); carregarUsuarios(); } catch (error) { console.error(error); } }); };
    