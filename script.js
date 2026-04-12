const API_URL = 'https://script.google.com/macros/s/AKfycbxbAg6XJHHksVwktBFq3VeWgPpeIjv7j82spT4ap2VhMW-s68BFIY8oRp0R61quycBJsg/exec';

let rawProposals = []; 
let rawMacros = []; 
let rawSuperMacros = [];
let selectedIds = new Set();
let searchQuery = ''; 
let temporarySugerido = ""; 
let currentPhase = 1; // 1 = Propostas -> Macro | 2 = Macro -> Super Macro

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    if(tabId === 'tab-macros') renderTree();
    if(tabId === 'tab-relatorios') renderRelatorios();
}

function showToast(title, msg, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-msg').innerText = msg;
    document.getElementById('toast-icon').className = type === 'success' ? 'ph-fill ph-check-circle text-brand-verde-wave text-3xl' : 'ph-fill ph-warning-circle text-brand-amarelo text-3xl';
    toast.classList.remove('opacity-0', '-translate-y-32', 'translate-y-24');
    setTimeout(() => {
        toast.classList.add('opacity-0');
        if(window.innerWidth < 768) toast.classList.add('-translate-y-32');
        else toast.classList.add('translate-y-24');
    }, 3500);
}
function renderProposals() {
    const domList = document.getElementById('proposals-list'); 
    domList.innerHTML = '';
    
    let base = currentPhase === 1 ? rawProposals.filter(p => p.status !== 'agglutinated') : rawMacros.filter(m => m.status !== 'super_agglutinated');
    document.getElementById('count-pendentes').textContent = `${base.length} Pendentes`;

    const filtered = base.filter(item => {
        const t = (item.text || item.texto).toLowerCase();
        const id = item.id.toLowerCase();
        const tema = (item.tema || '').toLowerCase();
        const hashtags = (item.hashtags || '').toLowerCase(); // NOVA BUSCA POR HASHTAG
        
        return t.includes(searchQuery.toLowerCase()) || 
               id.includes(searchQuery.toLowerCase()) || 
               tema.includes(searchQuery.toLowerCase()) ||
               hashtags.includes(searchQuery.toLowerCase());
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach(item => {
        const isSelected = selectedIds.has(item.id);
        const card = document.createElement('div');
        
        let classes = 'bg-white border-[1.5px] rounded-brand p-4 relative flex flex-col gap-2 shadow-sm cursor-pointer transition-all ';
        if(currentPhase === 1) {
            classes += isSelected ? 'border-brand-azul-sus bg-brand-azul-claro/10 !shadow-hover ring-2 ring-brand-azul-sus/20' : 'border-brand-cinza-borda hover:border-brand-azul-sus';
        } else {
            classes += isSelected ? 'border-[#3AAA35] bg-[#E8F8EC] !shadow-hover ring-2 ring-[#3AAA35]/20' : 'border-brand-cinza-borda hover:border-[#3AAA35]';
        }
        card.className = classes; 
        card.onclick = () => toggleSelection(item.id);

        if(currentPhase === 1) {
            card.innerHTML = `
                ${isSelected ? '<div class="absolute top-0 left-0 right-0 h-[4px] bg-brand-azul-sus rounded-t-brand"></div>' : ''}
                <div class="flex items-start gap-3 mt-1">
                    <div class="w-5 h-5 rounded border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-brand-azul-sus bg-brand-azul-sus text-white' : 'border-brand-cinza-medio'}">
                        ${isSelected ? '<i class="ph-bold ph-check text-xs"></i>' : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2 flex-wrap">
                            <span class="bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-extrabold font-mono px-2 py-[2px] rounded-brand-sm">${item.id}</span>
                            <span class="bg-[#E8F4FD] text-brand-azul-sus text-[9px] font-extrabold uppercase px-2 py-[2px] rounded-brand-pill truncate">${item.eixo}</span>
                            <span class="bg-brand-cinza-off text-brand-cinza-medio border border-brand-cinza-borda text-[9px] font-extrabold uppercase px-2 py-[2px] rounded-brand-pill truncate">${item.tema}</span>
                        </div>
                        <p class="text-sm font-medium text-brand-cinza-texto leading-snug">${item.text}</p>
                    </div>
                </div>`;
        } else {
            // PROCESSA AS HASHTAGS SE EXISTIREM
            let tagsHtml = '';
            if (item.hashtags) {
                const tags = item.hashtags.split(',').map(t => t.trim()).filter(Boolean);
                tagsHtml = tags.map(t => `<span class="text-[9px] font-bold text-brand-azul-medio uppercase px-1.5 py-[2px] bg-[#E8F4FD] rounded-brand-pill truncate border border-brand-azul-claro/30">${t.startsWith('#') ? t : '#'+t}</span>`).join('');
            }

            card.innerHTML = `
                ${isSelected ? '<div class="absolute top-0 left-0 right-0 h-[4px] bg-[#3AAA35] rounded-t-brand"></div>' : ''}
                <div class="flex items-start gap-3 mt-1">
                    <div class="w-5 h-5 rounded border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-[#3AAA35] bg-[#3AAA35] text-white' : 'border-brand-cinza-medio'}">
                        ${isSelected ? '<i class="ph-bold ph-check text-xs"></i>' : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2 flex-wrap">
                            <span class="bg-[#E8F8EC] border border-[#5BBF6A]/50 text-[#1B7A30] text-[10px] font-extrabold uppercase tracking-widest px-2 py-[2px] rounded-brand-sm"><i class="ph-bold ph-stack mr-1"></i> ${item.id}</span>
                            <span class="bg-brand-cinza-off text-brand-cinza-texto border border-brand-cinza-borda text-[9px] font-extrabold uppercase px-2 py-[2px] rounded-brand-pill truncate">${item.abrangencia}</span>
                            
                            <span class="bg-[#FEF8E7] text-[#9A6500] border border-[#F5C800]/50 text-[9px] font-extrabold uppercase px-2 py-[2px] rounded-brand-pill truncate">${item.tema}</span>
                            
                            <span class="text-[9px] font-bold text-brand-cinza-medio uppercase px-1 py-[2px] truncate">${item.origens.length} Propostas Aglutinadas</span>
                        </div>
                        <p class="text-sm font-medium text-brand-cinza-texto leading-snug mb-2">${item.texto}</p>
                        
                        ${tagsHtml ? `<div class="flex flex-wrap gap-1.5 mt-2">${tagsHtml}</div>` : ''}
                    </div>
                </div>`;
        }
        fragment.appendChild(card);
    });
    domList.appendChild(fragment);
}
// ==========================================
// MUDANÇA DE CONTEXTO (FASE 1 <-> FASE 2)
// ==========================================
function setPhase(phase) {
    currentPhase = phase;
    selectedIds.clear();
    document.getElementById('macro-textarea').value = '';
    
    const btn1 = document.getElementById('btn-fase-1');
    const btn2 = document.getElementById('btn-fase-2');
    
    if(phase === 1) {
        btn1.className = "flex-1 py-1.5 text-[10px] md:text-xs font-extrabold uppercase tracking-widest rounded-brand-pill bg-white text-brand-azul-sus shadow-sm transition-all border border-brand-cinza-borda";
        btn2.className = "flex-1 py-1.5 text-[10px] md:text-xs font-extrabold uppercase tracking-widest rounded-brand-pill text-brand-cinza-medio hover:text-brand-cinza-texto transition-all border border-transparent";
        document.getElementById('badge-context').innerText = "Analisando Brutas";
        document.getElementById('badge-context').className = "bg-brand-azul-sus text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-brand-pill";
        document.getElementById('workspace-title').innerHTML = 'Redação <span class="text-brand-amarelo md:text-brand-azul-sus">Macro</span>';
        document.getElementById('save-btn-text').innerText = "Salvar Macro";
    } else {
        btn2.className = "flex-1 py-1.5 text-[10px] md:text-xs font-extrabold uppercase tracking-widest rounded-brand-pill bg-white text-[#1B7A30] shadow-sm transition-all border border-[#5BBF6A]";
        btn1.className = "flex-1 py-1.5 text-[10px] md:text-xs font-extrabold uppercase tracking-widest rounded-brand-pill text-brand-cinza-medio hover:text-brand-cinza-texto transition-all border border-transparent";
        document.getElementById('badge-context').innerText = "Analisando Macros";
        document.getElementById('badge-context').className = "bg-[#E8F8EC] text-[#1B7A30] border border-[#5BBF6A]/50 text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-brand-pill";
        document.getElementById('workspace-title').innerHTML = 'Redação <span class="text-[#3AAA35]">Super Macro</span>';
        document.getElementById('save-btn-text').innerText = "Salvar Super Macro";
    }
    
    renderProposals();
    updateWorkspace();
}

async function loadData() {
    try {
        const response = await fetch(API_URL + "?t=" + new Date().getTime());
        const result = await response.json();
        if (result.success) {
            rawProposals = result.propostas; 
            rawMacros = result.macros || [];
            rawSuperMacros = result.superMacros || [];
            
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('proposals-list').classList.remove('hidden');
            renderProposals(); renderRelatorios();
        } else showToast('Erro API', result.error, 'error');
    } catch (error) {
        document.getElementById('loading-state').innerHTML = `<i class="ph-fill ph-warning text-4xl text-brand-amarelo mb-2"></i><p class="font-bold text-xs uppercase text-brand-cinza-texto">Offline</p>`;
    }
}

const domTextarea = document.getElementById('macro-textarea');
const domAbrangencia = document.getElementById('abrangencia-select');
const domSaveBtn = document.getElementById('save-btn');
const domBtnIA = document.getElementById('btn-ia');

function toggleSelection(id) {
    const base = currentPhase === 1 ? rawProposals : rawMacros;
    const item = base.find(p => p.id === id);
    
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
        const prefix = currentPhase === 1 ? 'Origem' : 'Macro';
        const info = currentPhase === 1 ? item.tema : item.abrangencia;
        const text = currentPhase === 1 ? item.text : item.texto;
        
        // NOVO: Adiciona Hashtags ao final do texto na prancheta (se for fase 2 e existir hashtag)
        let extra = (currentPhase === 2 && item.hashtags) ? `\nTags: ${item.hashtags}` : '';
        const appendText = `[${prefix} ${id} | ${info}]: ${text}${extra}`;
        
        domTextarea.value = domTextarea.value ? domTextarea.value + `\n\n${appendText}` : appendText;
    }
    if(selectedIds.size === 0) domTextarea.value = '';
    renderProposals(); updateWorkspace();
}

function updateWorkspace() {
    const count = selectedIds.size;
    const indText = document.getElementById('selected-count');
    const indIcon = document.querySelector('.indicator-icon');
    
    document.getElementById('mobile-count').textContent = count;
    const mobileBar = document.getElementById('mobile-action-bar');
    if (count > 0) mobileBar.classList.remove('translate-y-full');
    else mobileBar.classList.add('translate-y-full');

    if (count === 0) {
        indText.textContent = "Nenhuma selecionada";
        indText.parentElement.className = 'bg-white border border-brand-cinza-borda px-4 py-3 rounded-brand-sm flex items-center gap-3 text-sm shadow-sm';
        indIcon.className = 'ph-fill ph-info text-xl indicator-icon text-brand-cinza-medio';
        domTextarea.disabled = domAbrangencia.disabled = domBtnIA.disabled = true;
    } else {
        indText.textContent = `${count} ite${count>1?'ns':'m'} em análise`;
        indText.parentElement.className = currentPhase === 1 ? 
            'bg-[#E8F8EC] border border-[#5BBF6A] text-[#1B7A30] px-4 py-3 rounded-brand-sm flex items-center gap-3 text-sm shadow-sm' : 
            'bg-[#FEF8E7] border border-[#F5C800]/50 text-[#9A6500] px-4 py-3 rounded-brand-sm flex items-center gap-3 text-sm shadow-sm';
        indIcon.className = currentPhase === 1 ? 'ph-fill ph-check-circle text-xl indicator-icon text-[#3AAA35]' : 'ph-fill ph-stack text-xl indicator-icon text-[#9A6500]';
        domTextarea.disabled = domAbrangencia.disabled = domBtnIA.disabled = false;
    }
    validateForm();
}

function validateForm() {
    if (selectedIds.size > 0 && domTextarea.value.trim().length > 5 && domAbrangencia.value !== "") {
        domSaveBtn.disabled = false; 
        domSaveBtn.className = currentPhase === 1 ? 
            "w-full bg-brand-azul-sus hover:bg-brand-azul-wave text-white font-extrabold text-xs uppercase tracking-widest py-3 px-6 rounded-brand-pill shadow-card transition-all flex items-center justify-center gap-2" :
            "w-full bg-[#3AAA35] hover:bg-[#1B7A30] text-white font-extrabold text-xs uppercase tracking-widest py-3 px-6 rounded-brand-pill shadow-card transition-all flex items-center justify-center gap-2";
    } else {
        domSaveBtn.disabled = true; 
        domSaveBtn.className = "w-full bg-brand-cinza-medio text-white font-extrabold text-xs uppercase tracking-widest py-3 px-6 rounded-brand-pill shadow-card transition-all disabled:opacity-50 flex items-center justify-center gap-2";
    }
}

function toggleWorkspace(show) {
    const panel = document.getElementById('workspace-panel');
    if(show) { panel.classList.remove('translate-y-full'); document.body.classList.add('modal-open'); }
    else { panel.classList.add('translate-y-full'); document.body.classList.remove('modal-open'); }
}

// ==========================================
// COMUNICAÇÃO SEGURA COM GROQ VIA BACKEND
// ==========================================
async function callIASecurely(prompt, sysInstruction) {
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ask_ai', prompt: prompt, sysInstruction: sysInstruction }) });
    const result = await response.json();
    if (result.success) return result.result;
    throw new Error(result.error);
}

async function suggestMacroIA() {
    if (selectedIds.size === 0) return;
    domBtnIA.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Analisando...';
    domBtnIA.disabled = true;
    
    let rawTexts = "";
    if (currentPhase === 1) {
        rawTexts = Array.from(selectedIds).map(id => `[Proposta ${id} | Tema: ${rawProposals.find(p => p.id === id).tema}]: ${rawProposals.find(p => p.id === id).text}`).join("\n\n");
    } else {
        rawTexts = Array.from(selectedIds).map(id => `[Macro ${id} | Abrangência: ${rawMacros.find(m => m.id === id).abrangencia}]: ${rawMacros.find(m => m.id === id).texto}`).join("\n\n");
    }
    
    const contextType = currentPhase === 1 ? "propostas brutas originais" : "propostas macro já consolidadas";
    const sys = "Você é um assistente técnico rigoroso de análise do SUS. Retorne EXCLUSIVAMENTE um objeto JSON válido.";
    const prompt = `Analise APENAS as ${contextType} selecionadas abaixo. Só recomende aglutinar se NÃO houver perda de especificidade ou escopo.
RETORNE O JSON NESTE FORMATO EXATO:
{
  "viabilidade": { "nota": <0_a_10>, "classificacao": "<Não recomendada, Duvidosa ou Recomendada>" },
  "justificativa": "<max 3 linhas>",
  "decisao": "<'Aglutinar' ou 'Manter separadas'>",
  "proposta_consolidada": "<Texto final técnico, claro e fiel ou string vazia>",
  "motivo_recusa": "<Motivo da recusa ou string vazia>"
}

ITENS PARA ANÁLISE:
${rawTexts}`;

    try {
        const rawResponse = await callIASecurely(prompt, sys);
        const jsonTextClean = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const aiResult = JSON.parse(jsonTextClean);
        renderAIModal(aiResult);
    } catch(e) {
        showToast('Erro na IA', 'A IA falhou em processar sua solicitação.', 'error');
    } finally {
        domBtnIA.innerHTML = '<i class="ph-fill ph-sparkle"></i> Analisar com IA'; domBtnIA.disabled = false;
    }
}

function renderAIModal(data) {
    const modal = document.getElementById('ai-result-modal');
    const circle = document.getElementById('ai-nota-circle');
    const classif = document.getElementById('ai-classificacao');
    const decisao = document.getElementById('ai-decisao');
    const just = document.getElementById('ai-justificativa');
    const propBox = document.getElementById('ai-proposta-box');
    const propText = document.getElementById('ai-texto-sugerido');
    const btnApp = document.getElementById('btn-aplicar-ia');

    circle.className = 'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold text-white shrink-0 shadow-inner';
    decisao.className = 'text-xl font-extrabold';

    const n = data.viabilidade.nota;
    circle.textContent = n; classif.textContent = data.viabilidade.classificacao;
    if (n <= 3) { circle.classList.add('bg-red-500'); decisao.classList.add('text-red-500'); } 
    else if (n <= 6) { circle.classList.add('bg-[#F5C800]'); decisao.classList.add('text-[#9A6500]'); } 
    else { circle.classList.add('bg-[#3AAA35]'); decisao.classList.add('text-[#1B7A30]'); }

    decisao.textContent = data.decisao;
    if (data.decisao.toLowerCase() === 'aglutinar') {
        just.textContent = data.justificativa;
        propBox.classList.replace('hidden', 'flex');
        propText.textContent = data.proposta_consolidada;
        temporarySugerido = data.proposta_consolidada;
        btnApp.classList.replace('hidden', 'flex');
    } else {
        just.innerHTML = `<strong>Aviso:</strong> ${data.motivo_recusa || data.justificativa}`;
        propBox.classList.replace('flex', 'hidden'); btnApp.classList.replace('flex', 'hidden');
    }
    modal.classList.replace('hidden', 'flex');
}

function closeAIModal() { document.getElementById('ai-result-modal').classList.replace('flex', 'hidden'); temporarySugerido = ""; }
function aplicarTextoIA() {
    if(temporarySugerido) {
        domTextarea.value = temporarySugerido; validateForm(); closeAIModal(); showToast('Texto Aplicado', 'A proposta foi enviada para o editor.');
    }
}

// ==========================================
// SALVAR E DELETAR (N-TIER)
// ==========================================
async function handleSave() {
    const act = currentPhase === 1 ? 'create' : 'create_super_macro';
    const payload = { action: act, macroText: domTextarea.value, abrangencia: domAbrangencia.value, originIds: Array.from(selectedIds) };
    
    domSaveBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i> Salvando...'; domSaveBtn.disabled = true;

    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.success) {
            showToast('Salvo!', `Consolidação ${currentPhase === 1 ? 'Macro' : 'Super Macro'} realizada.`);
            
            if(currentPhase === 1) {
                rawMacros.push({ id: result.macroId, texto: payload.macroText, abrangencia: payload.abrangencia, origens: payload.originIds, status: 'pending', idSuperMacro: null });
                rawProposals.forEach(p => { if (selectedIds.has(p.id)) p.status = 'agglutinated'; });
            } else {
                rawSuperMacros.push({ id: result.superMacroId, texto: payload.macroText, abrangencia: payload.abrangencia, origens: payload.originIds });
                rawMacros.forEach(m => { if (selectedIds.has(m.id)) m.status = 'super_agglutinated'; });
            }
            
            selectedIds.clear(); domTextarea.value = ''; domAbrangencia.value = '';
            toggleWorkspace(false); updateWorkspace(); renderProposals(); renderRelatorios();
        } else throw new Error(result.error);
    } catch(e) { showToast('Erro', e.message, 'error'); } 
    finally { 
        domSaveBtn.innerHTML = currentPhase === 1 ? '<i class="ph-bold ph-floppy-disk text-lg"></i> <span id="save-btn-text">Salvar Macro</span>' : '<i class="ph-bold ph-floppy-disk text-lg"></i> <span id="save-btn-text">Salvar Super Macro</span>'; 
        validateForm(); 
    }
}

async function handleDeleteAction(id, type) {
    if(!confirm(`Tem certeza que deseja desfazer esta ${type === 'super' ? 'Super Macro' : 'Macro'}?`)) return;
    const act = type === 'super' ? 'delete_super_macro' : 'delete';
    const key = type === 'super' ? 'superMacroId' : 'macroId';
    
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: act, [key]: id }) });
        const result = await response.json();
        if(result.success) {
            showToast('Desfeita', 'Restaurado com sucesso.');
            
            if(type === 'super') {
                const idx = rawSuperMacros.findIndex(sm => sm.id === id);
                if(idx > -1) {
                    const origens = rawSuperMacros[idx].origens;
                    rawMacros.forEach(m => { if (origens.includes(m.id)) m.status = 'pending'; });
                    rawSuperMacros.splice(idx, 1);
                }
            } else {
                const idx = rawMacros.findIndex(m => m.id === id);
                if(idx > -1) {
                    const origens = rawMacros[idx].origens;
                    rawProposals.forEach(p => { if (origens.includes(p.id)) p.status = 'pending'; });
                    rawMacros.splice(idx, 1);
                }
            }
            renderTree(); renderProposals(); renderRelatorios();
        } else throw new Error(result.error);
    } catch(e) { showToast('Erro', e.message, 'error'); }
}


// ==========================================
// ÁRVORE DE CONSOLIDAÇÃO (TAB 2)
// ==========================================
function renderTree() {
    const list = document.getElementById('tree-list'); list.innerHTML = '';
    
    if(rawMacros.length === 0 && rawSuperMacros.length === 0) {
        list.innerHTML = `<div class="bg-white rounded-brand p-8 text-center border border-brand-cinza-borda"><p class="text-brand-cinza-medio font-bold uppercase tracking-widest text-xs">Nenhuma consolidação gerada.</p></div>`; return;
    }

    rawSuperMacros.forEach(sm => {
        list.innerHTML += `
            <div class="bg-white border-2 border-[#1A5EA8] rounded-brand p-5 shadow-md relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-brand-azul-sus"></div>
                <div class="flex justify-between items-start mb-3">
                    <div class="flex gap-2 items-center">
                        <span class="bg-brand-azul-sus text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-brand-sm shadow-sm"><i class="ph-bold ph-diamonds-four mr-1"></i> ${sm.id}</span>
                    </div>
                    <button onclick="handleDeleteAction('${sm.id}', 'super')" class="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-brand-pill text-[10px] font-extrabold uppercase transition-colors flex items-center gap-1"><i class="ph-bold ph-trash"></i> Desfazer</button>
                </div>
                <p class="text-sm text-brand-cinza-texto font-medium mb-3">${sm.texto}</p>
                <div class="bg-brand-cinza-off p-3 rounded-brand-sm border border-brand-cinza-borda">
                    <p class="text-[10px] font-extrabold text-brand-cinza-medio uppercase tracking-widest mb-1">Aglutinou ${sm.origens.length} Macros:</p>
                    <p class="text-xs text-[#1B7A30] font-mono font-bold">${sm.origens.join(' • ')}</p>
                </div>
            </div>`;
    });

    const independentMacros = rawMacros.filter(m => m.status !== 'super_agglutinated');
    if(independentMacros.length > 0 && rawSuperMacros.length > 0) {
        list.innerHTML += `<h3 class="text-xs font-black text-brand-cinza-medio uppercase tracking-widest mt-4 ml-2">Macros de Nível 1 (Pendentes de Super Macro)</h3>`;
    }

    independentMacros.forEach(m => {
        list.innerHTML += `
            <div class="bg-white border-[1.5px] border-[#5BBF6A] rounded-brand p-5 shadow-sm relative overflow-hidden opacity-90">
                <div class="absolute top-0 left-0 w-1 h-full bg-[#3AAA35]"></div>
                <div class="flex justify-between items-start mb-3">
                    <div class="flex gap-2 items-center">
                        <span class="bg-[#E8F8EC] text-[#1B7A30] text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-brand-sm"><i class="ph-bold ph-stack mr-1"></i> ${m.id}</span>
                    </div>
                    <button onclick="handleDeleteAction('${m.id}', 'macro')" class="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-brand-pill text-[10px] font-extrabold uppercase transition-colors flex items-center gap-1"><i class="ph-bold ph-trash"></i> Desfazer</button>
                </div>
                <p class="text-[13px] text-brand-cinza-texto font-medium mb-3">${m.texto}</p>
            </div>`;
    });
}

function renderRelatorios() {
    document.getElementById('rel-total').textContent = rawProposals.length;
    document.getElementById('rel-pendentes').textContent = rawProposals.filter(p => p.status !== 'agglutinated').length;
    document.getElementById('rel-macros').textContent = rawMacros.length;
    document.getElementById('rel-super').textContent = rawSuperMacros.length;
}

// BIND DE EVENTOS
const searchInput = document.getElementById('search-input');
if(searchInput) {
    searchInput.addEventListener('input', (e) => { 
        searchQuery = e.target.value; 
        renderProposals(); 
    });
}

domTextarea.addEventListener('input', validateForm);
domAbrangencia.addEventListener('change', validateForm);
domSaveBtn.addEventListener('click', handleSave);

// INICIALIZAÇÃO
loadData();