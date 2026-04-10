const SPREADSHEET_ID = '1u-nyDQfsQylKvT6pJ805cVngzBODr0zeyFlAuRzM2i4';
const NOME_ABA_TRABALHO = 'propostas_trabalho';
const NOME_ABA_MACROS = 'propostas_macros';

function setupSheets() {
  // Apenas para garantir que a estrutura existe (mesma da versão anterior)
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let abaMacros = ss.getSheetByName(NOME_ABA_MACROS);
  if (!abaMacros) {
    abaMacros = ss.insertSheet(NOME_ABA_MACROS);
    const macrosHeaders = ['ID_Macro', 'Texto_Macro', 'Abrangencia', 'Qtd_Propostas_Origem', 'IDs_Origem_Vinculados', 'Data_Criacao'];
    abaMacros.getRange(1, 1, 1, macrosHeaders.length).setValues([macrosHeaders]);
    abaMacros.getRange(1, 1, 1, macrosHeaders.length).setFontWeight("bold").setBackground("#dbeafe");
    abaMacros.setFrozenRows(1);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Buscar Propostas Brutas
    const abaTrabalho = ss.getSheetByName(NOME_ABA_TRABALHO);
    const dataTrabalho = abaTrabalho.getDataRange().getValues();
    const headersTrabalho = dataTrabalho.shift();
    
    const idx = {
      idGeral: headersTrabalho.indexOf('ID_GERAL'),
      evento: headersTrabalho.indexOf('Nome_Conferencia'),
      nProposta: headersTrabalho.indexOf('NProposta'),
      proposta: headersTrabalho.indexOf('Proposta'),
      eixo: headersTrabalho.indexOf('Eixo'),
      diretriz: headersTrabalho.indexOf('Diretriz'),
      status: headersTrabalho.indexOf('Status'),
      idMacro: headersTrabalho.indexOf('ID_Macro_Vinculada')
    };

    const payloadPropostas = [];
    for (let i = 0; i < dataTrabalho.length; i++) {
      let row = dataTrabalho[i];
      if (!row[idx.idGeral]) continue;
      payloadPropostas.push({
        id: row[idx.idGeral],
        evento: row[idx.evento],
        text: row[idx.proposta],
        eixo: row[idx.eixo],
        diretriz: row[idx.diretriz],
        status: row[idx.status] === 'Aglutinada' ? 'agglutinated' : 'pending',
        idMacro: row[idx.idMacro] || null
      });
    }

    // 2. Buscar Macros já consolidadas (Necessário para a função de desfazer e relatório)
    const abaMacros = ss.getSheetByName(NOME_ABA_MACROS);
    const dataMacros = abaMacros.getDataRange().getValues();
    const headersMacros = dataMacros.shift();
    const payloadMacros = [];
    
    if(headersMacros) {
      const idxM = {
        id: headersMacros.indexOf('ID_Macro'),
        texto: headersMacros.indexOf('Texto_Macro'),
        abrangencia: headersMacros.indexOf('Abrangencia'),
        origens: headersMacros.indexOf('IDs_Origem_Vinculados')
      };
      
      for (let i = 0; i < dataMacros.length; i++) {
        let row = dataMacros[i];
        if (!row[idxM.id]) continue;
        payloadMacros.push({
          id: row[idxM.id],
          texto: row[idxM.texto],
          abrangencia: row[idxM.abrangencia],
          origens: row[idxM.origens].split(', ') // Converte "PROP1, PROP2" em Array
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      propostas: payloadPropostas,
      macros: payloadMacros
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || 'create'; // Agora a API entende 'create' ou 'delete'
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const abaTrabalho = ss.getSheetByName(NOME_ABA_TRABALHO);
    const abaMacros = ss.getSheetByName(NOME_ABA_MACROS);

    // ==========================================
    // AÇÃO: CRIAR NOVA MACRO
    // ==========================================
    if (action === 'create') {
      const macroText = body.macroText;
      const abrangencia = body.abrangencia;
      const originIds = body.originIds;

      const lastRowMacro = abaMacros.getLastRow();
      let nextMacroNumber = 1;
      if (lastRowMacro > 1) {
        const lastId = abaMacros.getRange(lastRowMacro, 1).getValue();
        const numMatch = String(lastId).match(/\d+/);
        if (numMatch) nextMacroNumber = parseInt(numMatch[0]) + 1;
      }
      const newMacroId = "MACRO-" + String(nextMacroNumber).padStart(3, '0');
      
      abaMacros.appendRow([newMacroId, macroText, abrangencia, originIds.length, originIds.join(', '), new Date()]);

      // Atualizar Propostas
      const fullRange = abaTrabalho.getDataRange();
      const dataTrabalho = fullRange.getValues();
      const headersTrabalho = dataTrabalho[0];
      const idxGeral = headersTrabalho.indexOf('ID_GERAL');
      const idxStatus = headersTrabalho.indexOf('Status');
      const idxIdMacro = headersTrabalho.indexOf('ID_Macro_Vinculada');

      for (let i = 1; i < dataTrabalho.length; i++) {
        if (originIds.includes(dataTrabalho[i][idxGeral])) {
          dataTrabalho[i][idxStatus] = 'Aglutinada';
          dataTrabalho[i][idxIdMacro] = newMacroId;
        }
      }
      fullRange.setValues(dataTrabalho);

      return ContentService.createTextOutput(JSON.stringify({ success: true, macroId: newMacroId }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==========================================
    // AÇÃO: DESAGLUTINAR (DELETAR MACRO)
    // ==========================================
    else if (action === 'delete') {
      const macroId = body.macroId;
      if (!macroId) throw new Error("ID da Macro não fornecido para exclusão.");

      // 1. Encontrar e remover a macro na aba de Macros
      const dataMacros = abaMacros.getDataRange().getValues();
      let linhaMacroDeletar = -1;
      for(let i = 1; i < dataMacros.length; i++) {
        if(dataMacros[i][0] === macroId) { // Index 0 é o ID_Macro
          linhaMacroDeletar = i + 1; // +1 porque array começa no 0 e a linha do sheets no 1
          break;
        }
      }
      
      if (linhaMacroDeletar > -1) {
        abaMacros.deleteRow(linhaMacroDeletar);
      }

      // 2. Restaurar as propostas originais
      const fullRange = abaTrabalho.getDataRange();
      const dataTrabalho = fullRange.getValues();
      const headersTrabalho = dataTrabalho[0];
      const idxStatus = headersTrabalho.indexOf('Status');
      const idxIdMacro = headersTrabalho.indexOf('ID_Macro_Vinculada');
      
      let mudouAlgo = false;
      for (let i = 1; i < dataTrabalho.length; i++) {
        if (dataTrabalho[i][idxIdMacro] === macroId) {
          dataTrabalho[i][idxStatus] = 'Pendente';
          dataTrabalho[i][idxIdMacro] = ''; // Limpa o vínculo
          mudouAlgo = true;
        }
      }
      
      if(mudouAlgo) {
        fullRange.setValues(dataTrabalho);
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Macro desfeita e propostas restauradas." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT).setHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
}
