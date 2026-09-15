// --- PERSISTÊNCIA & UTILITÁRIOS ---
const db = {
    get: (key, def = []) => JSON.parse(localStorage.getItem(key)) || def,
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

let clientesSalvos = db.get("clientes");
let tiposServicosBrutos = db.get("tiposServicos");
let tiposServicos = tiposServicosBrutos.map(s => typeof s === 'string' ? { nome: s, valorPadrao: 0 } : s);
let agendamentos = db.get("agendamentos");

const TEXTO_PADRAO_EMPRESA = "Clique aqui para o Nome da Empresa";
const getEl = (id) => document.getElementById(id);
const fmtMoeda = (val) => `R$ ${(parseFloat(val) || 0).toFixed(2)}`;
const fmtDataBR = (str) => str ? str.split('-').reverse().join('/') : '-';

// --- SANFONA & NOME EMPRESA ---
function toggleSecao(secaoId, iconId) {
    const secao = getEl(secaoId), icone = getEl(iconId);
    if (!secao || !icone) return;
    const aberto = secao.classList.contains("aberto");
    secao.className = `conteudo-retratil ${aberto ? 'fechado' : 'aberto'}`;
    icone.innerText = aberto ? "▼" : "▲";
}

const nomeEmpresaElem = getEl("nomeEmpresa");
if (nomeEmpresaElem) {
    nomeEmpresaElem.innerText = localStorage.getItem("nomeEmpresa") || TEXTO_PADRAO_EMPRESA;
    nomeEmpresaElem.addEventListener("focus", function() {
        if (this.innerText.trim() === TEXTO_PADRAO_EMPRESA) this.innerText = "";
    });
    nomeEmpresaElem.addEventListener("blur", function() {
        const val = this.innerText.trim();
        this.innerText = val || TEXTO_PADRAO_EMPRESA;
        if (val) localStorage.setItem("nomeEmpresa", val); else localStorage.removeItem("nomeEmpresa");
    });
}

function preencherDataHoraAtuais() {
    const agora = new Date();
    if (getEl("dataAgendamento")) getEl("dataAgendamento").value = agora.toISOString().split('T')[0];
    if (getEl("horaAgendamento")) getEl("horaAgendamento").value = agora.toTimeString().slice(0, 5);
}

// --- TIPOS DE SERVIÇOS ---
function cadastrarNovoTipoServico() {
    const inputNome = getEl("novoTipoServicoInput");
    const inputValor = getEl("novoTipoServicoValor");
    const nome = inputNome?.value.trim();
    const valorPadrao = parseFloat(inputValor?.value) || 0;

    if (!nome) return alert("Digite o nome do serviço.");
    if (tiposServicos.some(s => s.nome.toLowerCase() === nome.toLowerCase())) return alert("Serviço já cadastrado.");

    tiposServicos.push({ nome, valorPadrao });
    db.set("tiposServicos", tiposServicos);
    inputNome.value = "";
    if (inputValor) inputValor.value = "";
    renderizarFormularioServicos();
    renderizarTiposServicosUI();
}

function renderizarFormularioServicos(container = getEl("containerSelecaoServicos"), selecionados = []) {
    if (!container) return;
    if (!tiposServicos.length) return container.innerHTML = "<p style='color:#888; font-size:0.8rem;'>Nenhum serviço cadastrado.</p>";

    const hoje = new Date().toISOString().split('T')[0];
    container.innerHTML = tiposServicos.map((servicoObj, i) => {
        const jaExiste = selecionados.find(s => s.nome === servicoObj.nome);
        const chk = jaExiste ? "checked" : "";
        const valorAExibir = jaExiste ? jaExiste.valor : servicoObj.valorPadrao;

        return `
            <div class="item-servico-checkbox">
                <div class="item-servico-header">
                    <input type="checkbox" class="chk-servico" id="chk_${container.id}_${i}" data-nome="${servicoObj.nome}" ${chk} onchange="this.closest('.item-servico-checkbox').querySelector('.datas-servico-box').style.display = this.checked ? 'flex' : 'none'">
                    <label for="chk_${container.id}_${i}">${servicoObj.nome}</label>
                </div>
                <div class="datas-servico-box" style="display: ${chk ? 'flex' : 'none'};">
                    <div><label>Valor (R$):</label><input type="number" class="val-servico" step="0.50" placeholder="0.00" value="${valorAExibir !== undefined ? valorAExibir : ''}"></div>
                    <div><label>Início:</label><input type="date" class="dt-inicio" value="${jaExiste?.dataInicio || hoje}"></div>
                    <div><label>Vencimento:</label><input type="date" class="dt-vencimento" value="${jaExiste?.dataVencimento || ''}"></div>
                    <div><label>Hora Entrega:</label><input type="time" class="hr-entrega" value="${jaExiste?.horaEntrega || ''}"></div>
                </div>
            </div>`;
    }).join('');
}

function renderizarTiposServicosUI() {
    const lista = getEl("listaTiposServicosCadastrados");
    if (!lista) return;
    if (getEl("totalTiposServicosBadge")) getEl("totalTiposServicosBadge").innerText = tiposServicos.length;
    if (!tiposServicos.length) return lista.innerHTML = "<p style='color:#888; font-size:0.85rem;'>Nenhum tipo de serviço cadastrado.</p>";

    lista.innerHTML = tiposServicos.map((s, i) => `
        <div class="item-servico-cadastrado">
            <span><strong>${s.nome}</strong> (${fmtMoeda(s.valorPadrao)})</span>
            <div>
                <button class="btn-editar-servico" onclick="editarTipoServico(${i})">Editar</button>
                <button class="btn-apagar-cliente" onclick="excluirTipoServico(${i})">Excluir</button>
            </div>
        </div>`).join('');
}

function editarTipoServico(i) {
    const antigo = tiposServicos[i];
    const novoNome = prompt("Edite o nome do Tipo de Serviço:", antigo.nome)?.trim();
    if (novoNome) {
        const novoValorStr = prompt("Edite o valor padrão do serviço (R$):", antigo.valorPadrao);
        const novoValor = parseFloat(novoValorStr) || 0;

        tiposServicos[i] = { nome: novoNome, valorPadrao: novoValor };
        agendamentos.forEach(a => a.servicos?.forEach(s => { if (s.nome === antigo.nome) s.nome = novoNome; }));
        
        db.set("tiposServicos", tiposServicos);
        db.set("agendamentos", agendamentos);
        renderizarFormularioServicos();
        renderizarTiposServicosUI();
        renderizarAgenda();
        renderizarHistorico();
    }
}

function excluirTipoServico(i) {
    if (confirm(`Deseja excluir "${tiposServicos[i].nome}"?`)) {
        tiposServicos.splice(i, 1);
        db.set("tiposServicos", tiposServicos);
        renderizarFormularioServicos();
        renderizarTiposServicosUI();
    }
}

// --- CLIENTES ---
function atualizarClientesUI() {
    const dlist = getEl("listaClientes"), listCad = getEl("listaClientesCadastrados");
    if (!dlist || !listCad) return;
    if (getEl("totalClientesBadge")) getEl("totalClientesBadge").innerText = clientesSalvos.length;

    dlist.innerHTML = clientesSalvos.map(c => `<option value="${c.nome}">`).join('');
    listCad.innerHTML = clientesSalvos.length ? clientesSalvos.map((c, i) => `
        <div class="item-cliente-salvo">
            <span><strong>${c.nome}</strong> (${c.telefone || "NADA"})</span>
            <button class="btn-apagar-cliente" onclick="apagarCliente(${i})">Apagar</button>
        </div>`).join('') : "<p style='color:#888; font-size:0.85rem;'>Nenhum cliente salvo.</p>";
}

function apagarCliente(i) {
    if (confirm(`Deseja apagar ${clientesSalvos[i].nome}?`)) {
        clientesSalvos.splice(i, 1);
        db.set("clientes", clientesSalvos);
        atualizarClientesUI();
    }
}

getEl("nomeCliente")?.addEventListener("input", function() {
    const enc = clientesSalvos.find(c => c.nome.toLowerCase() === this.value.toLowerCase());
    if (enc && getEl("tel1")) getEl("tel1").value = enc.telefone || "";
});

// --- SUBMIT E RENDERIZAÇÃO DE AGENDAMENTOS ---
function obterServicosDoContainer(container) {
    let servicosContratados = [], valorTotalCalculado = 0;
    container?.querySelectorAll('.item-servico-checkbox').forEach(item => {
        const chk = item.querySelector('.chk-servico');
        if (chk?.checked) {
            const val = parseFloat(item.querySelector('.val-servico').value) || 0;
            servicosContratados.push({
                nome: chk.getAttribute('data-nome'),
                valor: val,
                dataInicio: item.querySelector('.dt-inicio').value,
                dataVencimento: item.querySelector('.dt-vencimento').value,
                horaEntrega: item.querySelector('.hr-entrega').value
            });
            valorTotalCalculado += val;
        }
    });
    return { servicosContratados, valorTotalCalculado };
}

getEl("formAgendamento")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const nome = getEl("nomeCliente").value.trim(), tel = getEl("tel1").value.trim();
    const cIdx = clientesSalvos.findIndex(c => c.nome.toLowerCase() === nome.toLowerCase());

    if (cIdx === -1) clientesSalvos.push({ nome, telefone: tel });
    else if (tel) clientesSalvos[cIdx].telefone = tel;
    db.set("clientes", clientesSalvos);
    atualizarClientesUI();

    const { servicosContratados, valorTotalCalculado } = obterServicosDoContainer(getEl("containerSelecaoServicos"));
    if (!servicosContratados.length) return alert("Selecione pelo menos 1 serviço.");

    const dt = getEl("dataAgendamento").value, hr = getEl("horaAgendamento").value;
    agendamentos.push({
        id: Date.now(), cliente: nome, telefone: tel, servicos: servicosContratados,
        valor: valorTotalCalculado, horario: `${dt}T${hr}`, formaPagamento: "", status: "agendado"
    });
    db.set("agendamentos", agendamentos);

    alert(`✅ Agendamento Confirmado!\n\nCliente: ${nome}\nData: ${fmtDataBR(dt)} às ${hr}\nValor: ${fmtMoeda(valorTotalCalculado)}`);
    this.reset();
    preencherDataHoraAtuais();
    renderizarFormularioServicos();
    renderizarAgenda();
    renderizarHistorico();
});

function verificarUrgenciaData(item) {
    if (item.status === "concluido") return false;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje); limite.setDate(limite.getDate() + 2);

    const check = (dStr) => {
        if (!dStr) return false;
        const partes = dStr.split('-');
        if (partes.length !== 3) return false;
        const dObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        return dObj >= hoje && dObj <= limite;
    };

    return check(item.horario?.split('T')[0]) || item.servicos?.some(s => check(s.dataVencimento));
}

function renderizarAgenda() {
    const listHoje = getEl("listaAgendamentosHoje"), listFut = getEl("listaAgendamentosFuturos");
    if (!listHoje || !listFut) return;

    listHoje.innerHTML = ""; listFut.innerHTML = "";
    let ganhoHoje = 0, atendidosHoje = 0, qtdFuturos = 0, dataUltGrupo = "";

    const agora = new Date(), ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const dtHoje = agora.toISOString().split('T')[0];
    const dtOntem = ontem.toISOString().split('T')[0];

    const contagem = {};
    agendamentos.forEach(a => { if (a.status === "agendado" && a.horario) contagem[a.horario] = (contagem[a.horario] || 0) + 1; });
    agendamentos.sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

    agendamentos.forEach(item => {
        if (!item.horario) return;
        const dtItem = item.horario.replace(' ', 'T').split('T')[0];

        if (dtItem === dtHoje && item.status === "concluido") {
            ganhoHoje += (parseFloat(item.valor) || 0);
            atendidosHoje++;
        }

        const conflito = contagem[item.horario] > 1 && item.status === "agendado";
        const urgente = verificarUrgenciaData(item);
        const card = criarCardAgendamento(item, conflito, urgente);

        if (dtItem === dtHoje || (dtItem === dtOntem && item.status === "agendado")) {
            listHoje.appendChild(card);
        } else if (dtItem > dtHoje) {
            qtdFuturos++;
            if (dtItem !== dataUltGrupo) {
                dataUltGrupo = dtItem;
                const divGrupo = document.createElement("div");
                divGrupo.className = "grupo-data-titulo";
                divGrupo.innerText = `📅 Agendamentos para ${fmtDataBR(dtItem)}`;
                listFut.appendChild(divGrupo);
            }
            listFut.appendChild(card);
        }
    });

    if (getEl("totalFuturosBadge")) getEl("totalFuturosBadge").innerText = qtdFuturos;
    if (!listHoje.children.length) listHoje.innerHTML = "<p style='text-align:center; color:#888; padding:15px;'>Nenhum agendamento para hoje.</p>";
    if (!qtdFuturos) listFut.innerHTML = "<p style='text-align:center; color:#888; padding:15px;'>Nenhum agendamento futuro registrado.</p>";

    if (getEl("faturamentoDia")) getEl("faturamentoDia").innerText = fmtMoeda(ganhoHoje);
    if (getEl("totalAtendidos")) getEl("totalAtendidos").innerText = atendidosHoje;
}

function criarCardAgendamento(item, conflito, urgente) {
    const div = document.createElement("div");
    div.className = `item-agenda ${item.status === 'concluido' ? 'concluido' : ''} ${conflito ? 'conflito' : ''} ${(urgente && item.status === 'agendado') ? 'alerta-proximo' : ''}`.trim();

    const [dt, hr] = item.horario ? item.horario.replace(' ', 'T').split('T') : ["", ""];
    const servsHtml = item.servicos?.length ? item.servicos.map(s => 
        `• <strong>${s.nome}</strong> (${fmtMoeda(s.valor)})<br><small style="color:#666;">Início: ${fmtDataBR(s.dataInicio)} | Vencimento: ${fmtDataBR(s.dataVencimento)} ${s.horaEntrega ? 'às ' + s.horaEntrega : ''}</small>`
    ).join('<br>') : "Nenhum serviço detalhado";

    div.innerHTML = `
        ${(urgente && item.status === 'agendado') ? '<span class="tag-urgente">⏰ Entrega Próxima</span><br>' : ''}
        <div class="item-agenda-topo">
            <h3>${item.cliente}</h3>
            <select class="select-pagamento-card" onchange="alterarFormaPagamento(${item.id}, this.value)">
                <option value="" ${!item.formaPagamento ? 'selected' : ''}>-- Forma de Pagamento --</option>
                ${['Pix', 'Dinheiro', 'Crédito', 'Débito'].map(p => `<option value="${p}" ${item.formaPagamento === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
        </div>
        <p><strong>Data/Hora:</strong> ${fmtDataBR(dt)} às ${hr || ''}</p>
        <p><strong>Telefone:</strong> ${item.telefone || "NADA"}</p>
        <div class="detalhe-servicos-card">${servsHtml}</div>
        <p><strong>Valor Total:</strong> ${fmtMoeda(item.valor)}</p>
        ${conflito ? '<p class="alerta-conflito">⚠️ ATENÇÃO: CONFLITO DE HORÁRIO!</p>' : ''}
        <div class="acoes-card">
            ${item.telefone ? `<a class="btn-acao btn-zap" href="https://wa.me/55${item.telefone.replace(/\D/g,'')}" target="_blank">WhatsApp</a>` : ''}
            <button class="btn-acao btn-editar" onclick="abrirModalEdicao(${item.id})">✏️ Editar</button>
            ${item.status === "agendado" ? `<button class="btn-acao btn-concluir" onclick="concluirServico(${item.id})">Marcar Pago</button><button class="btn-acao btn-cancelar" onclick="cancelarServico(${item.id})">Cancelar</button>` : '<span style="color:#27ae60; font-weight:bold;">✅ Concluído</span>'}
        </div>`;
    return div;
}

function alterarFormaPagamento(id, val) {
    const item = agendamentos.find(a => a.id === id);
    if (item) { item.formaPagamento = val; db.set("agendamentos", agendamentos); renderizarHistorico(); }
}

function concluirServico(id) {
    const item = agendamentos.find(a => a.id === id);
    if (item) { item.status = "concluido"; db.set("agendamentos", agendamentos); renderizarAgenda(); renderizarHistorico(); }
}

function cancelarServico(id) {
    if (confirm("Deseja realmente cancelar este agendamento?")) {
        agendamentos = agendamentos.filter(a => a.id !== id);
        db.set("agendamentos", agendamentos);
        renderizarAgenda(); renderizarHistorico();
    }
}

// --- MODAL DE EDIÇÃO ---
function abrirModalEdicao(id) {
    const item = agendamentos.find(a => a.id === id);
    if (!item) return;

    getEl("editId").value = item.id;
    getEl("editCliente").value = item.cliente;
    getEl("editTelefone").value = item.telefone || "";

    const [dt, hr] = item.horario ? item.horario.replace(' ', 'T').split('T') : ["", ""];
    getEl("editData").value = dt || "";
    getEl("editHora").value = hr || "";

    renderizarFormularioServicos(getEl("containerEditServicos"), item.servicos || []);
    getEl("modalEdicao").classList.add("aberto");
}

function fecharModal() { getEl("modalEdicao").classList.remove("aberto"); }

getEl("formEdicao")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const id = parseInt(getEl("editId").value);
    const item = agendamentos.find(a => a.id === id);

    if (item) {
        const { servicosContratados, valorTotalCalculado } = obterServicosDoContainer(getEl("containerEditServicos"));
        if (!servicosContratados.length) return alert("Selecione pelo menos 1 serviço.");

        item.cliente = getEl("editCliente").value.trim();
        item.telefone = getEl("editTelefone").value.trim();
        item.servicos = servicosContratados;
        item.valor = valorTotalCalculado;
        item.horario = `${getEl("editData").value}T${getEl("editHora").value}`;

        db.set("agendamentos", agendamentos);
        renderizarAgenda(); renderizarHistorico(); fecharModal();
    }
});

// --- HISTÓRICO ---
function inicializarFiltros() {
    const fAno = getEl("filtroAno");
    if (!fAno) return;
    const anoAtual = new Date().getFullYear();
    fAno.innerHTML = Array.from({length: 6}, (_, i) => anoAtual - 2 + i)
        .map(a => `<option value="${a}" ${a === anoAtual ? 'selected' : ''}>${a}</option>`).join('');
}

function renderizarHistorico() {
    const painel = getEl("painelHistorico"), fAno = getEl("filtroAno"), fMes = getEl("filtroMes");
    if (!painel || !fAno || !fMes) return;

    const anoSel = parseInt(fAno.value), mesSel = fMes.value;
    const filtrados = agendamentos.filter(a => {
        if (!a.horario) return false;
        const [ano, mes] = a.horario.replace(' ', 'T').split('T')[0].split('-');
        return parseInt(ano) === anoSel && (mesSel === "todos" || (parseInt(mes) - 1) === parseInt(mesSel));
    });

    let total = 0, qtd = 0;
    const soma = { Pix: 0, Dinheiro: 0, Crédito: 0, Débito: 0 };

    painel.innerHTML = filtrados.length ? filtrados.map(item => {
        const val = parseFloat(item.valor) || 0;
        if (item.status === "concluido") {
            total += val; 
            qtd++;
            if (soma[item.formaPagamento] !== undefined) {
                soma[item.formaPagamento] += val;
            }
        }
        const [dt, hr] = item.horario.replace(' ', 'T').split('T');
        const listaServicosDet = item.servicos?.map(s => `${s.nome} (${fmtMoeda(s.valor)})`).join(', ') || 'Nenhum';

        return `
            <div class="item-historico">
                <strong>${fmtDataBR(dt)} às ${hr || ''}</strong><br>
                <strong>Cliente:</strong> ${item.cliente} | <strong>Total:</strong> ${fmtMoeda(val)}<br>
                <small><strong>Serviços:</strong> ${listaServicosDet}</small><br>
                <small><strong>Status:</strong> ${item.status === 'concluido' ? `✅ Pago (${item.formaPagamento || 'Forma não informada'})` : '📅 Agendado / Pendente'}</small>
            </div>`;
    }).join('') : "<p style='color:#888; font-size:0.85rem;'>Nenhum registro encontrado para este período.</p>";

    if (getEl("historicoQtdAtendidos")) getEl("historicoQtdAtendidos").innerText = qtd;
    if (getEl("historicoTotalGanho")) getEl("historicoTotalGanho").innerText = fmtMoeda(total);
    
    if (getEl("subtotalPix")) getEl("subtotalPix").innerText = fmtMoeda(soma["Pix"]);
    if (getEl("subtotalDinheiro")) getEl("subtotalDinheiro").innerText = fmtMoeda(soma["Dinheiro"]);
    if (getEl("subtotalCredito")) getEl("subtotalCredito").innerText = fmtMoeda(soma["Crédito"]);
    if (getEl("subtotalDebito")) getEl("subtotalDebito").innerText = fmtMoeda(soma["Débito"]);
}

getEl("filtroAno")?.addEventListener("change", renderizarHistorico);
getEl("filtroMes")?.addEventListener("change", renderizarHistorico);

// --- BACKUP ---
function exportarBackup() {
    const dados = { 
        nomeEmpresa: localStorage.getItem("nomeEmpresa") || "", 
        clientes: clientesSalvos, 
        tiposServicos, 
        agendamentos 
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `backup_agendamentos_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function importarBackup(e) {
    const arq = e.target.files[0];
    if (!arq) return;
    const r = new FileReader();
    r.onload = function(evt) {
        try {
            const c = JSON.parse(evt.target.result);
            if (c.clientes && c.agendamentos && confirm("⚠️ Isso substituirá os dados atuais. Continuar?")) {
                clientesSalvos = c.clientes || []; 
                agendamentos = c.agendamentos || []; 
                tiposServicos = (c.tiposServicos || []).map(s => typeof s === 'string' ? { nome: s, valorPadrao: 0 } : s);

                db.set("clientes", clientesSalvos); 
                db.set("agendamentos", agendamentos); 
                db.set("tiposServicos", tiposServicos);

                const nomeEmp = c.nomeEmpresa || c.empresa || "";
                if (nomeEmp) {
                    localStorage.setItem("nomeEmpresa", nomeEmp);
                    if (nomeEmpresaElem) nomeEmpresaElem.innerText = nomeEmp;
                }

                atualizarClientesUI(); 
                renderizarFormularioServicos(); 
                renderizarTiposServicosUI(); 
                renderizarAgenda(); 
                renderizarHistorico();
                alert("✅ Backup restaurado com sucesso!");
            }
        } catch (err) { alert("❌ Erro ao ler backup."); }
    };
    r.readAsText(arq); e.target.value = "";
}

// --- INICIALIZAÇÃO ---
preencherDataHoraAtuais();
atualizarClientesUI();
renderizarFormularioServicos();
renderizarTiposServicosUI();
inicializarFiltros();
renderizarAgenda();
renderizarHistorico();