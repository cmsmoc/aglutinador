        // MANTENHA A SUA URL AQUI
        const API_URL = 'https://script.google.com/macros/s/AKfycbxbAg6XJHHksVwktBFq3VeWgPpeIjv7j82spT4ap2VhMW-s68BFIY8oRp0R61quycBJsg/exec';

        let rawProposals = []; let rawMacros = []; let selectedIds = new Set();
        let searchQuery = ''; let filterEixo = '';
        let temporarySugerido = ""; 

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
            event.currentTarget.classList.add('active');
            if(tabId === 'tab-macros') renderMacros();
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

        async function loadData() {
            try {
                const response = await fetch(API_URL + "?t=" + new Date().getTime());
                const result = await response.json();
                if (result.success) {
                    rawProposals = result.propostas; rawMacros = result.macros || [];
                    document.getElementById('loading-state').classList.add('hidden');
                    document.getElementById('proposals-list').classList.remove('hidden');
                    populateFilters(); renderProposals(); renderRelatorios();
                } else showToast('Erro API', result.error, 'error');
            } catch (error) {
                document.getElementById('loading-state').innerHTML = `<i class="ph-fill ph-warning text-4xl text-brand-amarelo mb-2"></i><p class="font-bold text-xs uppercase text-brand-cinza-texto">Offline</p>`;
            }
        }

        function populateFilters() {
            const eixos = [...new Set(rawProposals.map(p => p.eixo))].filter(Boolean).sort();
            const filterDom = document.getElementById('filter-eixo');
            filterDom.innerHTML = '<option value="">TODOS OS EIXOS</option>';
            eixos.forEach(eixo => { filterDom.innerHTML += `<option value="${eixo}">${eixo.toUpperCase()}</option>`; });
        }

        function renderProposals() {
            const domList = document.getElementById('proposals-list'); domList.innerHTML = '';
            const pending = rawProposals.filter(p => p.status !== 'agglutinated');
            document.getElementById('count-pendentes').textContent = `${pending.length} Pendentes`;

            const filtered = pending.filter(p => {
                const matchSearch = p.text?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    p.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    p.tema?.toLowerCase().includes(searchQuery.toLowerCase());
                const matchEixo = filterEixo === '' || p.eixo === filterEixo;
                return matchSearch && matchEixo;
            });

            const fragment = document.createDocumentFragment();
            filtered.forEach(p => {
                const isSelected = selectedIds.has(p.id);
                const card = document.createElement('div');
                let classes = 'bg-white border-[1.5px] rounded-brand p-4 card-brand relative flex flex-col gap-2 shadow-sm cursor-pointer ';
                classes += isSelected ? 'border-brand-azul-sus bg-brand-azul-claro/10 !shadow-hover ring-2 ring-brand-azul-sus/20' : 'border-brand-cinza-borda';
                card.className = classes; card.onclick = () => toggleSelection(p.id);

                let eixoColor = 'bg-[#EAF4FB] text-brand-azul-sus';
                if(p.eixo?.includes("2")) eixoColor = 'bg-[#E8F8EC] text-brand-verde-sus';
                if(p.eixo?.includes("3")) eixoColor = 'bg-[#FEF8E7] text-[#9A6500]';

                card.innerHTML = `
                    ${isSelected ? '<div class="absolute top-0 left-0 right-0 h-[4px] bg-gradient-wave rounded-t-brand"></div>' : ''}
                    <div class="flex items-start gap-3 mt-1">
                        <div class="w-5 h-5 rounded border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-brand-azul-sus bg-brand-azul-sus text-white' : 'border-brand-cinza-medio'}">
                            ${isSelected ? '<i class="ph-bold ph-check text-xs"></i>' : ''}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="bg-white border border-brand-cinza-borda text-[10px] font-extrabold font-mono px-2 py-[2px] rounded-brand-sm">${p.id}</span>
                                <span class="${eixoColor} text-[9px] font-extrabold uppercase px-2 py-[2px] rounded-brand-pill truncate">${p.eixo}</span>
                                <!-- Badge do TEMA -->
                                <span class="bg-brand-cinza-off text-brand-cinza-medio border border-brand-cinza-borda text-[9px] font-extrabold uppercase px-2 py-[2px] rounded-brand-pill truncate" title="Tema: ${p.tema}">${p.tema}</span>
                            </div>
                            <p class="text-sm font-medium text-brand-cinza-texto leading-snug mb-2">${p.text}</p>
                        </div>
                    </div>`;
                fragment.appendChild(card);
            });
            domList.appendChild(fragment);
        }

        const domTextarea = document.getElementById('macro-textarea');
        const domAbrangencia = document.getElementById('abrangencia-select');
        const domSaveBtn = document.getElementById('save-btn');
        const domBtnIA = document.getElementById('btn-ia');

        function toggleSelection(id) {
            const proposal = rawProposals.find(p => p.id === id);
            if (selectedIds.has(id)) selectedIds.delete(id);
            else {
                selectedIds.add(id);
                const appendText = `[Origem ${id} | Tema: ${proposal.tema}]: ${proposal.text}`;
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
                indText.textContent = "Nenhuma proposta selecionada";
                indText.parentElement.className = 'bg-white border border-brand-cinza-borda px-4 py-3 rounded-brand-sm flex items-center gap-3 text-sm shadow-sm';
                indIcon.className = 'ph-fill ph-info text-xl indicator-icon text-brand-cinza-medio';
                domTextarea.disabled = domAbrangencia.disabled = domBtnIA.disabled = true;
            } else {
                indText.textContent = `${count} proposta(s) em análise`;
                indText.parentElement.className = 'bg-[#E8F8EC] border border-[#5BBF6A] text-[#1B7A30] px-4 py-3 rounded-brand-sm flex items-center gap-3 text-sm shadow-sm';
                indIcon.className = 'ph-fill ph-check-circle text-xl indicator-icon text-[#3AAA35]';
                domTextarea.disabled = domAbrangencia.disabled = domBtnIA.disabled = false;
            }
            validateForm();
        }

        function validateForm() {
            if (selectedIds.size > 0 && domTextarea.value.trim().length > 5 && domAbrangencia.value !== "") {
                domSaveBtn.disabled = false; domSaveBtn.classList.replace('bg-brand-cinza-medio', 'bg-brand-azul-sus');
            } else {
                domSaveBtn.disabled = true; domSaveBtn.classList.replace('bg-brand-azul-sus', 'bg-brand-cinza-medio');
            }
        }

        function toggleWorkspace(show) {
            const panel = document.getElementById('workspace-panel');
            if(show) { panel.classList.remove('translate-y-full'); document.body.classList.add('modal-open'); }
            else { panel.classList.add('translate-y-full'); document.body.classList.remove('modal-open'); }
        }

        // ==========================================
        // COMUNICAÇÃO COM O GROQ VIA BACKEND (PROXY)
        // ==========================================
        async function callIASecurely(prompt, sysInstruction) {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'ask_ai',
                    prompt: prompt,
                    sysInstruction: sysInstruction
                })
            });
            const result = await response.json();
            if (result.success) return result.result;
            throw new Error(result.error);
        }

        async function suggestMacroIA() {
            if (selectedIds.size === 0) return;
            
            domBtnIA.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Processando...';
            domBtnIA.disabled = true;
            
            const rawTexts = Array.from(selectedIds).map(id => {
                const p = rawProposals.find(prop => prop.id === id);
                return `[Proposta ${id} | Tema: ${p.tema}]: ${p.text}`;
            }).join("\n\n");
            
            const sys = "Você é um assistente técnico rigoroso de análise de aglutinação de propostas. Você DEVE responder ÚNICA e EXCLUSIVAMENTE com um objeto JSON válido, sem markdown, sem explicações em volta. Siga a estrutura exata solicitada.";
            const prompt = `Analise APENAS as propostas selecionadas abaixo.
Regras:
- NÃO forçar aglutinação. Seja criterioso: só recomende se NÃO houver perda de sentido, especificidade ou escopo.
- Se houver risco de descaracterização, NÃO recomendar.
- Verifique: Objetivo, Público-alvo, Escopo e Tipo de ação.

RETORNE APENAS O JSON NO SEGUINTE FORMATO EXATO:
{
  "viabilidade": {
    "nota": <numero_de_0_a_10>,
    "classificacao": "<Não recomendada, Duvidosa ou Recomendada>"
  },
  "justificativa": "<Sua justificativa clara em max 3 linhas>",
  "decisao": "<'Aglutinar' ou 'Manter separadas'>",
  "proposta_consolidada": "<Texto final técnico e fiel, ou string vazia se a decisão for Manter separadas>",
  "motivo_recusa": "<Motivo da recusa ou string vazia se a decisão for Aglutinar>"
}

PROPOSTAS PARA ANÁLISE:
${rawTexts}`;

            try {
                const rawResponse = await callIASecurely(prompt, sys);
                const jsonTextClean = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
                const aiResult = JSON.parse(jsonTextClean);
                renderAIModal(aiResult);
            } catch(e) {
                showToast('Erro na IA', 'A IA retornou um formato inválido ou o tempo esgotou.', 'error');
                console.error(e);
            } finally {
                domBtnIA.innerHTML = '<i class="ph-fill ph-sparkle"></i> Analisar com IA';
                domBtnIA.disabled = false;
            }
        }

        function renderAIModal(data) {
            const modal = document.getElementById('ai-result-modal');
            const circle = document.getElementById('ai-nota-circle');
            const classificacao = document.getElementById('ai-classificacao');
            const decisao = document.getElementById('ai-decisao');
            const justificativa = document.getElementById('ai-justificativa');
            const propBox = document.getElementById('ai-proposta-box');
            const propText = document.getElementById('ai-texto-sugerido');
            const btnAplicar = document.getElementById('btn-aplicar-ia');

            circle.className = 'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold text-white shrink-0 shadow-inner';
            decisao.className = 'text-xl font-extrabold';

            const nota = data.viabilidade.nota;
            circle.textContent = nota;
            classificacao.textContent = data.viabilidade.classificacao;

            if (nota <= 3) {
                circle.classList.add('bg-red-500'); decisao.classList.add('text-red-500');
            } else if (nota <= 6) {
                circle.classList.add('bg-[#F5C800]'); decisao.classList.add('text-[#9A6500]');
            } else {
                circle.classList.add('bg-[#3AAA35]'); decisao.classList.add('text-[#1B7A30]');
            }

            decisao.textContent = data.decisao;
            
            if (data.decisao.toLowerCase() === 'aglutinar') {
                justificativa.textContent = data.justificativa;
                propBox.classList.remove('hidden'); propBox.classList.add('flex');
                propText.textContent = data.proposta_consolidada;
                temporarySugerido = data.proposta_consolidada;
                btnAplicar.classList.remove('hidden'); btnAplicar.classList.add('flex');
            } else {
                justificativa.innerHTML = `<strong>Aviso:</strong> ${data.motivo_recusa || data.justificativa}`;
                propBox.classList.remove('flex'); propBox.classList.add('hidden');
                btnAplicar.classList.remove('flex'); btnAplicar.classList.add('hidden');
            }

            modal.classList.remove('hidden'); modal.classList.add('flex');
        }

        function closeAIModal() {
            document.getElementById('ai-result-modal').classList.add('hidden');
            document.getElementById('ai-result-modal').classList.remove('flex');
            temporarySugerido = "";
        }

        function aplicarTextoIA() {
            if(temporarySugerido) {
                domTextarea.value = temporarySugerido;
                validateForm();
                closeAIModal();
                showToast('Texto Aplicado', 'A proposta foi enviada para o editor.');
            }
        }

        async function handleSave() {
            const payload = { action: 'create', macroText: domTextarea.value, abrangencia: domAbrangencia.value, originIds: Array.from(selectedIds) };
            domSaveBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i> Salvando...'; domSaveBtn.disabled = true;

            try {
                const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
                const result = await response.json();
                if(result.success) {
                    showToast('Macro Registrada', `Vinculada com sucesso.`);
                    rawMacros.push({ id: result.macroId, texto: payload.macroText, abrangencia: payload.abrangencia, origens: payload.originIds });
                    rawProposals.forEach(p => { if (selectedIds.has(p.id)) p.status = 'agglutinated'; });
                    selectedIds.clear(); domTextarea.value = ''; domAbrangencia.value = '';
                    toggleWorkspace(false); updateWorkspace(); renderProposals(); renderRelatorios();
                } else throw new Error(result.error);
            } catch(e) { showToast('Erro ao Salvar', e.message, 'error'); } 
            finally { domSaveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk text-lg"></i> Salvar Macro'; validateForm(); }
        }

        async function handleDeleteMacro(macroId) {
            if(!confirm(`Tem certeza que deseja desaglutinar e deletar a ${macroId}?`)) return;
            try {
                const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'delete', macroId: macroId }) });
                const result = await response.json();
                if(result.success) {
                    showToast('Desfeita', 'Propostas restauradas com sucesso.');
                    const macroIndex = rawMacros.findIndex(m => m.id === macroId);
                    if(macroIndex > -1) {
                        const origens = rawMacros[macroIndex].origens;
                        rawProposals.forEach(p => { if (origens.includes(p.id)) p.status = 'pending'; });
                        rawMacros.splice(macroIndex, 1);
                    }
                    renderMacros(); renderProposals(); renderRelatorios();
                } else throw new Error(result.error);
            } catch(e) { showToast('Erro', e.message, 'error'); }
        }

        function renderMacros() {
            const list = document.getElementById('macros-list'); list.innerHTML = '';
            if(rawMacros.length === 0) {
                list.innerHTML = `<div class="bg-white rounded-brand p-8 text-center border border-brand-cinza-borda"><p class="text-brand-cinza-medio font-bold uppercase tracking-widest text-xs">Nenhuma macro gerada.</p></div>`; return;
            }
            rawMacros.forEach(m => {
                list.innerHTML += `
                    <div class="bg-white border border-brand-cinza-borda rounded-brand p-5 shadow-sm mb-4 relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full bg-brand-verde-sus"></div>
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex gap-2 items-center">
                                <span class="bg-[#E8F8EC] text-[#1B7A30] text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-brand-sm">${m.id}</span>
                            </div>
                            <button onclick="handleDeleteMacro('${m.id}')" class="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-brand-pill text-[10px] font-extrabold uppercase transition-colors flex items-center gap-1"><i class="ph-bold ph-trash"></i> Desfazer</button>
                        </div>
                        <p class="text-sm text-brand-cinza-texto font-medium mb-3">${m.texto}</p>
                    </div>`;
            });
        }

        function renderRelatorios() {
            document.getElementById('rel-total').textContent = rawProposals.length;
            document.getElementById('rel-pendentes').textContent = rawProposals.filter(p => p.status !== 'agglutinated').length;
            document.getElementById('rel-macros').textContent = rawMacros.length;
        }

        function exportCSV() {
            let csv = "TIPO,ID,EIXO,TEMA,TEXTO,STATUS,MACRO_VINCULADA\n";
            rawProposals.forEach(p => {
                const textSafe = p.text ? p.text.replace(/"/g, '""').replace(/\n/g, ' ') : '';
                csv += `Bruta,${p.id},"${p.eixo}","${p.tema}","${textSafe}",${p.status},${p.status === 'agglutinated' ? 'Sim' : 'Nao'}\n`;
            });
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8" });
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
            link.download = `Relatorio_${new Date().getTime()}.csv`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        }

        document.getElementById('search-input').addEventListener('input', (e) => { searchQuery = e.target.value; renderProposals(); });
        document.getElementById('filter-eixo').addEventListener('change', (e) => { filterEixo = e.target.value; renderProposals(); });
        domTextarea.addEventListener('input', validateForm);
        domAbrangencia.addEventListener('change', validateForm);
        domSaveBtn.addEventListener('click', handleSave);

        loadData();